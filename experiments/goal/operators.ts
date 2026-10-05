import {resolve,queryContext,type Input} from './query.ts';
type Callback<R,E,C,V>=(entity:E,ref:R,context:C)=>V;
export type Found<T>={readonly found:false}|{readonly found:true;readonly value:T};
export function find<R,E,C>(source:Input<R,E,C>,predicate:Callback<R,E,C,boolean>):Found<R> {
  for(const ref of source)if(predicate(resolve(source,ref),ref,queryContext(source)))return {found:true,value:ref};
  return {found:false};
}
export function some<R,E,C>(source:Input<R,E,C>,predicate:Callback<R,E,C,boolean>):boolean {
  return find(source,predicate).found;
}
export function every<R,E,C>(source:Input<R,E,C>,predicate:Callback<R,E,C,boolean>):boolean {
  for(const ref of source)if(!predicate(resolve(source,ref),ref,queryContext(source)))return false;
  return true;
}
export function count<R,E,C>(source:Input<R,E,C>):number {let n=0;for(const _ of source)n++;return n;}
export function groupBy<R,E,C,K>(source:Input<R,E,C>,key:Callback<R,E,C,K>):Map<K,R[]> {
  const result=new Map<K,R[]>(),ctx=queryContext(source);
  for(const ref of source){const group=key(resolve(source,ref),ref,ctx);let refs=result.get(group);if(!refs){refs=[];result.set(group,refs);}refs.push(ref);}return result;
}
export function aggregateBy<R,E,C,K,A>(source:Input<R,E,C>,key:Callback<R,E,C,K>,initial:()=>A,step:(acc:A,entity:E,ref:R,context:C)=>A):Map<K,A> {
  const result=new Map<K,A>(),ctx=queryContext(source);
  for(const ref of source){const entity=resolve(source,ref),group=key(entity,ref,ctx);const acc=result.has(group)?result.get(group)!:initial();result.set(group,step(acc,entity,ref,ctx));}return result;
}
export function reduce<R,E,C,A>(source:Input<R,E,C>,initial:A,step:(acc:A,entity:E,ref:R,context:C)=>A):A {
  let acc=initial;for(const ref of source)acc=step(acc,resolve(source,ref),ref,queryContext(source));return acc;
}
export function distinctBy<R,E,C,K>(source:Input<R,E,C>,key:Callback<R,E,C,K>):R[] {
  const seen=new Set<K>(),result:R[]=[];for(const ref of source){const value=key(resolve(source,ref),ref,queryContext(source));if(!seen.has(value)){seen.add(value);result.push(ref);}}return result;
}
export function leftJoin<R,E,C,K,V,O>(source:Input<R,E,C>,right:ReadonlyMap<K,V>,key:Callback<R,E,C,K>,select:(left:E,right:Found<V>,ref:R,context:C)=>O):O[] {
  const result:O[]=[],ctx=queryContext(source);
  for(const ref of source){const left=resolve(source,ref),id=key(left,ref,ctx),value=right.get(id);const match:Found<V>=value!==undefined||right.has(id)?{found:true,value:value as V}:{found:false};result.push(select(left,match,ref,ctx));}return result;
}
export function innerJoinMany<R,E,C,K,V,O>(source:Input<R,E,C>,right:ReadonlyMap<K,readonly V[]>,key:Callback<R,E,C,K>,select:(left:E,right:V,ref:R,context:C)=>O):O[] {
  const result:O[]=[],ctx=queryContext(source);
  for(const ref of source){const left=resolve(source,ref),matches=right.get(key(left,ref,ctx));if(matches)for(const right of matches)result.push(select(left,right,ref,ctx));}return result;
}
