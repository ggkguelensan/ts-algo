import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scheduleExample,catalogueExample} from './target-examples.ts';
import {from,subset,collect,sorted,timeline,overlapping,tree,sortChildren,children,nextSibling,previousSibling,dependencies,causesOf,causalOrder,descendants} from './target-interface.ts';

test('target time selection composes with separate query context, sorting, projection and capacity',()=>{
  assert.deepEqual(scheduleExample(),{refs:['c','b','a'],titles:['A','B','C'],free:[{start:15,end:25}],overloaded:[{start:5,end:10}]});
});
test('target hierarchy separates external metadata from entities and flat ordering',()=>{
  const result=catalogueExample();
  assert.deepEqual(result.roots,['catalog','archive']);assert.deepEqual(result.children,['phones','books','hidden']);assert.equal(result.next,'books');
  assert.deepEqual(result.refs,['hidden','catalog','books','phones']);assert.deepEqual(result.rows,[{id:'catalog',title:'Каталог'},{id:'books',title:'Книги'}]);
});
test('bound sorting keeps context, stable duplicate occurrences and undefined reference semantics',()=>{
  let calls=0;
  const source=from([undefined,'a','a'],{context:{minimum:2},get:(id,ctx)=>({rank:id===undefined?ctx.minimum:3})});
  assert.deepEqual(sorted(source,(e,_,ctx)=>{calls++;return e.rank+ctx.offset;},(a,b)=>a-b,{context:{offset:5}}),[undefined,'a','a']);assert.equal(calls,3);
  assert.deepEqual(sorted(from([1]),()=>{throw new Error('unused singleton selector');},(a:number,b:number)=>a-b),[1]);
});
test('unbound time index can resolve entities only when a selection is used',()=>{
  const store=new Map([[1,{title:'old'}],[2,{title:'other'}]]),times=new Map([[1,10],[2,20]]);
  const index=timeline(from([...store.keys()]),id=>times.get(id)??0);
  const refs=overlapping(index,{start:0,end:15});
  assert.deepEqual(collect(refs),[1]);store.set(1,{title:'new'});
  assert.deepEqual(collect(subset(from(store),refs),{select:e=>e.title}),['new']);
});
test('hierarchy order is independent of flat sorting and has bidirectional sibling positions',()=>{
  const items=new Map([['root',{rank:0}],['b',{rank:2}],['a',{rank:1}]]),source=from(items),original=tree(source,(_,id)=>id==='root'?null:'root');
  const ordered=sortChildren(original,(e,_,ctx)=>e.rank*ctx.direction,(a,b)=>a-b,{context:{direction:1}});
  assert.deepEqual(children(original,'root'),['b','a']);assert.deepEqual(children(ordered,'root'),['a','b']);assert.equal(nextSibling(ordered,'a'),'b');assert.equal(previousSibling(ordered,'b'),'a');assert.equal(previousSibling(ordered,'a'),undefined);
  assert.throws(()=>previousSibling(ordered,'missing'),/Missing node/);
  // @ts-expect-error intentionally invalid JavaScript input: nullish keys are reserved
  assert.throws(()=>tree(from([undefined]),()=>null),/Nullish/);
});
test('DAG accepts multiple distinct causes and deduplicates repeated edges',()=>{
  const graph=dependencies(from(['a','b','c']),(_,id)=>id==='c'?['a','a','b']:[]);
  assert.deepEqual(causesOf(graph,'c'),['a','b']);assert.deepEqual(causalOrder(graph),['a','b','c']);assert.deepEqual(descendants(graph,'a'),['c']);
});
