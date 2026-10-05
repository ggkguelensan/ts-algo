import assert from 'node:assert/strict';
import {sorted} from '../../dist/src/sorted.js';
import {from,entity} from './source.ts';
import {collect} from './collect.ts';
import {temporal,overlapping} from './temporal.ts';
import {measure,save,random} from './measure.ts';
import {sorted as boundSorted} from './sorted-source.ts';
const rows=[];
for(const n of [1000,20000]){
  const rand=random(234),storage=new Map(Array.from({length:n},(_,id)=>[id,{rank:Math.floor(rand()*n),at:id}])),source=from(storage),refs=[...storage.keys()],index=temporal(source,e=>e.at);
  const access={
    directResolve:()=>{let sum=0;for(const id of refs)sum+=storage.get(id)!.rank;return sum;},
    boundResolve:()=>{let sum=0;for(const id of refs)sum+=entity(source,id).rank;return sum;},
    keysSnapshot:()=>[...storage.keys()].length,
    boundSnapshot:()=>[...source].length,
    projection:()=>collect(source,{select:e=>e.rank}).length,
  };
  assert.equal(access.directResolve(),access.boundResolve());assert.deepEqual(collect(source,{select:e=>e.rank}),refs.map(id=>storage.get(id)!.rank));
  rows.push({kind:'isolated access/materialization; these rows do different work',n,timings:measure(access)});
  for(const cost of ['cheap','expensive']){
    const value=(e:{rank:number})=>{let result=e.rank;if(cost==='expensive')for(let i=0;i<32;i++)result=Math.imul(result^i,1664525)+1013904223|0;return result;};
    const variants={
      nativeComparator:()=>[...storage.keys()].sort((a,b)=>value(storage.get(a)!)-value(storage.get(b)!)),
      cachedIndices:()=>sorted(storage,value,(a,b)=>a-b),
      cachedBound:()=>boundSorted(source,value,(a,b)=>a-b),
      nativeDecorated:()=>Array.from(storage,([id,e])=>({id,value:value(e)})).sort((a,b)=>a.value-b.value).map(row=>row.id),
      nativeDecoratedForEach:()=>{const rows=new Array<{id:number;value:number}>(storage.size);let i=0;storage.forEach((e,id)=>{rows[i++]={id,value:value(e)};});rows.sort((a,b)=>a.value-b.value);return rows.map(row=>row.id);},
    };
    const expected=variants.nativeComparator();for(const run of Object.values(variants))assert.deepEqual(run(),expected);
    let nativeCalls=0,cachedCalls=0;refs.toSorted((a,b)=>{nativeCalls+=2;return value(storage.get(a)!)-value(storage.get(b)!);});sorted(storage,e=>{cachedCalls++;return value(e);},(a,b)=>a-b);assert.equal(cachedCalls,n);
    rows.push({kind:'sorting + resolving + selector + output; stable source order ties',n,cost,selectorCalls:{nativeComparator:nativeCalls,cachedIndices:cachedCalls,nativeDecorated:n},timings:measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>run().length])))});
  }
  for(const queries of [1,16]){
    const windows=Array.from({length:queries},(_,i)=>({start:Math.floor(n/2)+i,end:Math.floor(n/2)+i+10}));
    const variants={
      nativeScan:()=>{let sum=0;for(const w of windows)for(const[id,e]of storage)if(e.at>=w.start&&e.at<w.end)sum+=id;return sum;},
      indexRefs:()=>{let sum=0;for(const w of windows)for(const id of overlapping(index,w))sum+=id;return sum;},
      indexWithProjection:()=>{let sum=0;for(const w of windows)for(const rank of collect(overlapping(index,w),{select:e=>e.rank}))sum+=rank;return sum;},
    };
    assert.equal(variants.nativeScan(),variants.indexRefs());
    assert.equal(variants.indexWithProjection(),windows.reduce((sum,w)=>sum+[...storage.values()].filter(e=>e.at>=w.start&&e.at<w.end).reduce((total,e)=>total+e.rank,0),0));
    rows.push({kind:'one vs repeated point windows; index prebuilt',n,queries,timings:measure(variants),notes:'indexWithProjection returns business values, not refs; separate cost, not identical checksum workload'});
  }
}
save('costs',rows);
