import assert from 'node:assert/strict';
import {from,subset,collect,sorted,entity} from '../../dist/src/index.js';
import {tree,subtree} from '../../dist/src/tree/index.js';
import {dependencies,causesOf,descendants,causalOrder} from '../../dist/src/dependencies/index.js';
import {catalogue} from './scenarios.ts';
import {tasks} from './scenario-tasks.ts';
import {measure,save} from './measure.ts';
const rows=[];
for(const n of [200,2000,20000]){
  const scene=catalogue(n),make=()=>tree(from(scene.items),(_,id)=>scene.parents.get(id)),index=make();
  const query=(index:ReturnType<typeof make>)=>{
    const selection=subtree(index,0),matching=collect(selection,{where:e=>e.visible});
    const order=sorted(subset(selection,matching),e=>e.title,(a,b)=>a.localeCompare(b));
    return collect(subset(selection,order),{select:(e,id)=>({id,title:e.title}),limit:20});
  };
  const variants={nativeIndexed:scene.variants.nativeIndexed,legacy:scene.variants.current,prototype:scene.variants.bound,public:()=>query(index)};
  const expected=variants.nativeIndexed();for(const run of Object.values(variants))assert.deepEqual(run(),expected);
  rows.push({scenario:'catalogue',n,kind:'prepared subtree/filter/stable flat order/DTO/limit20',timings:measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>run().length])))});
  const cold={...scene.buildAndQuery,public:()=>query(make())};for(const run of Object.values(cold))assert.deepEqual(run(),expected);
  rows.push({scenario:'catalogue',n,kind:'build and same complete query; fixtures excluded; library validates topology',timings:measure(Object.fromEntries(Object.entries(cold).map(([name,run])=>[name,()=>run().length])))});
}
for(const n of [200,2000,20000]){
  const scene=tasks(n),make=()=>dependencies(from(scene.entities),(_,id)=>scene.links.get(id)??[]),graph=make();
  const query=(graph:ReturnType<typeof make>)=>({ready:collect(graph,{where:(e,id)=>e.status==='pending'&&e.owner===1&&causesOf(graph,id).every(cause=>entity(graph,cause).status==='done')}),consequences:collect(descendants(graph,'0')).sort()});
  const variants={nativeIndexed:scene.variants.nativeIndexed,legacy:scene.variants.current,prototype:scene.variants.bound,graphology:scene.variants.graphology,public:()=>query(graph)};
  const expected=variants.nativeIndexed();for(const run of Object.values(variants))assert.deepEqual(run(),expected);
  const consume=(result:typeof expected)=>result.ready.length+result.consequences.length;
  rows.push({scenario:'tasks',n,kind:'prepared owner/ready work/consequence refs',timings:measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>consume(run())])))});
  const cold={...scene.buildAndQuery,public:()=>query(make())};for(const run of Object.values(cold))assert.deepEqual(run(),expected);
  rows.push({scenario:'tasks',n,kind:'build and same complete query; fixtures excluded; library/Graphology validate DAG',timings:measure(Object.fromEntries(Object.entries(cold).map(([name,run])=>[name,()=>consume(run())])))});
  const order=collect(causalOrder(graph)),positions=new Map(order.map((id,i)=>[id,i]));
  for(const[id,parents]of scene.links)for(const p of parents)assert(positions.get(p)!<positions.get(id)!);
  rows.push({scenario:'tasks',n,kind:'retained topological order; prototype recomputes; public/legacy cache',timings:measure({publicCached:()=>collect(causalOrder(graph)).length,prototypeRecomputed:()=>scene.orders.bound().length,legacyCached:()=>scene.orders.current().length,graphologyRecomputed:()=>scene.orders.graphology().length})});
}
save('migration-structure',rows);
