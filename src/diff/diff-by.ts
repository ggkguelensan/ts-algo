export interface Difference<K>{readonly added:K[];readonly removed:K[];readonly changed:K[];}
export function diffBy<K,Before,After>(before:ReadonlyMap<K,Before>,after:ReadonlyMap<K,After>,equal:(before:Before,after:After,key:K)=>boolean):Difference<K>;
export function diffBy<K,Before,After,C>(before:ReadonlyMap<K,Before>,after:ReadonlyMap<K,After>,equal:(before:Before,after:After,key:K,context:C)=>boolean,options:{context:C}):Difference<K>;
/** added/changed follow after order, removed follows before order. Present undefined is valid. */
export function diffBy<K,Before,After,C>(before:ReadonlyMap<K,Before>,after:ReadonlyMap<K,After>,equal:(before:Before,after:After,key:K,context:C)=>boolean,options?:{context:C}):Difference<K>{
  const context=options?.context as C,added:K[]=[],removed:K[]=[],changed:K[]=[];
  after.forEach((entity,key)=>{const previous=before.get(key);if(previous===undefined&&!before.has(key))added.push(key);else if(!equal(previous as Before,entity,key,context))changed.push(key);});
  before.forEach((_,key)=>{if(!after.has(key))removed.push(key);});return {added,removed,changed};
}
