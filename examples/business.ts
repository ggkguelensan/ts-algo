/** Executable examples use only public imports and ordinary native JS. */
import {from,subset,entity,collect,sorted} from "ts-algo";
import {tree,subtree,children,sortChildren} from "ts-algo/tree";
import {timeline,overlapping} from "ts-algo/time";
import {freeSlots,conflicts,overloaded} from "ts-algo/ranges";
import {dependencies,causesOf,descendants,causalOrder} from "ts-algo/dependencies";
import {pointIndex,within,nearest} from "ts-algo/spatial";
import {indexBy,diffBy} from "ts-algo/diff";

export function catalogue(){
  const items=from(new Map([["root",{title:"Catalog",visible:true}],["b",{title:"Books",visible:true}],["p",{title:"Phones",visible:true}],["hidden",{title:"Archive",visible:false}]]));
  const parents=from(new Map<string,string|null>([["root",null],["p","root"],["b","root"],["hidden","root"]]));
  const catalog=tree(items,(_,id)=>entity(parents,id)),selection=subtree(catalog,"root");
  const order=sorted(selection,e=>e.title,(a,b)=>a.localeCompare(b));
  return {rows:collect(subset(selection,order),{where:e=>e.visible,select:(e,id)=>({id,title:e.title}),limit:2}),children:children(sortChildren(catalog,e=>e.title,(a,b)=>a.localeCompare(b)),"root")};
}
export function schedule(){
  const events=from(new Map([["a",{owner:"alice",units:2}],["b",{owner:"alice",units:2}],["c",{owner:"bob",units:1}]]));
  const times=from(new Map([["a",{start:0,end:10}],["b",{start:5,end:15}],["c",{start:20,end:25}]]));
  const history=timeline(events,(_,id)=>entity(times,id)),window={start:0,end:25};
  const reservations=collect(overlapping(history,window),{context:{owner:"alice"},where:(e,_,ctx)=>e.owner===ctx.owner,select:(e,id)=>({...entity(times,id),units:e.units})});
  return {conflicts:conflicts(reservations),free:freeSlots(reservations,window),overloaded:overloaded(reservations,window,3)};
}
export function tasks(){
  const jobs=from(new Map([["a",{owner:"alice",status:"done"}],["b",{owner:"bob",status:"done"}],["c",{owner:"alice",status:"pending"}],["d",{owner:"bob",status:"pending"}]]));
  const links=new Map([["a",[]],["b",[]],["c",["a","b"]],["d",["c"]]]),graph=dependencies(jobs,(_,id)=>links.get(id)??[]);
  return {ready:collect(graph,{context:{owner:"alice"},where:(e,id,ctx)=>e.owner===ctx.owner&&e.status==="pending"&&causesOf(graph,id).every(p=>entity(graph,p).status==="done")}),effects:collect(descendants(graph,"a")),order:collect(causalOrder(graph))};
}
export function report(){
  const customers=new Map([["alice",{region:"east",enabled:true}],["bob",{region:"west",enabled:true}]]);
  const orders=from(new Map([[1,{customer:"alice",amount:10,paid:true}],[2,{customer:"bob",amount:5,paid:true}],[3,{customer:"alice",amount:20,paid:true}],[4,{customer:"missing",amount:100,paid:true}],[5,{customer:"bob",amount:100,paid:false}]]));
  const rows=collect(orders,{where:e=>e.paid,select:e=>({order:e,customer:customers.get(e.customer)})}),totals=new Map<string,number>();
  for(const {order,customer} of rows)if(customer?.enabled)totals.set(customer.region,(totals.get(customer.region)??0)+order.amount);
  return [...totals].map(([region,total])=>({region,total})).sort((a,b)=>b.total-a.total||a.region.localeCompare(b.region)).slice(0,2);
}
export function synchronization(){
  const before=indexBy([{id:"a",revision:1},{id:"b",revision:1}],e=>e.id),after=indexBy([{id:"b",revision:2},{id:"c",revision:1}],e=>e.id);
  return diffBy(before,after,(a,b)=>a.revision===b.revision);
}
export function spatial(){
  const items=from(new Map([["a",{title:"A",enabled:true}],["b",{title:"B",enabled:false}],["c",{title:"C",enabled:true}]]));
  const positions=from(new Map([["a",{x:1,y:1}],["b",{x:2,y:2}],["c",{x:50,y:50}]]));
  const index=pointIndex(items,{x:(_,id)=>entity(positions,id).x,y:(_,id)=>entity(positions,id).y});
  return {rows:collect(within(index,{minX:0,minY:0,maxX:5,maxY:5}),{where:e=>e.enabled,select:(e,id)=>({id,title:e.title})}),nearest:nearest(index,1,1,0)};
}
export function priority(){
  // Native batch policy: update deadlines and cancel IDs before ordering.
  const jobs=new Map([["a",{deadline:20}],["b",{deadline:10}],["c",{deadline:30}]]);
  jobs.set("c",{deadline:5});jobs.delete("b");
  const order=sorted(jobs,e=>e.deadline,(a,b)=>a-b);
  return collect(subset(from(jobs),order),{select:(e,id)=>({id,deadline:e.deadline}),limit:2});
}
export function allScenarios(){return {catalogue:catalogue(),schedule:schedule(),tasks:tasks(),report:report(),synchronization:synchronization(),spatial:spatial(),priority:priority()};}
