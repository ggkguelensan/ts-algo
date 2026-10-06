import {from,collect,sorted,type Brand,type Source} from "../src/index.js";
import {tree,subtree,children,sortChildren,type Tree} from "../src/tree/index.js";
import {dependencies,descendants,ancestors,causalOrder,type Dependencies} from "../src/dependencies/index.js";
type Equal<A,B>=(<T>()=>T extends A?1:2)extends(<T>()=>T extends B?1:2)?true:false;type Assert<T extends true>=T;
type Id=Brand<string,"Id">;declare const store:ReadonlyMap<Id,{title:string}>;
const forest=tree(from(store),()=>null);type Forest=Assert<Equal<typeof forest,Tree<Id,{title:string}>>>;
declare const id:Id;
const selected=subtree(forest,id);type Selected=Assert<Equal<typeof selected,Source<Id,{title:string}>>>;
const flat=sorted(forest,e=>e.title,(a,b)=>a.localeCompare(b));type Flat=Assert<Equal<typeof flat,Id[]>>;
const reordered=sortChildren(forest,(e,_,ctx)=>e.title+ctx.suffix,(a,b)=>a.localeCompare(b),{context:{suffix:"!"}});type Reordered=Assert<Equal<typeof reordered,typeof forest>>;
const graph=dependencies(from(store),()=>[]);type Graph=Assert<Equal<typeof graph,Dependencies<Id,{title:string}>>>;
const ordered=collect(causalOrder(graph));type Ordered=Assert<Equal<typeof ordered,Id[]>>;
const rows=collect(descendants(graph,id),{select:(e,id)=>({id,title:e.title})});type Rows=Assert<Equal<typeof rows,{id:Id;title:string}[]>>;
const context:{title:string;parent:number|undefined}={title:"A",parent:undefined};
const external=from([1],{context,get:(_,ctx)=>({title:ctx.title})});
tree(external,(e,id,ctx)=>ctx.parent);dependencies(external,(e,id,ctx)=>ctx.parent===undefined?[]:[ctx.parent]);
// @ts-expect-error entity has no parent field; metadata is independent.
tree(from(store),e=>e.parentId);
// @ts-expect-error nullish refs are reserved for absent parents.
tree(from([undefined]),()=>null);
// @ts-expect-error callbacks requiring operation context must receive options.
sortChildren(forest,(e,id,ctx:{suffix:string})=>e.title+ctx.suffix,(a,b)=>a.localeCompare(b));
// @ts-expect-error graph links preserve the branded ref type.
dependencies(from(store),()=>[1]);
// @ts-expect-error selected graph entities are not IDs.
sorted(graph,(id:Id)=>id,(a,b)=>a.localeCompare(b));
// @ts-expect-error functions replace custom collection methods.
forest.children(id);
// @ts-expect-error returned relationship view cannot be mutated.
children(forest,id).push(id);
ancestors(graph,id);
