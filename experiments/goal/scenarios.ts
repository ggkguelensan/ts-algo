import * as R from 'remeda';
import {from,subset} from './source.ts';
import {query,queryInput,filtered,selected,sorted,take} from './query.ts';
import {aggregateBy,leftJoin} from './operators.ts';
import {temporal,overlapping} from './temporal.ts';
import {freeSlots,overloaded,conflicts,type Reservation} from './ranges.ts';
import {diffBy} from './diff.ts';
import {tree} from '../../dist/src/tree.js';
import {timeline} from '../../dist/src/timeline.js';
import {hierarchy,subtree} from './hierarchy.ts';
import {collect} from './collect.ts';

export function catalogue(n=1000) {
  const items=new Map(Array.from({length:n},(_,id)=>[id,{title:`item-${String(n-id).padStart(8,'0')}`,price:id,visible:id%2===0}] as const));
  const parents=new Map(Array.from(items.keys(),id=>[id,id<2?null:Math.floor((id-2)/4)] as const));
  const old=tree(items,{parent:(_,id)=>parents.get(id)}),next=hierarchy(from(items),(_,id)=>parents.get(id));
  function nativeIds(){const out:number[]=[],stack=[0];while(stack.length){const id=stack.pop()!;out.push(id);const matches=[...parents].filter(([,p])=>p===id).map(([id])=>id);for(let i=matches.length-1;i>=0;i--)stack.push(matches[i]!);}return out;}
  const childIndex=new Map<number,number[]>();for(const[id,parent]of parents)if(parent!==null){const refs=childIndex.get(parent)??[];refs.push(id);childIndex.set(parent,refs);}
  function indexedIds(){const out:number[]=[],stack=[0];while(stack.length){const id=stack.pop()!;out.push(id);const matches=childIndex.get(id)??[];for(let i=matches.length-1;i>=0;i--)stack.push(matches[i]!);}return out;}
  const project=(ids:Iterable<number>)=>Array.from(ids).filter(id=>items.get(id)!.visible).sort((a,b)=>items.get(a)!.title.localeCompare(items.get(b)!.title)).slice(0,20).map(id=>({id,title:items.get(id)!.title}));
  return {items,parents,old,next,variants:{nativeScan:()=>project(nativeIds()),nativeIndexed:()=>project(indexedIds()),current:()=>project(old.subtree(0)),bound:()=>{const ids=query(queryInput(subtree(next,0)),filtered(e=>e.visible),sorted(e=>e.title,(a,b)=>a.localeCompare(b)),take(20));return ids.map(id=>({id,title:items.get(id)!.title}));}}};
}
export function scheduling(n=1000) {
  const events=new Map(Array.from({length:n},(_,id)=>[id,{owner:id%3,units:1+(id%2),status:id%5===0?'cancelled':'confirmed'}] as const));
  const times=new Map(Array.from(events.keys(),id=>[id,{start:id*3,end:id*3+(id%7===0?0:8)}] as const));
  const source=from(events),next=temporal(source,(_,id)=>times.get(id)!),old=timeline(events,{time:(_,id)=>times.get(id)!});
  const window={start:0,end:300};
  const intersects=(id:number)=>{const t=times.get(id)!;return t.start<window.end&&(t.start===t.end?t.start>=window.start:t.end>window.start);};
  const finish=(ids:Iterable<number>)=>{const reservations:Reservation[]=[];for(const id of ids){const event=events.get(id)!;if(event.owner===1&&event.status==='confirmed')reservations.push({...times.get(id)!,units:event.units});}return {free:freeSlots(reservations,window),overloaded:overloaded(reservations,window,2),conflicts:conflicts(reservations)};};
  const summarize=(reservations:Reservation[])=>({free:freeSlots(reservations,window),overloaded:overloaded(reservations,window,2),conflicts:conflicts(reservations)});
  return {events,times,source,next,old,window,variants:{native:()=>finish([...events.keys()].filter(intersects)),nativeLoop:()=>{const reservations:Reservation[]=[];for(const[id,event]of events)if(intersects(id)&&event.owner===1&&event.status==='confirmed')reservations.push({...times.get(id)!,units:event.units});return summarize(reservations);},current:()=>finish(old.overlapping(window.start,window.end)),bound:()=>finish(overlapping(next,window)),restricted:()=>summarize(collect(overlapping(next,window),{where:event=>event.owner===1&&event.status==='confirmed',select:(event,id)=>({...times.get(id)!,units:event.units})}))}};
}
export function report(n=1000) {
  const customers=new Map(Array.from({length:100},(_,id)=>[id,{region:id%3,enabled:id%5!==0}] as const));
  const orders=new Map(Array.from({length:n},(_,id)=>[id,{customer:id%110,amount:1+(id%97),paid:id%2===0}] as const));
  const finish=(totals:Map<number,number>)=>[...totals].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,2).map(([region,total])=>({region,total}));
  const variants={
    direct:()=>{const totals=new Map<number,number>();orders.forEach(order=>{const customer=customers.get(order.customer);if(order.paid&&customer?.enabled)totals.set(customer.region,(totals.get(customer.region)??0)+order.amount);});return finish(totals);},
    helpers:()=>{const joined=leftJoin(queryInput(from(orders)),customers,e=>e.customer,(e,match)=>({order:e,customer:match.found?match.value:undefined}));const rows=joined.filter(row=>row.order.paid&&row.customer?.enabled);const totals=aggregateBy(queryInput(from(rows)),row=>row.customer!.region,()=>0,(acc,row)=>acc+row.order.amount);return finish(totals);},
    remeda:()=>{const rows=R.pipe([...orders.values()],R.filter(order=>order.paid),R.map(order=>({order,customer:customers.get(order.customer)})),R.filter(row=>row.customer?.enabled===true));const grouped=R.groupBy(rows,row=>String(row.customer!.region));return finish(new Map(Object.entries(grouped).map(([region,rows])=>[Number(region),R.sumBy(rows,row=>row.order.amount)])));},
    fused:()=>{const rows=query(queryInput(from(orders)),filtered(e=>e.paid),selected(e=>({order:e,customer:customers.get(e.customer)})),filtered(row=>row.customer?.enabled===true));return finish(aggregateBy(queryInput(from(rows)),row=>row.customer!.region,()=>0,(acc,row)=>acc+row.order.amount));},
    restricted:()=>{const rows=collect(from(orders),{where:e=>e.paid&&customers.get(e.customer)?.enabled===true,select:e=>({region:customers.get(e.customer)!.region,amount:e.amount})});return finish(aggregateBy(queryInput(from(rows)),row=>row.region,()=>0,(acc,row)=>acc+row.amount));},
  };return {customers,orders,variants};
}
export function synchronization(n=1000) {
  const before=new Map(Array.from({length:n},(_,id)=>[id,{revision:1,title:`item-${id}`}] as const));
  const after=new Map(Array.from({length:n},(_,i)=>{const id=i+10;return [id,{revision:id%5===0?2:1,title:`item-${id}`}] as const;}));
  const equal=(a:{revision:number;title:string},b:{revision:number;title:string})=>a.revision===b.revision&&a.title===b.title;
  const variants={helpers:()=>diffBy(before,after,equal),native:()=>({added:[...after.keys()].filter(id=>!before.has(id)),removed:[...before.keys()].filter(id=>!after.has(id)),changed:[...after.keys()].filter(id=>before.has(id)&&!equal(before.get(id)!,after.get(id)!))})};return {before,after,variants};
}
// Optional explicit bridge from a legacy method; generic query has no domain registry.
export const legacySelection=<K,E>(storage:ReadonlyMap<K,E>,refs:Iterable<K>)=>subset(from(storage),refs);
