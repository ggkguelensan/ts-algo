import assert from 'node:assert/strict';
import {from,subset,collect} from '../../dist/src/index.js';
import {pointIndex,within,nearest} from '../../dist/src/spatial/index.js';
import {spatial} from './scenario-spatial.ts';
import {measure,random,save} from './measure.ts';
const rows=[];
for(const n of [1000,20000,100000])for(const shape of ['uniform','clustered','coincident']){
  const scene=spatial(n,shape),source=from(scene.entities),coordinates={x:(_:unknown,id:number)=>scene.points[id]!.x,y:(_:unknown,id:number)=>scene.points[id]!.y};
  const make=()=>pointIndex(source,coordinates),index=make(),rand=random(678);
  const finish=(ids:Iterable<number>)=>collect(subset(source,ids),{where:e=>e.enabled,select:(e,id)=>({id,title:e.title})}).sort((a,b)=>a.id-b.id);
  for(const width of [20,1000]){
    const windows=Array.from({length:8},()=>{const minX=width===1000?0:rand()*500,minY=width===1000?0:rand()*500;return{id:-1,x:0,y:0,minX,minY,maxX:minX+width,maxY:minY+width};});
    const variants={...scene.within,public:(bounds:typeof windows[number])=>within(index,bounds)};
    for(const window of windows){const expected=finish(scene.within.native(window));for(const run of Object.values(variants))assert.deepEqual(finish(run(window)),expected);}
    rows.push({n,shape,width,kind:'8 areas plus entity filter/DTO/canonical IDs; prepared index',timings:measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>{let total=0;for(const w of windows)total+=finish(run(w)).length;return total;}])))});
  }
  const positions=Array.from({length:8},()=>({x:rand()*1000,y:rand()*1000,r:100}));
  const nearestVariants={...scene.nearest,public:(x:number,y:number,r:number)=>nearest(index,x,y,r)?.reference};
  for(const p of positions){const expected=scene.nearest.native(p.x,p.y,p.r);for(const run of Object.values(nearestVariants))assert.equal(run(p.x,p.y,p.r),expected);}
  rows.push({n,shape,kind:'8 nearest plus entity filter/DTO; geometric nearest then business filter',timings:measure(Object.fromEntries(Object.entries(nearestVariants).map(([name,run])=>[name,()=>{let total=0;for(const p of positions){const id=run(p.x,p.y,p.r);total+=finish(id===undefined?[]:[id]).length;}return total;}])))});
  rows.push({n,shape,kind:'build including coordinate resolution/cache; fixture generation excluded',timings:measure({...Object.fromEntries(Object.entries(scene.builds).map(([name,run])=>[name,()=>{run();return n;}])),public:()=>make().size})});
  const window={minX:0,minY:0,maxX:1000,maxY:1000};
  const publicLimit=()=>collect(within(index,window),{select:(_e,id)=>id,limit:20});
  const oldLimit=()=>collect(subset(source,scene.within.current({id:-1,x:0,y:0,...window})),{select:(_e,id)=>id,limit:20});
  // Same tree/partition order; verify exact first-occurrence subset, not only size.
  assert.deepEqual(publicLimit(),oldLimit());
  rows.push({n,shape,kind:'whole-area limit20 in existing tree traversal order; no canonical sorting',timings:measure({publicLimit:()=>publicLimit().length,legacyEagerLimit:()=>oldLimit().length})});
}
save('migration-spatial',rows);
