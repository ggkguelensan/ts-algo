import test from "node:test";
import assert from "node:assert/strict";
import {from,collect,subset,sorted,entity} from "ts-algo";
import {tree,subtree,children,sortChildren} from "ts-algo/tree";
import {timeline,overlapping} from "ts-algo/time";
import {conflicts,freeSlots,overloaded,type Span} from "ts-algo/ranges";
import {dependencies,causesOf,descendants,causalOrder} from "ts-algo/dependencies";
import {pointIndex,within,nearest} from "ts-algo/spatial";
import {indexBy,diffBy} from "ts-algo/diff";

const numberOrder=(a:number,b:number)=>a-b;
function required<K,V>(map:ReadonlyMap<K,V>,key:K):V{
  const value=map.get(key);if(value===undefined)throw new Error("Missing fixture metadata");return value;
}

// These oracles intentionally use scans, path membership, all pairs and unit
// cells rather than the library's indexes, sweep algorithms or traversal state.
test("seven composed public scenarios match seeded independent business oracles",()=>{
  let seed=543221;
  const random=(max:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed%max;};
  for(let round=0;round<60;round++){
    const values=Array.from({length:20},(_,id)=>({id,rank:random(30),visible:random(3)!==0,owner:random(2),done:random(2)===0,units:random(4),amount:random(40)-10,x:random(20),y:random(20)}));
    const store=new Map(values.map(e=>[e.id,e])),source=from(store);
    const parents=new Map(values.map(e=>[e.id,e.id===0||random(5)===0?null:random(e.id)]));
    const forest=tree(source,(_,id)=>required(parents,id)),root=0;
    const inRoot=(id:number):boolean=>{
      let cursor:number|null=id;
      while(cursor!==null){if(cursor===root)return true;cursor=required(parents,cursor);}
      return false;
    };
    // Unique rank key avoids requiring the oracle to share the tree's tie order.
    const rank=(e:typeof values[number])=>e.rank*100+e.id;
    const expectedCatalogue=values.filter(e=>inRoot(e.id)&&e.visible).sort((a,b)=>rank(a)-rank(b)).slice(0,5).map(e=>({id:e.id,amount:e.amount}));
    const selection=subtree(forest,root),order=sorted(selection,rank,numberOrder);
    assert.deepEqual(collect(subset(selection,order),{where:e=>e.visible,select:(e,id)=>({id,amount:e.amount}),limit:5}),expectedCatalogue);
    assert.deepEqual(children(sortChildren(forest,rank,numberOrder),root),values.filter(e=>parents.get(e.id)===root).sort((a,b)=>rank(a)-rank(b)).map(e=>e.id));

    const times=new Map(values.map(e=>{const start=random(24)-4;return [e.id,{start,end:start+random(10)}] as const;}));
    const history=timeline(source,(_,id)=>required(times,id)),window={start:0,end:24};
    const matches=(span:Span)=>span.start<window.end&&(span.start===span.end?span.start>=window.start:span.end>window.start);
    const reservations=collect(overlapping(history,window),{context:{owner:0},where:(e,_,ctx)=>e.owner===ctx.owner,select:(e,id)=>({...required(times,id),units:e.units,id})});
    const expectedReservations=values.filter(e=>e.owner===0&&matches(required(times,e.id))).sort((a,b)=>required(times,a.id).start-required(times,b.id).start).map(e=>({...required(times,e.id),units:e.units,id:e.id}));
    assert.deepEqual(reservations,expectedReservations);
    const pairs=[];
    for(const [i,a]of expectedReservations.entries())for(const [j,b]of expectedReservations.entries()){
      if(j>i&&a.start<a.end&&b.start<b.end&&a.start<b.end&&b.start<a.end)pairs.push([i,j]);
    }
    assert.deepEqual(conflicts(reservations),pairs);
    const segments=(predicate:(time:number)=>boolean)=>{
      const result:Span[]=[];
      for(let time=0;time<24;time++)if(predicate(time)){
        const last=result.at(-1);
        if(last?.end===time)result[result.length-1]={start:last.start,end:time+1};else result.push({start:time,end:time+1});
      }
      return result;
    };
    const covers=(e:Span,time:number)=>e.start<=time&&e.end>time;
    assert.deepEqual(freeSlots(reservations,window),segments(t=>!expectedReservations.some(e=>covers(e,t))));
    assert.deepEqual(overloaded(reservations,window,3),segments(t=>expectedReservations.reduce((sum,e)=>sum+(covers(e,t)?e.units:0),0)>3));

    const links=new Map(values.map(e=>[e.id,e.id===0?[]:[random(e.id),random(e.id)]]));
    const graph=dependencies(source,(_,id)=>required(links,id));
    const expectedReady=values.filter(e=>e.owner===0&&!e.done&&required(links,e.id).every(id=>required(store,id).done)).map(e=>e.id);
    assert.deepEqual(collect(graph,{context:{owner:0},where:(e,id,ctx)=>e.owner===ctx.owner&&!e.done&&causesOf(graph,id).every(p=>entity(graph,p).done)}),expectedReady);
    const reachable=new Set([root]);
    for(let pass=0;pass<values.length;pass++)for(const e of values)if(required(links,e.id).some(id=>reachable.has(id)))reachable.add(e.id);
    reachable.delete(root);
    assert.deepEqual(new Set(collect(descendants(graph,root))),reachable);
    const topological=collect(causalOrder(graph)),positions=new Map(topological.map((id,index)=>[id,index]));
    assert.equal(new Set(topological).size,store.size);
    for(const [id,causes]of links)for(const cause of causes)assert(required(positions,cause)<required(positions,id));

    const customers=new Map([[0,{region:"east",enabled:true}],[1,{region:"west",enabled:round%2===0}]]);
    const rows=collect(source,{where:e=>e.visible,select:e=>({amount:e.amount,customer:customers.get(e.owner)})}),totals=new Map<string,number>();
    for(const row of rows)if(row.customer?.enabled)totals.set(row.customer.region,(totals.get(row.customer.region)??0)+row.amount);
    const expectedTotals=new Map<string,number>();
    for(const e of values){const customer=customers.get(e.owner);if(e.visible&&customer?.enabled)expectedTotals.set(customer.region,(expectedTotals.get(customer.region)??0)+e.amount);}
    assert.deepEqual(totals,expectedTotals);

    const before=values.filter(e=>e.id%3!==0),after=values.filter(e=>e.id%4!==0).map(e=>({...e,amount:e.id%2===0?e.amount+1:e.amount}));
    const left=new Map(before.map(e=>[e.id,e])),right=new Map(after.map(e=>[e.id,e]));
    const expectedDiff={added:after.filter(e=>!left.has(e.id)).map(e=>e.id),removed:before.filter(e=>!right.has(e.id)).map(e=>e.id),changed:after.filter(e=>left.has(e.id)&&required(left,e.id).amount!==e.amount).map(e=>e.id)};
    assert.deepEqual(diffBy(indexBy(before,e=>e.id),indexBy(after,e=>e.id),(a,b)=>a.amount===b.amount),expectedDiff);

    const points=pointIndex(source,{x:e=>e.x,y:e=>e.y}),bounds={minX:3,minY:3,maxX:15,maxY:15};
    const canonical=(rows:readonly {id:number;amount:number}[])=>rows.toSorted((a,b)=>a.id-b.id);
    const spatial=collect(within(points,bounds),{where:e=>e.visible,select:(e,id)=>({id,amount:e.amount})});
    assert.deepEqual(canonical(spatial),canonical(values.filter(e=>e.visible&&e.x>=3&&e.x<=15&&e.y>=3&&e.y<=15).map(e=>({id:e.id,amount:e.amount}))));
    const x=random(20),y=random(20),radius=random(10);
    const closest=values.map(e=>({reference:e.id,distance:Math.hypot(e.x-x,e.y-y)})).filter(e=>e.distance<=radius).sort((a,b)=>a.distance-b.distance||a.reference-b.reference)[0];
    assert.deepEqual(nearest(points,x,y,radius),closest);

    const jobs=new Map(values.map(e=>[e.id,{deadline:e.rank}]));
    for(const e of values){if(e.id%3===0)jobs.delete(e.id);else if(e.id%4===0)jobs.set(e.id,{deadline:random(30)});}
    const expectedPriority=[...jobs].map(([id,e],position)=>({id,deadline:e.deadline,position})).sort((a,b)=>a.deadline-b.deadline||a.position-b.position).slice(0,5).map(({id,deadline})=>({id,deadline}));
    const priorities=sorted(jobs,e=>e.deadline,numberOrder);
    assert.deepEqual(collect(subset(from(jobs),priorities),{select:(e,id)=>({id,deadline:e.deadline}),limit:5}),expectedPriority);
  }
});
