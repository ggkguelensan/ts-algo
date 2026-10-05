import {sorted as nativeSorted} from '../../dist/src/sorted.js';
import {entity,type Source} from './source.ts';

/** Experimental overload bridge: reuse the public cached native sorting algorithm. */
export function sorted<R,E,S,V>(source:Source<R,E,S>,select:(entity:E,ref:R)=>V,compare:(a:V,b:V)=>number):R[];
export function sorted<R,E,S,V,C>(source:Source<R,E,S>,select:(entity:E,ref:R,context:C)=>V,compare:(a:V,b:V)=>number,options:{context:C}):R[];
export function sorted<R,E,S,V,C>(source:Source<R,E,S>,select:(entity:E,ref:R,context:C)=>V,compare:(a:V,b:V)=>number,options?:{context:C}):R[]{
  // The two-argument callback overload does not observe the absent query context.
  const context=options?.context as C;
  return nativeSorted(source,ref=>select(entity(source,ref),ref,context),compare);
}
