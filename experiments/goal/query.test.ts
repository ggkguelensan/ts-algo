import {test} from 'node:test';
import assert from 'node:assert/strict';
import {from} from './source.ts';
import {query,queryInput,withContext,filtered,selected,sorted,take,drop,lazyFiltered,lazySelected,lazyTake} from './query.ts';

test('Map references, projections and query context',()=>{
  const records=new Map([['a',{n:3}],['b',{n:1}],['c',{n:2}]]);
  const source=withContext(from(records),{minimum:2});
  assert.deepEqual(query(source,filtered(e=>e.n>1),sorted(e=>e.n,(a,b)=>a-b)),['c','a']);
  assert.deepEqual(query(source,filtered((e,_,ctx)=>e.n>=ctx.minimum),selected((e,id)=>({id,total:e.n*2})),sorted(e=>e.total,(a,b)=>b-a)),[{id:'a',total:6},{id:'c',total:4}]);
});
test('take/drop order, early stop and callback order',()=>{
  const source=queryInput(from([3,1,2]));
  assert.deepEqual(query(source,take(2),sorted(x=>x,(a,b)=>a-b)),[1,3]);
  assert.deepEqual(query(source,sorted(x=>x,(a,b)=>a-b),take(2)),[1,2]);
  assert.deepEqual(query(source,take(1),filtered(x=>x<2)),[]);
  assert.deepEqual(query(source,drop(1),take(1)),[1]);
  const calls:string[]=[];
  assert.deepEqual(query(source,filtered(x=>{calls.push(`f${x}`);return x>1;}),selected(x=>{calls.push(`s${x}`);return x*2;}),take(1)),[6]);
  assert.deepEqual(calls,['f3','s3']);
  assert.deepEqual(query(source,selected(x=>{throw new Error(String(x));}),take(0)),[]);
});
test('undefined values sort by selected value, repeated references and one-shot close',()=>{
  assert.deepEqual(query(queryInput(from([undefined,'a'])),sorted(x=>x===undefined?0:1,(a,b)=>a-b)),[undefined,'a']);
  assert.deepEqual(query(queryInput(from([1,1,2])),selected(x=>x)),[1,1,2]);
  let closed=false;
  function* generator():Generator<number>{try{yield 1;yield 2;}finally{closed=true;}}
  const source=queryInput(from(generator()));
  assert.deepEqual(query(source,take(1)),[1]);assert.equal(closed,true);
  assert.deepEqual(query(source),[]);
});
test('fused resolves once within a segment; lazy alternative resolves for each callback',()=>{
  let calls=0;
  const source=queryInput(from([1,2,3],{context:undefined,get:id=>{calls++;return {n:id};}}));
  const fused=query(source,filtered(e=>e.n>1),selected(e=>e.n*2),take(1));
  assert.deepEqual(fused,[4]);assert.equal(calls,2);
  calls=0;
  const lazy=Array.from(lazyTake(lazySelected(lazyFiltered(source,e=>e.n>1),e=>e.n*2),1));
  assert.deepEqual(lazy,fused);assert.equal(calls,3);
});
