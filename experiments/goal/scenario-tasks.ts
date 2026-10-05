import {DirectedGraph} from 'graphology';
import {topologicalSort} from 'graphology-dag';
import {timeline} from '../../dist/src/timeline.js';
import {from} from './source.ts';
import {dependencies,causesOf,descendants,causalOrder} from './dependencies.ts';
export function tasks(n=1000){
  const entities=new Map(Array.from({length:n},(_,id)=>[String(id),{owner:id%3,status:id%4===0?'done':'pending'}] as const));
  const links=new Map([...entities.keys()].map(id=>[id,Number(id)<2?[]:[String(Math.floor((Number(id)-2)/2))]]));
  const children=new Map<string,string[]>();for(const[id,parents]of links)for(const parent of parents){const siblings=children.get(parent);if(siblings)siblings.push(id);else children.set(parent,[id]);}
  const graph=dependencies(from(entities),(_,id)=>links.get(id)!);
  const old=timeline(entities,{time:(_,id)=>Number(id),causes:(_,id)=>links.get(id)!});
  const foreign=new DirectedGraph();for(const id of entities.keys())foreign.addNode(id);for(const [id,parents]of links)for(const parent of parents)foreign.addDirectedEdge(parent,id);
  const finish=(parents:(id:string)=>readonly string[],effects:()=>string[])=>({ready:[...entities].filter(([id,e])=>e.status==='pending'&&e.owner===1&&parents(id).every(p=>entities.get(p)!.status==='done')).map(([id])=>id),consequences:effects().sort()});
  const nativeDescendants=()=>{const result:string[]=[],seen=new Set(['0']),queue=['0'];for(let i=0;i<queue.length;i++)for(const[id,parents]of links)if(parents.includes(queue[i]!)&&!seen.has(id)){seen.add(id);queue.push(id);result.push(id);}return result;};
  const indexedDescendants=()=>{const result:string[]=[],seen=new Set(['0']),queue=['0'];for(let i=0;i<queue.length;i++)for(const id of children.get(queue[i]!)??[])if(!seen.has(id)){seen.add(id);queue.push(id);result.push(id);}return result;};
  const graphologyDescendants=()=>{const result:string[]=[],seen=new Set(['0']),queue=['0'];for(let i=0;i<queue.length;i++)for(const id of foreign.outNeighbors(queue[i]!))if(!seen.has(id)){seen.add(id);queue.push(id);result.push(id);}return result;};
  return {entities,links,graph,old,foreign,orders:{bound:()=>causalOrder(graph),current:()=>old.causalOrder(),graphology:()=>topologicalSort(foreign)},variants:{nativeScan:()=>finish(id=>links.get(id)!,nativeDescendants),nativeIndexed:()=>finish(id=>links.get(id)!,indexedDescendants),bound:()=>finish(id=>causesOf(graph,id),()=>descendants(graph,'0')),current:()=>finish(id=>old.causesOf(id),()=>old.descendants('0')),graphology:()=>finish(id=>foreign.inNeighbors(id),graphologyDescendants)}};
}
