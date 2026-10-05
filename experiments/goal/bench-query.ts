import assert from 'node:assert/strict';
import * as R from 'remeda';
import {from as ixFrom} from 'ix/iterable';
import {filter as ixFilter,map as ixMap,take as ixTake} from 'ix/iterable/operators';
import {from} from './source.ts';
import {query,queryInput,filtered,selected,take,lazyFiltered,lazySelected,lazyTake} from './query.ts';
import {measure,save} from './measure.ts';

const reports=[];
for(const n of [1000,20000,100000])for(const modulus of [2,100])for(const limit of [20,n]) {
  const values=Array.from({length:n},(_,id)=>id),source=queryInput(from(values));
  const pred=(id:number)=>id%modulus===0,project=(id:number)=>id*3;
  const variants={
    nativeArrays:()=>values.filter(pred).map(project).slice(0,limit),
    directLoop:()=>{const result:number[]=[];for(const id of values){if(pred(id)){result.push(project(id));if(result.length===limit)break;}}return result;},
    remeda:()=>R.pipe(values,R.filter(pred),R.map(project),R.take(limit)),
    ix:()=>Array.from(ixFrom(values).pipe(ixFilter(pred),ixMap(project),ixTake(limit))),
    boundLazy:()=>Array.from(lazyTake(lazySelected(lazyFiltered(source,pred),project),limit)),
    fused:()=>query(source,filtered(pred),selected(project),take(limit)),
  };
  const expected=variants.directLoop();for(const run of Object.values(variants))assert.deepEqual(run(),expected);
  const repeats=n===1000?64:8;
  const timings=measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>{let checksum=0;for(let i=0;i<repeats;i++){const result=run();checksum+=result.length+(result[0]??0);}return checksum; }])));
  reports.push({n,modulus,limit,repeats,resultLength:expected.length,timings});
}
// Map keys do not contain entity fields; source resolution is part of the work.
for(const n of [1000,100000]) {
  const storage=new Map(Array.from({length:n},(_,id)=>[id,{enabled:id%2===0,amount:id*3}] as const));
  const source=queryInput(from(storage));
  const cachedKeys=Array.from(storage.keys());
  const variants={
    nativeEntries:()=>Array.from(storage).filter(([,e])=>e.enabled).slice(0,20).map(([id,e])=>({id,amount:e.amount})),
    directLoop:()=>{const result=[];for(const [id,e] of storage){if(e.enabled){result.push({id,amount:e.amount});if(result.length===20)break;}}return result;},
    remedaKeys:()=>R.pipe(Array.from(storage.keys()),R.filter(id=>storage.get(id)!.enabled),R.map(id=>({id,amount:storage.get(id)!.amount})),R.take(20)),
    remedaCachedKeys:()=>R.pipe(cachedKeys,R.filter(id=>storage.get(id)!.enabled),R.map(id=>({id,amount:storage.get(id)!.amount})),R.take(20)),
    ixKeys:()=>Array.from(ixFrom(storage.keys()).pipe(ixFilter(id=>storage.get(id)!.enabled),ixMap(id=>({id,amount:storage.get(id)!.amount})),ixTake(20))),
    boundLazy:()=>Array.from(lazyTake(lazySelected(lazyFiltered(source,e=>e.enabled),(e,id)=>({id,amount:e.amount})),20)),
    fused:()=>query(source,filtered(e=>e.enabled),selected((e,id)=>({id,amount:e.amount})),take(20)),
  };
  const expected=variants.directLoop();for(const run of Object.values(variants))assert.deepEqual(run(),expected);
  const repeats=64;
  const timings=measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>{let checksum=0;for(let i=0;i<repeats;i++)checksum+=run().length;return checksum; }])));
  const preparation=measure({keysSnapshot:()=>Array.from(storage.keys()).length});
  reports.push({kind:'Map/external fields',n,repeats,resultLength:20,timings,preparation});
}
save('query',reports);
