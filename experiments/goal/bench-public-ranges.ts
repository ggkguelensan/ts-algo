import assert from 'node:assert/strict';
import {freeSlots,conflicts,overloaded} from '../../dist/src/ranges/index.js';
import {freeSlots as protoFree,conflicts as protoConflicts,overloaded as protoOverloaded} from './ranges.ts';
import {measure,random,save} from './measure.ts';
const rows=[];
for(const n of [100,1000,10000])for(const shape of ['disjoint','short','nested']){
  // Dense overlap emits quadratic pairs; bounded sizes expose output cost
  // without pretending that a full all-pairs result is an O(n) operation.
  if(shape==='nested'&&n>1000)continue;
  const rand=random(100+n),items=Array.from({length:n},(_,id)=>{
    const start=shape==='disjoint'?id*3:shape==='nested'?id:Math.floor(rand()*n*3);
    return {start,end:shape==='nested'?n*2-id:start+(shape==='disjoint'?2:Math.floor(rand()*12)),units:Math.floor(rand()*4)};
  }),window={start:0,end:n*3},capacity=3;
  const validate=()=>{for(const e of items)if(!Number.isFinite(e.start)||!Number.isFinite(e.end)||e.start>e.end)throw new RangeError('Invalid');};
  const nativePairs=()=>{validate();const pairs=[];for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i]!,b=items[j]!;if(a.start<a.end&&b.start<b.end&&a.start<b.end&&b.start<a.end)pairs.push([i,j]);}return pairs;};
  const nativeFree=()=>{
    validate();const spans=items.filter(e=>e.start<e.end&&e.start<window.end&&e.end>window.start).map(e=>({start:Math.max(e.start,window.start),end:Math.min(e.end,window.end)})).sort((a,b)=>a.start-b.start),out=[];
    let cursor=window.start;for(const e of spans){if(cursor<e.start)out.push({start:cursor,end:e.start});cursor=Math.max(cursor,e.end);}if(cursor<window.end)out.push({start:cursor,end:window.end});return out;
  };
  const nativeDirectFree=()=>{
    validate();const sorted=items.toSorted((a,b)=>a.start-b.start),out=[];let cursor=window.start;
    for(const e of sorted){
      if(e.start>=window.end)break;
      if(e.start===e.end||e.end<=window.start)continue;
      const start=Math.max(e.start,window.start);if(start>cursor)out.push({start:cursor,end:start});
      cursor=Math.max(cursor,Math.min(e.end,window.end));
    }
    if(cursor<window.end)out.push({start:cursor,end:window.end});return out;
  };
  // Independent all-segment scan is an oracle, not a claimed optimized sweep.
  const edges=[...new Set([window.start,window.end,...items.flatMap(e=>[e.start,e.end]).filter(t=>t>window.start&&t<window.end)])].sort((a,b)=>a-b),expectedLoad:{start:number;end:number}[]=[];
  for(let i=0;i<edges.length-1;i++){
    const a=edges[i]!,b=edges[i+1]!,mid=(a+b)/2,load=items.reduce((sum,e)=>sum+(e.start<=mid&&e.end>mid?e.units:0),0);
    if(load>capacity){const last=expectedLoad.at(-1);if(last?.end===a)expectedLoad[expectedLoad.length-1]={start:last.start,end:b};else expectedLoad.push({start:a,end:b});}
  }
  const expectedPairs=nativePairs(),expectedFree=nativeFree();assert.deepEqual(nativeDirectFree(),expectedFree);
  for(const run of [()=>conflicts(items),()=>protoConflicts(items)])assert.deepEqual(run(),expectedPairs);
  for(const run of [()=>freeSlots(items,window),()=>protoFree(items,window)])assert.deepEqual(run(),expectedFree);
  for(const run of [()=>overloaded(items,window,capacity),()=>protoOverloaded(items,window,capacity)])assert.deepEqual(run(),expectedLoad);
  rows.push({n,shape,kind:'free union incl validation and materialization',timings:measure({publicFree:()=>freeSlots(items,window).length,prototypeFree:()=>protoFree(items,window).length,nativeClippedFree:()=>nativeFree().length,nativeDirectFree:()=>nativeDirectFree().length})});
  rows.push({n,shape,kind:'conflict pairs incl validation and materialization',pairs:expectedPairs.length,timings:measure({publicPairs:()=>conflicts(items).length,prototypePairs:()=>protoConflicts(items).length,nativeAllPairs:()=>nativePairs().length})});
  rows.push({n,shape,kind:'capacity sweep incl overflow checks and materialization',timings:measure({publicLoad:()=>overloaded(items,window,capacity).length,prototypeLoad:()=>protoOverloaded(items,window,capacity).length})});
}
save('migration-ranges',rows);
