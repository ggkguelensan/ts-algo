import {entity,sourceContext,subset,type Source} from './source.ts';
import {sorted as cachedSorted} from '../../dist/src/sorted.js';
const state=Symbol('hierarchy');
export interface Hierarchy<R,E,C>{readonly size:number;readonly[state]:{source:Source<R,E,C>;roots:R[];parents:Map<R,R>;children:Map<R,R[]>;positions:Map<R,number>};}
export function hierarchy<R extends NonNullable<unknown>,E,C>(source:Source<R,E,C>,parent:(entity:E,ref:R,context:C)=>R|null|undefined):Hierarchy<R,E,C> {
  const refs=[...source],members=new Set(refs),roots:R[]=[],parents=new Map<R,R>(),children=new Map<R,R[]>(),positions=new Map<R,number>();
  if(members.size!==refs.length)throw new RangeError('Duplicate reference');
  for(const ref of refs){if(ref==null)throw new RangeError('Nullish reference');const p=parent(entity(source,ref),ref,sourceContext(source));let siblings:R[];
    if(p==null)siblings=roots;else{if(!members.has(p))throw new RangeError('Missing parent');parents.set(ref,p);siblings=children.get(p)??[];if(!children.has(p))children.set(p,siblings);}
    positions.set(ref,siblings.length);siblings.push(ref);
  }
  const result={size:refs.length,[state]:{source,roots,parents,children,positions}};
  let visited=0;for(const _ of walk(result,roots))visited++;if(visited!==refs.length)throw new RangeError('Cycle');return result;
}
function* walk<R,E,C>(tree:Hierarchy<R,E,C>,roots:readonly R[]):Generator<R>{const stack=[...roots].reverse();while(stack.length){const ref=stack.pop()!;yield ref;const children=tree[state].children.get(ref);if(children)for(let i=children.length-1;i>=0;i--)stack.push(children[i]!);}}
export function roots<R,E,C>(tree:Hierarchy<R,E,C>):readonly R[]{return tree[state].roots;}
export function children<R,E,C>(tree:Hierarchy<R,E,C>,ref:R):readonly R[]{if(!tree[state].positions.has(ref))throw new RangeError('Missing node');return tree[state].children.get(ref)??[];}
export function nextSibling<R,E,C>(tree:Hierarchy<R,E,C>,ref:R):R|undefined {const data=tree[state],position=data.positions.get(ref);if(position===undefined)throw new RangeError('Missing node');const group=data.parents.has(ref)?data.children.get(data.parents.get(ref)!)!:data.roots;return group[position+1];}
export function previousSibling<R,E,C>(tree:Hierarchy<R,E,C>,ref:R):R|undefined {const data=tree[state],position=data.positions.get(ref);if(position===undefined)throw new RangeError('Missing node');const group=data.parents.has(ref)?data.children.get(data.parents.get(ref)!)!:data.roots;return group[position-1];}
export function subtree<R,E,C>(tree:Hierarchy<R,E,C>,ref:R):Source<R,E,C>{if(!tree[state].positions.has(ref))throw new RangeError('Missing node');return subset(tree[state].source,{[Symbol.iterator]:()=>walk(tree,[ref])});}
export function sortChildren<R,E,S,V>(tree:Hierarchy<R,E,S>,select:(entity:E,ref:R)=>V,compare:(a:V,b:V)=>number):Hierarchy<R,E,S>;
export function sortChildren<R,E,S,V,C>(tree:Hierarchy<R,E,S>,select:(entity:E,ref:R,context:C)=>V,compare:(a:V,b:V)=>number,options:{context:C}):Hierarchy<R,E,S>;
export function sortChildren<R,E,S,V,C>(tree:Hierarchy<R,E,S>,select:(entity:E,ref:R,context:C)=>V,compare:(a:V,b:V)=>number,options?:{context:C}):Hierarchy<R,E,S>{
  const data=tree[state],context=options?.context as C,positions=new Map<R,number>();
  const order=(refs:readonly R[])=>{const result=cachedSorted(refs,ref=>select(entity(data.source,ref),ref,context),compare);result.forEach((ref,i)=>positions.set(ref,i));return result;};
  const roots=order(data.roots),children=new Map<R,R[]>();data.children.forEach((refs,parent)=>children.set(parent,order(refs)));
  return {size:tree.size,[state]:{source:data.source,roots,children,parents:data.parents,positions}};
}
