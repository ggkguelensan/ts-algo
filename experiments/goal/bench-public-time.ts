import assert from 'node:assert/strict';
import {from,collect} from '../../dist/src/index.js';
import {timeline,overlapping,startsBetween} from '../../dist/src/time/index.js';
import {timeline as legacyTimeline} from '../../dist/references/legacy-timeline.js';
import {from as prototypeFrom} from './source.ts';
import {temporal,overlapping as prototypeOverlap} from './temporal.ts';
import {measure,random,save} from './measure.ts';
const reports=[];
for(const n of [1000,20000,100000])for(const shape of ['points','short','long','nested']){
  const rand=random(123),records=Array.from({length:n},(_,id)=>{const start=Math.floor(rand()*100000),length=shape==='points'?0:shape==='short'?Math.floor(rand()*50)+1:shape==='long'?50000:100000-start;return {id,start,end:start+length};});
  const store=new Map(records.map(e=>[e.id,{title:`event-${e.id}`,enabled:e.id%2===0}] as const)),metadata=new Map(records.map(e=>[e.id,e] as const));
  const getter=(_:unknown,id:number)=>metadata.get(id)!;
  const buildPublic=()=>timeline(from(store),getter),buildPrototype=()=>temporal(prototypeFrom(store),getter),buildLegacy=()=>legacyTimeline(store,{time:getter});
  const index=buildPublic(),prototype=buildPrototype(),legacy=buildLegacy(),ordered=records.toSorted((a,b)=>a.start-b.start);
  const qrand=random(456),windows=Array.from({length:16},()=>{const start=Math.floor(qrand()*100000);return {start,end:start+10};});
  const intersects=(e:typeof records[number],a:number,b:number)=>e.start<b&&(e.start===e.end?e.start>=a:e.end>a);
  const variants={
    nativeSortedScan:(a:number,b:number)=>ordered.filter(e=>intersects(e,a,b)).map(e=>e.id),
    publicRefs:(a:number,b:number)=>collect(overlapping(index,{start:a,end:b})),
    prototypeRefs:(a:number,b:number)=>Array.from(prototypeOverlap(prototype,{start:a,end:b})),
    legacyRefs:(a:number,b:number)=>legacy.overlapping(a,b),
  };
  for(const w of windows){const expected=variants.nativeSortedScan(w.start,w.end);for(const run of Object.values(variants))assert.deepEqual(run(w.start,w.end),expected);}
  reports.push({n,shape,kind:'16 selective overlap windows; stable chronological refs; prepared indices',timings:measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>{let size=0;for(const w of windows)size+=run(w.start,w.end).length;return size;}])))});
  const fullWindow={start:0,end:200000};
  const expectedRows=ordered.filter(e=>store.get(e.id)!.enabled).slice(0,20).map(e=>({id:e.id,title:store.get(e.id)!.title}));
  const publicPage=()=>collect(overlapping(index,fullWindow),{where:e=>e.enabled,select:(e,id)=>({id,title:e.title}),limit:20});
  const prototypePage=()=>{const refs=prototypeOverlap(prototype,fullWindow);const out=[];for(const id of refs){const e=store.get(id)!;if(e.enabled){out.push({id,title:e.title});if(out.length===20)break;}}return out;};
  const nativePage=()=>{const out=[];for(const e of ordered){if(store.get(e.id)!.enabled){out.push({id:e.id,title:store.get(e.id)!.title});if(out.length===20)break;}}return out;};
  const legacyPage=()=>{const out=[];for(const id of legacy.overlapping(fullWindow.start,fullWindow.end)){const e=store.get(id)!;if(e.enabled){out.push({id,title:e.title});if(out.length===20)break;}}return out;};
  for(const run of [publicPage,prototypePage,nativePage,legacyPage])assert.deepEqual(run(),expectedRows);
  reports.push({n,shape,kind:'full overlap then business filter/DTO/limit20; native/prepared sorted',timings:measure({publicPage:()=>publicPage().length,prototypePage:()=>prototypePage().length,nativePage:()=>nativePage().length,legacyPage:()=>legacyPage().length})});
  const startExpected=ordered.filter(e=>e.start>=20000&&e.start<20100).map(e=>e.id);assert.deepEqual(collect(startsBetween(index,{start:20000,end:20100})),startExpected);
  reports.push({n,shape,kind:'build with validation/live entity binding; fixture generation excluded',timings:measure({publicBuild:()=>buildPublic().size,prototypeBuild:()=>buildPrototype().size,legacyBuild:()=>buildLegacy().size,nativeSorted:()=>records.toSorted((a,b)=>a.start-b.start).length})});
}
save('migration-time',reports);
