import {test} from 'node:test';
import assert from 'node:assert/strict';
import {from} from './source.ts';
import {collect} from './collect.ts';
test('restricted source-bound collection: references, context, one read and closing',()=>{
  let reads=0,closed=false;
  function* refs(){try{yield 1;yield 2;yield 3;}finally{closed=true;}}
  const source=from(refs(),{context:undefined,get:id=>{reads++;return {amount:id};}});
  assert.deepEqual(collect(source,{context:{minimum:2},where:(e,id,c)=>e.amount>=c.minimum,select:(e,id)=>({id,total:e.amount*2}),limit:1}),[{id:2,total:4}]);
  assert.equal(reads,2);assert.equal(closed,true);
  assert.deepEqual(collect(from(new Map([[undefined,undefined]]))),[undefined]);
  assert.deepEqual(collect(from([1,1,2]),{limit:2}),[1,1]);
  assert.deepEqual(collect(from([1]),{select:()=>{throw new Error('not called');},limit:0}),[]);
  assert.throws(()=>collect(from([1]),{limit:-1}),/Invalid/);
});
