import assert from 'node:assert/strict';
import {StaticIntervalTree} from 'mnemonist';
import {timeline} from '../../dist/src/timeline.js';
import {from} from './source.ts';
import {temporal,overlapping} from './temporal.ts';
import {measure,random,save} from './measure.ts';

// This experiment separates unordered half-open results from raw closed candidates.
// Raw candidates are NOT equivalent results and must not be ranked as such.
const rows=[];
for(const n of [20000,100000])for(const shape of ['points','short','long','nested']){
  const rand=random(234),records=Array.from({length:n},(_,id)=>{const start=Math.floor(rand()*100000),length=shape==='points'?0:shape==='short'?50:shape==='long'?50000:100000-start;return{id,start,end:start+length};});
  const store=new Map(records.map(e=>[e.id,e])),mnemo=StaticIntervalTree.from(records,[e=>e.start,e=>e.end]),old=timeline(store,{time:e=>e}),index=temporal(from(store),e=>e);
  const qrand=random(456),windows=Array.from({length:16},()=>{const start=Math.floor(qrand()*100000);return {start,end:start+10};});
  const intersects=(e:typeof records[number],a:number,b:number)=>e.start<b&&(e.start===e.end?e.start>=a:e.end>a);
  const variants={
    nativeUnordered:(a:number,b:number)=>{const refs:number[]=[];for(const e of records)if(intersects(e,a,b))refs.push(e.id);return refs;},
    mnemonistUnordered:(a:number,b:number)=>mnemo.intervalsOverlappingInterval({id:-1,start:a,end:b}).filter(e=>intersects(e,a,b)).map(e=>e.id),
    currentOrdered:(a:number,b:number)=>old.overlapping(a,b),
    temporalOrdered:(a:number,b:number)=>Array.from(overlapping(index,{start:a,end:b})),
  };
  const raw=(a:number,b:number)=>mnemo.intervalsOverlappingInterval({id:-1,start:a,end:b});
  for(const w of windows){
    const expected=variants.nativeUnordered(w.start,w.end).sort((a,b)=>a-b);for(const run of Object.values(variants))assert.deepEqual(run(w.start,w.end).sort((a,b)=>a-b),expected);
    assert.deepEqual(raw(w.start,w.end).map(e=>e.id).sort((a,b)=>a-b),records.filter(e=>e.start<=w.end&&e.end>=w.start).map(e=>e.id).sort((a,b)=>a-b));
  }
  const timings=measure(Object.fromEntries(Object.entries({...variants,rawClosedCandidates:raw}).map(([name,run])=>[name,()=>windows.reduce((sum,w)=>sum+run(w.start,w.end).length,0)])));
  rows.push({n,shape,width:10,queriesPerSample:16,semantics:{nativeUnordered:'Half-open, source order',mnemonistUnordered:'Half-open, unspecified order, adapted IDs',currentOrdered:'Half-open, chronological stable order',temporalOrdered:'Half-open, chronological stable order, extra array copy',rawClosedCandidates:'Closed candidates including boundary false positives; different contract'},timings});
}
save('temporal-candidates',rows);
