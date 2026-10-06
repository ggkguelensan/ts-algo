import {from,collect,sorted,type Brand,type Source} from "../src/index.js";
import {pointIndex,within,nearest,type PointIndex,type Nearest} from "../src/spatial/index.js";
type Equal<A,B>=(<T>()=>T extends A?1:2)extends(<T>()=>T extends B?1:2)?true:false;type Assert<T extends true>=T;
type Id=Brand<string,"Id">;declare const store:ReadonlyMap<Id,{title:string}>;
const index=pointIndex(from(store),{x:()=>0,y:()=>0});type Index=Assert<Equal<typeof index,PointIndex<Id,{title:string}>>>;
const selection=within(index,{minX:0,minY:0,maxX:1,maxY:1});type Selection=Assert<Equal<typeof selection,Source<Id,{title:string}>>>;
const hit=nearest(index,0,0);type Hit=Assert<Equal<typeof hit,Nearest<Id>|undefined>>;
const order=sorted(index,e=>e.title,(a,b)=>a.localeCompare(b));type Order=Assert<Equal<typeof order,Id[]>>;
const rows=collect(selection,{select:(e,id)=>({id,title:e.title})});type Rows=Assert<Equal<typeof rows,{id:Id;title:string}[]>>;
const external=from([1],{context:{x:3},get:()=>({title:"A"})});pointIndex(external,{x:(e,id,ctx)=>ctx.x,y:()=>0});
// @ts-expect-error coordinates belong to metadata, not mandatory entity fields.
pointIndex(from(store),{x:e=>e.x,y:()=>0});
// @ts-expect-error coordinate selectors return numbers.
pointIndex(from(store),{x:e=>e.title,y:()=>0});
// @ts-expect-error queries are functions, not custom methods.
index.within({minX:0,minY:0,maxX:1,maxY:1});
// @ts-expect-error entity selector cannot silently fall back to ref selection.
sorted(index,(id:Id)=>id,(a,b)=>a.localeCompare(b));
