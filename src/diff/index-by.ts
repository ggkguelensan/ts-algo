/** Values -> unique keyed Map; duplicate keys are an error. No value copies. */
export function indexBy<E,K>(items:Iterable<E>,key:(entity:E)=>K):Map<K,E>;
export function indexBy<E,K,C>(items:Iterable<E>,key:(entity:E,context:C)=>K,options:{context:C}):Map<K,E>;
export function indexBy<E,K,C>(items:Iterable<E>,key:(entity:E,context:C)=>K,options?:{context:C}):Map<K,E>{
  const context=options?.context as C,result=new Map<K,E>();
  for(const item of items){const id=key(item,context);if(result.has(id))throw new RangeError("Duplicate key");result.set(id,item);}
  return result;
}
