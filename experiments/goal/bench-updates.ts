import assert from 'node:assert/strict';
import {timeline} from '../../dist/references/legacy-timeline.js';
import {from} from './source.ts';
import {temporal,overlapping} from './temporal.ts';
import {measure,save} from './measure.ts';
type Event={id:number;start:number;end:number};
const rows=[];
for(const n of [1000,20000])for(const shape of ['point','short','long']){
  const base=Array.from({length:n},(_,id)=>({id,start:id*3,end:id*3+(shape==='point'?0:shape==='short'?8:n)}));
  const entities=new Map(base.map(e=>[e.id,{title:`event-${e.id}`} ]));
  const run=(kind:'native'|'sorted'|'current'|'temporal')=>{
    const times=new Map(base.map(e=>[e.id,e]));let last:number[]=[];
    for(let batch=0;batch<5;batch++){
      for(let i=0;i<20;i++){const id=(i*37+batch*11)%n,e=times.get(id)!;times.set(id,{...e,start:e.start+1,end:e.end+1});}
      const window={start:batch*100,end:batch*100+30};
      const intersect=(e:Event)=>e.start<window.end&&(e.start===e.end?e.start>=window.start:e.end>window.start);
      if(kind==='native')last=[...times.values()].filter(intersect).sort((a,b)=>a.start-b.start||a.id-b.id).map(e=>e.id);
      else if(kind==='sorted'){const sorted=[...times.values()].sort((a,b)=>a.start-b.start||a.id-b.id);last=[];for(const e of sorted){if(e.start>=window.end)break;if(intersect(e))last.push(e.id);}}
      else if(kind==='current')last=timeline(entities,{time:(_,id)=>times.get(id)!}).overlapping(window.start,window.end);
      else last=[...overlapping(temporal(from(entities),(_,id)=>times.get(id)!),window)];
    }return last;
  };
  const expected=run('native');for(const kind of ['sorted','current','temporal']as const)assert.deepEqual(run(kind),expected);
  rows.push({n,shape,batches:5,updatesPerBatch:20,queriesPerBatch:1,timings:measure(Object.fromEntries(['native','sorted','current','temporal'].map(kind=>[kind,()=>run(kind as Parameters<typeof run>[0]).length])))});
}
save('updates',rows);
