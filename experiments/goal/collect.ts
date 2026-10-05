import {entity,type Source} from './source.ts';
type Predicate<R,E,C>=(entity:E,ref:R,context:C)=>boolean;
type Select<R,E,C,V>=(entity:E,ref:R,context:C)=>V;
type Options<R,E,C>={where?:Predicate<R,E,C>;limit?:number;context?:C}&(undefined extends C?{}:{context:C});
export function collect<R,E,S,N extends E,V,C=undefined>(source:Source<R,E,S>,options:Omit<Options<R,E,C>,'where'>&{where:(entity:E,ref:R,context:C)=>entity is N;select:Select<R,N,C,V>}):V[];
export function collect<R,E,S,V,C=undefined>(source:Source<R,E,S>,options:Options<R,E,C>&{select:Select<R,E,C,V>}):V[];
export function collect<R,E,S,C=undefined>(source:Source<R,E,S>,options?:Options<R,E,C>):R[];
export function collect<R,E,S,V,C>(source:Source<R,E,S>,options:{where?:Predicate<R,E,C>;limit?:number;context?:C;select?:Select<R,E,C,V>}={}):(R|V)[]{
  const {where,select,limit=Infinity,context}=options;
  if(limit!==Infinity&&(!Number.isSafeInteger(limit)||limit<0))throw new RangeError('Invalid limit');
  const result:(R|V)[]=[];if(limit===0)return result;
  for(const ref of source){
    if(!where&&!select){result.push(ref);}else{
      const value=entity(source,ref);
      // An omitted query context is undefined; callers requiring one supply it explicitly.
      if(where&&!where(value,ref,context as C))continue;
      result.push(select?select(value,ref,context as C):ref);
    }
    if(result.length===limit)break;
  }
  return result;
}
