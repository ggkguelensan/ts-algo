import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liveReport} from './tanstack.ts';
import {report} from './scenarios.ts';
test('TanStack DB report matches native and updates joined aggregates',async()=>{
  const scene=report(1000),orders=[...scene.orders].map(([id,e])=>({id,...e})),customers=[...scene.customers].map(([id,e])=>({id,...e}));
  const live=await liveReport(orders,customers);
  try{
    assert.deepEqual(live.read(),scene.variants.direct());
    const old=scene.orders.get(2)!;scene.orders.set(2,{...old,amount:old.amount+100});
    const tx=live.orders.update(2,e=>{e.amount+=100;});await tx.isPersisted.promise;
    assert.deepEqual(live.read(),scene.variants.direct());
  }finally{await live.cleanup();}
});
