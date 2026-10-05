import {test} from 'node:test';
import assert from 'node:assert/strict';
import {from,subset,entity,sourceContext} from './source.ts';
import {collect} from './collect.ts';

test('source binding: live Map keys/entities, snapshot references and missing values',()=>{
  const store=new Map<string,{amount:number}|undefined>([['a',{amount:1}],['undefined',undefined]]),source=from(store),selection=subset(source,['a']);
  store.set('a',{amount:2});store.set('b',{amount:3});
  assert.deepEqual([...source],['a','undefined','b']);assert.deepEqual([...selection],['a']);
  assert.equal(entity(selection,'a')?.amount,2);assert.equal(entity(source,'undefined'),undefined);
  store.delete('a');assert.deepEqual(collect(selection),['a']);
  assert.throws(()=>collect(selection,{select:e=>e}),/Missing entity/);
  // Reference-only materialization does not resolve or validate store membership.
  assert.deepEqual(collect(source),['undefined','b']);
});
test('external context and two bindings for the same references',()=>{
  const context={records:new Map([[1,{amount:2}]])};
  const source=from([1],{context,get:(id,ctx)=>{const item=ctx.records.get(id);if(!item)throw new RangeError('missing');return item;}});
  const other=from([1],{context:{records:new Map([[1,{amount:9}]])},get:(id,ctx)=>ctx.records.get(id)!});
  assert.equal(sourceContext(source),context);assert.equal(entity(source,1).amount,2);assert.equal(entity(other,1).amount,9);
  context.records.set(1,{amount:4});assert.deepEqual(collect(source,{context:{factor:3},select:(e,_,ctx)=>e.amount*ctx.factor}),[12]);
});
test('iterable binding preserves identity, duplicates and one-shot consumption',()=>{
  const value={amount:1};assert.equal(entity(from(new Set([value])),value),value);
  assert.deepEqual(collect(from([value,value])),[value,value]);
  function* refs(){yield 1;yield 2;}
  const source=from(refs());assert.deepEqual(collect(source),[1,2]);assert.deepEqual(collect(source),[]);
});
test('collect callback failure closes a one-shot iterator',()=>{
  let closed=false;function* refs(){try{yield 1;yield 2;}finally{closed=true;}}
  assert.throws(()=>collect(from(refs()),{select:()=>{throw new Error('callback');}}),/callback/);
  assert.equal(closed,true);
});
