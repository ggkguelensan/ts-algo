import assert from 'node:assert/strict';
import {spatial} from './scenario-spatial.ts';
import {measure,save,random} from './measure.ts';
const rows=[];
for(const n of [1000,20000,100000])for(const shape of ['uniform','clustered','coincident']){
  const scene=spatial(n,shape),rand=random(678);
  for(const width of [20,500,1000]){
    const windows=Array.from({length:8},()=>{const minX=width===1000?0:rand()*500,minY=width===1000?0:rand()*500;return{id:-1,x:0,y:0,minX,minY,maxX:minX+width,maxY:minY+width};});
    for(const window of windows){const expected=scene.within.native(window).sort((a,b)=>a-b);for(const run of Object.values(scene.within))assert.deepEqual(run(window).sort((a,b)=>a-b),expected);}
    const timings=measure(Object.fromEntries(Object.entries(scene.within).map(([name,run])=>[name,()=>{let size=0;for(const window of windows)size+=scene.finish(run(window)).length;return size; }])));
    rows.push({n,shape,width,queries:8,kind:'area plus entity filter/projection/canonical id order',timings});
  }
  const positions=Array.from({length:8},()=>({x:rand()*1000,y:rand()*1000,r:100}));
  for(const p of positions){const expected=scene.nearest.native(p.x,p.y,p.r);for(const run of Object.values(scene.nearest))assert.equal(run(p.x,p.y,p.r),expected);}
  rows.push({n,shape,kind:'nearest inclusive radius with source-order ties',queries:8,timings:measure(Object.fromEntries(Object.entries(scene.nearest).map(([name,run])=>[name,()=>{let sum=0;for(const p of positions)sum+=run(p.x,p.y,p.r)??0;return sum; }])))});
  rows.push({n,shape,kind:'nearest plus entity filter/projection; geometric nearest then business filter',queries:8,timings:measure(Object.fromEntries(Object.entries(scene.nearest).map(([name,run])=>[name,()=>{let size=0;for(const p of positions){const id=run(p.x,p.y,p.r);size+=scene.finish(id===undefined?[]:[id]).length;}return size; }])))});
  rows.push({n,shape,kind:'build',timings:measure(Object.fromEntries(Object.entries(scene.builds).map(([name,run])=>[name,()=>{const index=run();return 'size'in index?typeof index.size==='number'?index.size:0:n; }])))});
}
save('spatial',rows);
