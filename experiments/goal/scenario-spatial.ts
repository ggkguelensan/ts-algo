import KDBush from 'kdbush';
import Flatbush from 'flatbush';
import RBush from 'rbush';
import {quadtree} from 'd3-quadtree';
import {pointIndex} from '../../dist/src/point-index.js';
import {from,subset} from './source.ts';
import {query,queryInput,filtered,selected} from './query.ts';
import {random} from './measure.ts';
export type Point={id:number;x:number;y:number;minX:number;minY:number;maxX:number;maxY:number};
export function spatial(n=1000,shape='uniform'){
  const rand=random(),points:Point[]=Array.from({length:n},(_,id)=>{const x=shape==='coincident'?50:rand()*(shape==='clustered'?10:1000),y=shape==='coincident'?50:rand()*(shape==='clustered'?10:1000);return {id,x,y,minX:x,minY:y,maxX:x,maxY:y};});
  const entities=new Map(points.map(p=>[p.id,{enabled:p.id%2===0,title:`point-${p.id}`} ]));
  const makeCurrent=()=>pointIndex(entities,{x:(_,id)=>points[id]!.x,y:(_,id)=>points[id]!.y});
  const makeKd=()=>{const index=new KDBush(n);for(const p of points)index.add(p.x,p.y);index.finish();return index;};
  const makeFlat=()=>{const index=new Flatbush(n);for(const p of points)index.add(p.x,p.y,p.x,p.y);index.finish();return index;};
  const makeRb=()=>new RBush<Point>().load(points);
  const makeD3=()=>quadtree<Point>().x(p=>p.x).y(p=>p.y).addAll(points);
  const current=makeCurrent(),kd=makeKd(),flat=makeFlat(),rb=makeRb(),d3=makeD3();
  const finish=(ids:Iterable<number>)=>query(queryInput(subset(from(entities),ids)),filtered(e=>e.enabled),selected((e,id)=>({id,title:e.title}))).sort((a,b)=>a.id-b.id);
  const contains=(p:Point,b:{minX:number;minY:number;maxX:number;maxY:number})=>p.x>=b.minX&&p.x<=b.maxX&&p.y>=b.minY&&p.y<=b.maxY;
  const within={native:(b:Point)=>points.filter(p=>contains(p,b)).map(p=>p.id),nativeLoop:(b:Point)=>{const ids:number[]=[];for(const p of points)if(contains(p,b))ids.push(p.id);return ids;},current:(b:Point)=>current.within(b),kdbush:(b:Point)=>kd.range(b.minX,b.minY,b.maxX,b.maxY),flatbush:(b:Point)=>flat.search(b.minX,b.minY,b.maxX,b.maxY),rbush:(b:Point)=>rb.search(b).map(p=>p.id),d3:(b:Point)=>{const ids:number[]=[];d3.visit((node,x0,y0,x1,y1)=>{if(x0>b.maxX||y0>b.maxY||x1<b.minX||y1<b.minY)return true;if(!node.length){let leaf:typeof node|undefined=node;while(leaf){if(contains(leaf.data,b))ids.push(leaf.data.id);leaf=leaf.next;}}return false;});return ids;}};
  const closest=(ids:Iterable<number>,x:number,y:number,radius:number)=>{let best=radius,id:number|undefined;for(const i of ids){const p=points[i]!,d=Math.hypot(p.x-x,p.y-y);if(d<=best&&(id===undefined||d<best||i<id)){best=d;id=i;}}return id;};
  const nearest={native:(x:number,y:number,r:number)=>closest(points.keys(),x,y,r),current:(x:number,y:number,r:number)=>current.nearest(x,y,r)?.reference,kdbush:(x:number,y:number,r:number)=>closest(kd.within(x,y,r),x,y,r),flatbush:(x:number,y:number,r:number)=>closest(flat.search(x-r,y-r,x+r,y+r),x,y,r),rbush:(x:number,y:number,r:number)=>closest(rb.search({minX:x-r,minY:y-r,maxX:x+r,maxY:y+r}).map(p=>p.id),x,y,r),d3:(x:number,y:number,r:number)=>{const p=d3.find(x,y,r),distance=p?Math.hypot(p.x-x,p.y-y):r;const d=distance+Number.EPSILON*Math.max(1,Math.abs(x),Math.abs(y),distance)*4;return closest(within.d3({id:-1,x:0,y:0,minX:x-d,minY:y-d,maxX:x+d,maxY:y+d}),x,y,r);}};
  return {points,entities,current,builds:{current:makeCurrent,kdbush:makeKd,flatbush:makeFlat,rbush:makeRb,d3:makeD3},within,nearest,finish};
}
