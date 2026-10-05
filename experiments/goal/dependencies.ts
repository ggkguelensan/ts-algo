import {entity,sourceContext,type Source} from './source.ts';
const state=Symbol('dependencies');
export interface Dependencies<R>{readonly size:number;readonly[state]:{refs:R[];causes:Map<R,R[]>;effects:Map<R,R[]>};}
export function dependencies<R,E,C>(source:Source<R,E,C>,causes:(entity:E,ref:R,context:C)=>Iterable<R>):Dependencies<R>{
  const refs=[...source],members=new Set(refs),incoming=new Map<R,R[]>(),outgoing=new Map<R,R[]>();
  if(members.size!==refs.length)throw new RangeError('Duplicate reference');
  for(const ref of refs){const parents=[...new Set(causes(entity(source,ref),ref,sourceContext(source)))];for(const cause of parents){if(!members.has(cause))throw new RangeError('Missing cause');const effects=outgoing.get(cause)??[];effects.push(ref);outgoing.set(cause,effects);}incoming.set(ref,parents);}
  const graph={size:refs.length,[state]:{refs,causes:incoming,effects:outgoing}};
  causalOrder(graph);return graph;
}
export function causesOf<R>(graph:Dependencies<R>,ref:R):readonly R[]{const causes=graph[state].causes.get(ref);if(!causes)throw new RangeError('Missing node');return causes;}
export function causalOrder<R>(graph:Dependencies<R>):R[]{
  const data=graph[state],pending=new Map<R,number>(),result:R[]=[];
  for(const ref of data.refs){const n=data.causes.get(ref)!.length;pending.set(ref,n);if(n===0)result.push(ref);}
  for(let i=0;i<result.length;i++)for(const ref of data.effects.get(result[i]!)??[]){const n=pending.get(ref)!-1;pending.set(ref,n);if(n===0)result.push(ref);}
  if(result.length!==data.refs.length)throw new RangeError('Cycle');return result;
}
export function descendants<R>(graph:Dependencies<R>,ref:R):R[]{
  causesOf(graph,ref);const seen=new Set<R>([ref]),result:R[]=[],queue=[ref];
  for(let i=0;i<queue.length;i++)for(const child of graph[state].effects.get(queue[i]!)??[])if(!seen.has(child)){seen.add(child);result.push(child);queue.push(child);}return result;
}
