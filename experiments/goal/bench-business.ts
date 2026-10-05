import assert from 'node:assert/strict';
import {catalogue,scheduling,report,synchronization} from './scenarios.ts';
import {tasks} from './scenario-tasks.ts';
import {priority} from './scenario-priority.ts';
import {measure,save} from './measure.ts';
const rows=[];
function consume(value:unknown):number {if(Array.isArray(value))return value.length;if(value&&typeof value==='object')return Object.values(value).reduce((sum:number,part:unknown)=>sum+(Array.isArray(part)?part.length:0),0);return 0;}
for(const n of [200,2000])for(const[name,make]of Object.entries({catalogue,scheduling,tasks})){
  const scene=make(n),variants=scene.variants,expected=Object.values(variants)[0]!();
  for(const run of Object.values(variants))assert.deepEqual(run(),expected);
  rows.push({scenario:name,n,timings:measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>consume(run())]))),result:expected});
  if('buildAndQuery'in scene){for(const run of Object.values(scene.buildAndQuery))assert.deepEqual(run(),expected);rows.push({scenario:name,n,kind:'build and one full query',notes:'Entity/metadata fixture generation excluded. Native caller supplies valid topology; library constructors validate it. Graphology additionally runs topologicalSort for DAG validation.',timings:measure(Object.fromEntries(Object.entries(scene.buildAndQuery).map(([name,run])=>[name,()=>consume(run())]))),result:expected});}
}
for(const n of [1000,100000])for(const[name,make]of Object.entries({report,synchronization})){
  const scene=make(n),variants=scene.variants,expected=Object.values(variants)[0]!();for(const run of Object.values(variants))assert.deepEqual(run(),expected);
  rows.push({scenario:name,n,timings:measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>consume(run())]))),result:name==='report'?expected:'large diff verified; not serialized in report'});
}
for(const n of [1000,100000])for(const limit of [20,n]){
  const scene=priority(n,limit),expected=scene.variants.sortedArray();for(const run of Object.values(scene.variants))assert.deepEqual(run(),expected);
  rows.push({scenario:'priority',n,limit,timings:measure(Object.fromEntries(Object.entries(scene.variants).map(([name,run])=>[name,()=>run().length]))),resultLength:expected.length});
}
save('business',rows);
