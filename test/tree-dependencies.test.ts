import assert from "node:assert/strict";
import test from "node:test";
import {from,entity,subset,collect,sorted} from "../src/index.js";
import {tree,roots,children,parent,nextSibling,previousSibling,subtree,sortChildren,ancestors as treeAncestors} from "../src/tree/index.js";
import {dependencies,causesOf,effectsOf,causalOrder,descendants,ancestors} from "../src/dependencies/index.js";

test("forest separates topology from live entities; flat and sibling sort differ",()=>{
  const store=new Map([["root",{title:"Root",rank:0}],["b",{title:"B",rank:2}],["a",{title:"A",rank:1}],["other",{title:"Other",rank:3}]]);
  const parents=from(new Map([["root",null],["b","root"],["a","root"],["other",null]]));
  const forest=tree(from(store),(_,id)=>entity(parents,id));
  assert.deepEqual(roots(forest),["root","other"]);assert.deepEqual(children(forest,"root"),["b","a"]);
  assert.equal(parent(forest,"a"),"root");assert.equal(nextSibling(forest,"b"),"a");assert.equal(previousSibling(forest,"a"),"b");assert.equal(previousSibling(forest,"root"),undefined);
  assert.deepEqual(collect(subtree(forest,"root")),["root","b","a"]);assert.deepEqual(collect(treeAncestors(forest,"a")),["root"]);
  assert.deepEqual(sorted(forest,e=>e.rank,(a,b)=>a-b),["root","a","b","other"]);assert.deepEqual(children(forest,"root"),["b","a"]);
  const ordered=sortChildren(forest,(e,_,ctx)=>e.rank*ctx.direction,(a,b)=>a-b,{context:{direction:1}});
  assert.deepEqual(children(ordered,"root"),["a","b"]);assert.deepEqual(collect(ordered),["root","a","b","other"]);
  assert.equal(nextSibling(ordered,"a"),"b");assert.equal(previousSibling(ordered,"b"),"a");assert.deepEqual(children(forest,"root"),["b","a"]);
  store.set("a",{title:"new",rank:10});store.set("later",{title:"Later",rank:5});
  assert.deepEqual(collect(subtree(ordered,"root"),{where:e=>e.rank>=2,select:(e,id)=>({id,title:e.title})}),[{id:"a",title:"new"},{id:"b",title:"B"}]);
  assert.equal(forest.size,4);store.delete("b");assert.deepEqual(collect(subtree(forest,"b")),["b"]);assert.throws(()=>entity(forest,"b"),/Missing entity/);
});

test("tree validates topology, consumes once, skips singleton sort getters and handles deep chains",()=>{
  assert.throws(()=>tree(from([1,1]),()=>null),/Duplicate/);
  assert.throws(()=>tree(from([1]),()=>2),/Missing parent/);
  assert.throws(()=>tree(from([1,2]),(_,id)=>id===1?2:1),/Cycle/);
  // @ts-expect-error intentionally invalid JavaScript input
  assert.throws(()=>tree(from([undefined]),()=>null),/Nullish/);
  const fail=():number=>{throw new Error("unneeded");};
  const singleton=tree(from([1]),()=>null);assert.deepEqual(collect(sortChildren(singleton,fail,fail)),[1]);
  for(const run of [()=>children(singleton,2),()=>parent(singleton,2),()=>subtree(singleton,2),()=>nextSibling(singleton,2)])assert.throws(run,/Missing node/);
  function* refs(){for(let i=0;i<10000;i++)yield i;}
  const deep=tree(from(refs()),(_,id)=>id===0?null:id-1);
  assert.equal(collect(deep).length,10000);assert.equal(collect(treeAncestors(deep,9999)).length,9999);
  assert.deepEqual(collect(subtree(deep,0),{limit:2}),[0,1]);
  assert.deepEqual(roots(tree(from([]),()=>null)),[]);
});

