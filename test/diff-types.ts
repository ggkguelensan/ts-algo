import {indexBy,diffBy,type Difference} from "../src/diff/index.js";
import type {Brand} from "../src/index.js";
type Equal<A,B>=(<T>()=>T extends A?1:2)extends(<T>()=>T extends B?1:2)?true:false;type Assert<T extends true>=T;
type Id=Brand<string,"Id">;declare const items:readonly {id:Id;revision:number}[];
const indexed=indexBy(items,e=>e.id);type Indexed=Assert<Equal<typeof indexed,Map<Id,{id:Id;revision:number}>>>;
const diff=diffBy(indexed,indexed,(a,b,_,ctx)=>Math.abs(a.revision-b.revision)<=ctx.tolerance,{context:{tolerance:1}});type Diff=Assert<Equal<typeof diff,Difference<Id>>>;
// @ts-expect-error operation context is required by this callback.
indexBy(items,(e,ctx:{prefix:string})=>ctx.prefix+e.id);
// @ts-expect-error equality callback must return boolean.
diffBy(indexed,indexed,(a,b)=>a.revision-b.revision);
// @ts-expect-error context is explicit, not inferred from a hidden source.
diffBy(indexed,indexed,(a,b,id,ctx:{tolerance:number})=>ctx.tolerance>0);
