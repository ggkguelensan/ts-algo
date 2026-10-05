import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {liveReport} from './tanstack.ts';
import {report} from './scenarios.ts';
import {save} from './measure.ts';
const rows=[];
for(const n of [1000,20000])for(const filterIndex of [false,true]){
  const scene=report(n),orderRows=[...scene.orders].map(([id,e])=>({id,...e})),customerRows=[...scene.customers].map(([id,e])=>({id,...e}));
  const cold:number[]=[],warmRead:number[]=[],updates:number[]=[],nativeUpdates:number[]=[];
  for(let round=-1;round<5;round++){
    const start=performance.now(),live=await liveReport(orderRows,customerRows,{filterIndex}),built=performance.now()-start;
    try{
      assert.deepEqual(live.read(),scene.variants.direct());if(round>=0)cold.push(built);
      const readStart=performance.now();for(let i=0;i<100;i++)live.read();if(round>=0)warmRead.push((performance.now()-readStart)/100);
      for(let i=0;i<20;i++){
        const id=i*2+2,old=scene.orders.get(id)!;
        const beginNative=performance.now();scene.orders.set(id,{...old,amount:old.amount+1});const expected=scene.variants.direct();const nativeMs=performance.now()-beginNative;
        const begin=performance.now(),tx=live.orders.update(id,e=>{e.amount+=1;});await tx.isPersisted.promise;const actual=live.read(),updateMs=performance.now()-begin;
        assert.deepEqual(actual,expected);if(round>=0){updates.push(updateMs);nativeUpdates.push(nativeMs);}
      }
    }finally{await live.cleanup();}
    // Next round starts from the same immutable fixture.
    scene.orders.clear();for(const {id,...entity}of orderRows)scene.orders.set(id,entity);
  }
  rows.push({n,filterIndex,coldCollectionsIndicesAndInitialQuery:cold,warmRead,updates,nativeUpdates,notes:'Five retained-query rounds, 20 committed local updates per round. Native recomputes; TanStack maintains subscribed result. Virtual props are projected away equally for result checks. Cold excludes fixture-row generation but includes collection/index/query setup; cleanup excluded. Both join-only and additional paid-filter-index configurations are measured.'});
}
save('tanstack',rows);
