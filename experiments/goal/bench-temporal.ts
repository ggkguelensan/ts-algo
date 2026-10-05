import assert from 'node:assert/strict';
import { StaticIntervalTree } from 'mnemonist';
import { timeline } from '../../dist/src/timeline.js';
import { from } from './source.ts';
import { temporal, overlapping } from './temporal.ts';
import { measure, random, save } from './measure.ts';

type Record = {id:number;start:number;end:number};
const intersects=(e:Record,a:number,b:number)=>a!==b&&e.start<b&&(e.start===e.end?e.start>=a:e.end>a);
function lowerBound(records:Record[],time:number) {
  let a=0,b=records.length;while(a<b){const m=(a+b)>>>1;if(records[m]!.start<time)a=m+1;else b=m;}return a;
}
const reports=[];
for(const n of [1000,20000,100000]) for(const shape of ['points','short','long','nested','mixed']) {
  const rand=random(), records:Record[]=Array.from({length:n},(_,id)=>{
    const start=Math.floor(rand()*100000);
    const length=shape==='points'?0:shape==='short'?Math.floor(rand()*50)+1:shape==='long'?50000:shape==='nested'?100000-start: id%5===0?0:Math.floor(rand()*5000);
    return {id,start,end:start+length};
  });
  const storage=new Map(records.map(e=>[e.id,{title:`event-${e.id}`} ]));
  const times=new Map(records.map(e=>[e.id,e]));
  const select=(_:unknown,id:number)=>times.get(id)!;
  const makeOld=()=>timeline(storage,{time:select});
  const makeNew=()=>temporal(from(storage),select);
  const makeMnemo=()=>StaticIntervalTree.from(records,[e=>e.start,e=>e.end]);
  const ordered=()=>records.toSorted((a,b)=>a.start-b.start||a.id-b.id);
  const old=makeOld(), next=makeNew(), mnemo=makeMnemo(), sorted=ordered();
  for(const width of [10,10000]) {
    const qrand=random(456),windows=Array.from({length:16},()=>{const start=Math.floor(qrand()*100000);return {start,end:start+width};});
    const variants={
      linear:(a:number,b:number)=>sorted.filter(e=>intersects(e,a,b)).map(e=>e.id),
      prefix:(a:number,b:number)=>{
        const result:number[]=[],end=lowerBound(sorted,b),begin=shape==='points'?lowerBound(sorted,a):0;
        for(let i=begin;i<end;i++){const e=sorted[i]!;if(intersects(e,a,b))result.push(e.id);}return result;
      },
      current:(a:number,b:number)=>old.overlapping(a,b),
      temporalOnly:(a:number,b:number)=>Array.from(overlapping(next,{start:a,end:b})),
      mnemonistAdapted:(a:number,b:number)=>mnemo.intervalsOverlappingInterval({id:-1,start:a,end:b}).filter(e=>intersects(e,a,b)).sort((a,b)=>a.start-b.start||a.id-b.id).map(e=>e.id),
    };
    for(const window of windows) {
      const expected=variants.linear(window.start,window.end);
      for(const run of Object.values(variants))assert.deepEqual(run(window.start,window.end),expected);
    }
    const timings=measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>{let total=0;for(const w of windows)total+=run(w.start,w.end).length;return total; }])));
    reports.push({n,shape,width,queriesPerSample:windows.length,resultsPerBatch:windows.reduce((sum,w)=>sum+variants.linear(w.start,w.end).length,0),timings});
  }
  const builds=measure({current:()=>makeOld().size,temporalOnly:()=>makeNew().size,mnemonist:()=>makeMnemo().size,sortedArray:()=>ordered().length});
  reports.push({n,shape,kind:'build',builds});
}
save('temporal',reports);
