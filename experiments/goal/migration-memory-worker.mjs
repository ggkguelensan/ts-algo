import assert from 'node:assert/strict';
import {performance,PerformanceObserver} from 'node:perf_hooks';
import {Session} from 'node:inspector';
import {from} from './source.ts';
import {query,queryInput,filtered,selected} from './query.ts';
import {temporal} from './temporal.ts';
import {tree} from '../../dist/references/legacy-tree.js';
import {timeline} from '../../dist/references/legacy-timeline.js';
import {pointIndex} from '../../dist/references/legacy-point-index.js';
import KDBush from 'kdbush';
import * as R from 'remeda';
import {collect as collectReferences} from './collect.ts';

import {from as publicFrom,collect as publicCollect,sorted as publicSorted} from '../../dist/src/index.js';
import {tree as publicTree} from '../../dist/src/tree/index.js';
import {timeline as publicTime} from '../../dist/src/time/index.js';
import {dependencies as publicGraph} from '../../dist/src/dependencies/index.js';
import {pointIndex as publicPoints} from '../../dist/src/spatial/index.js';
import {queue as publicQueue} from '../../dist/src/queue/index.js';
import {linkedList as publicSingle,doublyLinkedList as publicDouble} from '../../dist/src/lists/index.js';
const variant=process.argv[2],n=Number(process.argv[3]??50000),mode=process.argv[4]??'retained';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
let weakStore;
async function collect(){await tick();for(let i=0;i<3;i++)globalThis.gc();await tick();}
function materialize(store){return query(queryInput(from(store)),selected(e=>e.at));}
function materializeRestricted(store){return collectReferences(from(store),{select:e=>e.at});}
function make(){
  const store=new Map(Array.from({length:n},(_,id)=>[id,{title:`${id}:`+'x'.repeat(256),at:id,x:id%1000,y:Math.floor(id/1000)}]));
  weakStore=new WeakRef(store);
  switch(variant){
    case 'publicSource':return publicFrom(store);
    case 'publicTree':return publicTree(publicFrom(store),(_,id)=>id===0?null:Math.floor((id-1)/4));
    case 'publicTime':return publicTime(publicFrom(store),e=>e.at);
    case 'unboundPublicTime':return publicTime(publicFrom([...store.keys()]),(_,id)=>store.get(id).at);
    case 'publicGraph':return publicGraph(publicFrom(store),(_,id)=>id===0?[]:[Math.floor((id-1)/4)]);
    case 'publicPoints':return publicPoints(publicFrom(store),{x:e=>e.x,y:e=>e.y});
    case 'unboundPublicPoints':return publicPoints(publicFrom([...store.keys()]),{x:(_,id)=>store.get(id).x,y:(_,id)=>store.get(id).y});
    case 'publicProjected':return publicCollect(publicFrom(store),{select:e=>e.at});
    case 'publicQueue':return publicQueue(store.values());
    case 'publicSingle':return publicSingle(store.values());
    case 'publicDouble':return publicDouble(store.values());
    case 'source':return from(store);
    case 'tree':return tree(store,{parent:(_,id)=>id===0?null:Math.floor((id-1)/4)});
    case 'currentTime':return timeline(store,{time:e=>e.at});
    case 'temporal':return temporal(from(store),e=>e.at);
    case 'unboundTemporal':return temporal(from([...store.keys()]),(_,id)=>store.get(id).at);
    case 'points':return pointIndex(store,{x:e=>e.x,y:e=>e.y});
    case 'boundPoints':return {index:pointIndex(store,{x:e=>e.x,y:e=>e.y}),source:from(store)};
    case 'kdbush':{const index=new KDBush(n);for(const e of store.values())index.add(e.x,e.y);index.finish();return index;}
    case 'keys':return [...store.keys()];
    case 'projected':return materialize(store);
    case 'projectedInline':return query(queryInput(from(store)),selected(e=>e.at));
    case 'restricted':return materializeRestricted(store);
    case 'restrictedInline':return collectReferences(from(store),{select:e=>e.at});
    case 'projectedNative':return [...store.values()].map(e=>e.at);
    default:throw new Error(variant);
  }
}
if(mode==='retained'){
  await collect();const baseline=process.memoryUsage();let handle=make();await collect();const retained=process.memoryUsage(),storeRetained=weakStore.deref()!==undefined;
  // Keep the handle observably live through the snapshot, then release it.
  const live=handle!==undefined;handle=undefined;await collect();const released=process.memoryUsage();
  console.log(JSON.stringify({variant,n,mode,baseline,retained,released,live,storeRetained,retainedHeapDelta:retained.heapUsed-baseline.heapUsed,releasedHeapDelta:released.heapUsed-baseline.heapUsed,retainedExternalDelta:retained.external-baseline.external,retainedArrayBuffersDelta:retained.arrayBuffers-baseline.arrayBuffers}));
}else{
  const values=Array.from({length:n},(_,id)=>id),boundSource=from(values),source=queryInput(boundSource);
  const run=variant==='public'?()=>publicCollect(publicFrom(values),{where:x=>x%2===0,select:x=>({value:x*3})}):variant==='sortCached'?()=>publicSorted(values,x=>values.length-x,(a,b)=>a-b):variant==='sortDecorated'?()=>values.map(x=>({ref:x,value:values.length-x})).sort((a,b)=>a.value-b.value).map(x=>x.ref):variant==='restricted'?()=>collectReferences(boundSource,{where:x=>x%2===0,select:x=>({value:x*3})}):variant==='fused'?()=>query(source,filtered(x=>x%2===0),selected(x=>({value:x*3}))):variant==='remeda'?()=>R.pipe(values,R.filter(x=>x%2===0),R.map(x=>({value:x*3}))):()=>values.filter(x=>x%2===0).map(x=>({value:x*3}));
  function validate(){
    const expected=variant.startsWith('sort')?values.slice().reverse():values.filter(x=>x%2===0).map(x=>({value:x*3}));
    assert.deepEqual(run(),expected);
  }
  validate();
  for(let i=0;i<5;i++)run();await collect();
  const gcEvents=[];let observer;
  try{observer=new PerformanceObserver(list=>{for(const entry of list.getEntries())gcEvents.push({start:entry.startTime,duration:entry.duration,detail:entry.detail});});observer.observe({entryTypes:['gc']});}catch{}
  let session,profile;
  if(!process.versions.bun){session=new Session();session.connect();await new Promise((resolve,reject)=>session.post('HeapProfiler.startSampling',{samplingInterval:1024,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true},error=>error?reject(error):resolve()));}
  const before=process.memoryUsage(),samples=[],start=performance.now();let checksum=0,observedPeakHeap=before.heapUsed;
  for(let i=0;i<30;i++){const t=performance.now();const result=run();checksum+=result.length;samples.push(performance.now()-t);observedPeakHeap=Math.max(observedPeakHeap,process.memoryUsage().heapUsed);}
  const end=performance.now(),after=process.memoryUsage();await new Promise(resolve=>setTimeout(resolve,20));
  if(session){profile=await new Promise((resolve,reject)=>session.post('HeapProfiler.stopSampling',(error,result)=>error?reject(error):resolve(result.profile)));session.disconnect();}
  observer?.disconnect();let sampledAllocatedBytes=0;
  if(profile){const stack=[profile.head];while(stack.length){const node=stack.pop();sampledAllocatedBytes+=node.selfSize;stack.push(...node.children);}}
  console.log(JSON.stringify({variant,n,mode,correctness:'deep-equal native oracle before profiling',iterations:30,before,after,observedPeakHeap,samples,checksum,sampledAllocatedBytes:profile?sampledAllocatedBytes:null,samplingInterval:profile?1024:null,naturalGC:gcEvents.filter(e=>e.start>=start&&e.start<=end),notes:process.versions.bun?'No Inspector allocation profile / GC observer available on Bun; heap snapshots and natural-workload timings only.':'Allocation sampling includes minor/major-GC collected objects; estimate, not exact bytes or peak heap. Inspector perturbs timing; do not use these timings to rank throughput.'}));
}
