export function indexBy<E,K>(items:Iterable<E>,key:(entity:E)=>K):Map<K,E> {
  const result=new Map<K,E>();for(const entity of items){const id=key(entity);if(result.has(id))throw new RangeError('Duplicate key');result.set(id,entity);}return result;
}
export function diffBy<K,E>(before:ReadonlyMap<K,E>,after:ReadonlyMap<K,E>,equal:(before:E,after:E,key:K)=>boolean):{added:K[];removed:K[];changed:K[]} {
  const added:K[]=[],removed:K[]=[],changed:K[]=[];
  after.forEach((entity,key)=>{const previous=before.get(key);if(previous===undefined&&!before.has(key))added.push(key);else if(!equal(previous as E,entity,key))changed.push(key);});
  before.forEach((_,key)=>{if(!after.has(key))removed.push(key);});return {added,removed,changed};
}