test("DAG supports multiple causes, stable order, symmetric lazy traversals and live projections",()=>{
  const store=new Map([["a",{owner:1,status:"done"}],["b",{owner:1,status:"done"}],["c",{owner:1,status:"pending"}],["d",{owner:2,status:"pending"}]]);
  const links=new Map([["a",[]],["b",[]],["c",["a","a","b"]],["d",["c","a"]]]);
  let calls=0;const source=from(store),graph=dependencies(source,(_,id)=>{calls++;return links.get(id)??[];});
  assert.equal(calls,4);assert.deepEqual(causesOf(graph,"c"),["a","b"]);assert.deepEqual(effectsOf(graph,"a"),["c","d"]);
  assert.deepEqual(collect(causalOrder(graph)),["a","b","c","d"]);
  const effects=descendants(graph,"a");assert.deepEqual(collect(effects),["c","d"]);assert.deepEqual(collect(effects),["c","d"]);
  assert.deepEqual(collect(ancestors(graph,"d")),["c","a","b"]);
  assert.deepEqual(collect(effects,{context:{owner:1},where:(e,_,ctx)=>e.owner===ctx.owner}),["c"]);
  const ready=collect(graph,{where:(e,id)=>e.status==="pending"&&causesOf(graph,id).every(cause=>entity(source,cause).status==="done")});assert.deepEqual(ready,["c"]);
  store.set("c",{owner:2,status:"done"});links.set("d",[]);
  assert.deepEqual(causesOf(graph,"d"),["c","a"]);assert.deepEqual(collect(subset(graph,causesOf(graph,"d")),{select:e=>e.status}),["done","done"]);
  assert.deepEqual(collect(effects,{where:e=>e.owner===1}),[]);
  store.delete("c");assert.deepEqual(collect(effects,{limit:1}),["c"]);assert.throws(()=>collect(effects,{select:e=>e.owner}),/Missing entity/);
});

test("DAG rejects invalid references/cycles and permits undefined IDs",()=>{
  assert.throws(()=>dependencies(from([1,1]),()=>[]),/Duplicate/);assert.throws(()=>dependencies(from([1]),()=>[2]),/Missing cause/);
  assert.throws(()=>dependencies(from([1]),()=>[1]),/Cycle/);assert.throws(()=>dependencies(from([1,2]),(_,id)=>[id===1?2:1]),/Cycle/);
  const graph=dependencies(from([undefined,1]),(_,id)=>id===1?[undefined]:[]);
  assert.deepEqual(collect(causalOrder(graph)),[undefined,1]);assert.deepEqual(collect(ancestors(graph,1)),[undefined]);assert.deepEqual(effectsOf(graph,1),[]);
  assert.throws(()=>effectsOf(graph,2),/Missing node/);assert.throws(()=>descendants(graph,2),/Missing node/);
  assert.deepEqual(collect(causalOrder(dependencies(from([]),()=>[]))),[]);
});

test("owned-reference materialization preserves public iterator and sparse iterable semantics",()=>{
  const graph=dependencies(from([1,2]),()=>[]),order=causalOrder(graph);
  const copy=collect(order);copy.pop();assert.deepEqual(collect(order),[1,2]);
  order[Symbol.iterator]=function*(){yield 2;};
  assert.deepEqual(collect(order),[2]);
  const sparse=new Array<number|undefined>(3);sparse[0]=1;sparse[2]=3;
  const rows=collect(from(sparse));assert.deepEqual(rows,[1,undefined,3]);assert.equal(Object.hasOwn(rows,1),true);
});

test("seeded DAG reachability and ordering match independent closure/edge checks",()=>{
  let seed=54;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  for(let round=0;round<30;round++){
    const refs=Array.from({length:40},(_,i)=>i),links=new Map(refs.map(id=>[id,refs.filter(p=>p<id&&random()<0.1)]));
    const graph=dependencies(from(refs),(_,id)=>links.get(id)??[]),order=collect(causalOrder(graph)),positions=new Map(order.map((id,i)=>[id,i]));
    assert.equal(new Set(order).size,refs.length);for(const[id,parents]of links)for(const p of parents)assert(positions.get(p)!<positions.get(id)!);
    for(const start of [0,10,39]){
      const reached=new Set<number>();let changed=true;
      while(changed){changed=false;for(const[id,parents]of links)if(!reached.has(id)&&parents.some(p=>p===start||reached.has(p))){reached.add(id);changed=true;}}
      assert.deepEqual(collect(descendants(graph,start)).sort((a,b)=>a-b),[...reached].sort((a,b)=>a-b));
    }
  }
});
