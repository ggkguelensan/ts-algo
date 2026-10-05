import {test} from 'node:test';
import assert from 'node:assert/strict';
import {catalogue,scheduling,report,synchronization} from './scenarios.ts';
import {tasks} from './scenario-tasks.ts';
import {spatial} from './scenario-spatial.ts';
import {priority} from './scenario-priority.ts';
import {hierarchy,roots,children,nextSibling,subtree} from './hierarchy.ts';
import {from,entity} from './source.ts';
import {queryInput} from './query.ts';
import {find,some,every,count,groupBy,aggregateBy,reduce,distinctBy,leftJoin,innerJoinMany} from './operators.ts';
import {indexBy,diffBy} from './diff.ts';
import {freeSlots,overloaded,conflicts,type Span} from './ranges.ts';
import {dependencies} from './dependencies.ts';
import {random} from './measure.ts';

test('catalogue: independent topology, roots, siblings, subtree and projections',()=>{
  const scene=catalogue(10),expected=[{id:4,title:'item-00000006'},{id:2,title:'item-00000008'},{id:0,title:'item-00000010'}];
  for(const run of Object.values(scene.variants))assert.deepEqual(run(),expected);
  assert.deepEqual(roots(scene.next),[0,1]);assert.deepEqual(children(scene.next,0),[2,3,4,5]);assert.equal(nextSibling(scene.next,2),3);
  const second=hierarchy(from(scene.items),()=>null);assert.equal(children(second,0).length,0);
  scene.items.set(0,{title:'item-new',price:0,visible:true});assert.equal(entity(subtree(scene.next,0),0).title,'item-new');assert.equal(scene.old.get(0)!.title,'item-00000010');
  assert.throws(()=>hierarchy(from(new Map([[1,{}],[2,{}]])),(_,id)=>id===1?2:1),/Cycle/);
  assert.throws(()=>hierarchy(from(new Map([[1,{}]])),()=>2),/Missing parent/);
});
test('schedule: independent store, point events, capacity and conflicts',()=>{
  const scene=scheduling(1000),expected=scene.variants.native();for(const run of Object.values(scene.variants))assert.deepEqual(run(),expected);
  const bookings=[{start:0,end:10,units:2},{start:5,end:15,units:2},{start:15,end:20,units:1},{start:7,end:7,units:10}];
  assert.deepEqual(freeSlots(bookings,{start:0,end:25}),[{start:20,end:25}]);
  assert.deepEqual(overloaded(bookings,{start:0,end:25},3),[{start:5,end:10}]);
  assert.deepEqual(conflicts(bookings),[[0,1]]);
});
test('range algorithms against independently sampled segments and all pairs',()=>{
  const rand=random(321);
  for(let round=0;round<100;round++){
    const items=Array.from({length:20},()=>{const start=Math.floor(rand()*20);return {start,end:start+Math.floor(rand()*8),units:1+Math.floor(rand()*3)};});
    const window={start:0,end:25},edges=[...new Set([0,25,...items.flatMap(e=>[Math.max(0,Math.min(25,e.start)),Math.max(0,Math.min(25,e.end))])])].sort((a,b)=>a-b);
    const segments=(predicate:(load:number)=>boolean)=>{const result:Span[]=[];for(let i=0;i<edges.length-1;i++){const a=edges[i]!,b=edges[i+1]!,middle=(a+b)/2,load=items.reduce((sum,e)=>sum+(e.start<=middle&&e.end>middle?e.units:0),0);if(predicate(load)){const last=result.at(-1);if(last?.end===a)result[result.length-1]={start:last.start,end:b};else result.push({start:a,end:b});}}return result;};
    assert.deepEqual(freeSlots(items,window),segments(load=>load===0));assert.deepEqual(overloaded(items,window,3),segments(load=>load>3));
    const pairs=[];for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){const a=items[i]!,b=items[j]!;if(a.start<a.end&&b.start<b.end&&a.start<b.end&&b.start<a.end)pairs.push([i,j]);}assert.deepEqual(conflicts(items),pairs);
  }
  assert.throws(()=>freeSlots([],{start:2,end:1}),/Invalid/);assert.throws(()=>overloaded([],{start:0,end:1},NaN),/Invalid/);
});
test('tasks: business owner, dependencies, ready work and change consequences',()=>{
  const scene=tasks(8),expected={ready:['1'],consequences:['2','3','6','7']};for(const run of Object.values(scene.variants))assert.deepEqual(run(),expected);
  for(const run of Object.values(scene.orders)){const order=run(),positions=new Map(order.map((id,i)=>[id,i]));assert.equal(positions.size,scene.entities.size);for(const[id,parents]of scene.links)for(const parent of parents)assert(positions.get(parent)!<positions.get(id)!);}
  assert.throws(()=>dependencies(from(['a','b']),(_,id)=>id==='a'?['b']:['a']),/Cycle/);
  assert.throws(()=>dependencies(from(['a']),()=>['missing']),/Missing/);
});
test('report: external lookup, missing customers, grouped aggregates and ranking',()=>{
  const scene=report(1000),expected=scene.variants.direct();for(const run of Object.values(scene.variants))assert.deepEqual(run(),expected);
  assert.equal(expected.length,2);assert(expected[0]!.total>=expected[1]!.total);
  const small=report(4);assert.deepEqual(small.variants.direct(),[{region:2,total:3}]);
});
test('synchronization: stable keys, structural comparison, duplicates and undefined',()=>{
  const scene=synchronization(100),expected=scene.variants.native();for(const run of Object.values(scene.variants))assert.deepEqual(run(),expected);assert.deepEqual(expected.removed,Array.from({length:10},(_,i)=>i));assert.equal(expected.added.length,10);
  assert.throws(()=>indexBy([{id:1},{id:1}],e=>e.id),/Duplicate/);
  assert.deepEqual(diffBy(new Map([[1,undefined]]),new Map([[1,undefined],[2,undefined]]),(a,b)=>a===b),{added:[2],removed:[],changed:[]});
});
test('spatial: same entities, inclusive areas, nearest ties, projection across indices',()=>{
  for(const shape of ['uniform','clustered','coincident']){
    const scene=spatial(300,shape);
    for(const [x,y,width]of [[0,0,20],[40,40,20],[0,0,1000],[50,50,0]]){const bounds={id:-1,x:0,y:0,minX:x!,minY:y!,maxX:x!+width!,maxY:y!+width!};const expected=scene.within.native(bounds).sort((a,b)=>a-b);for(const run of Object.values(scene.within))assert.deepEqual(run(bounds).sort((a,b)=>a-b),expected);for(const run of Object.values(scene.within))assert.deepEqual(scene.finish(run(bounds)),scene.finish(expected));}
    for(const [x,y,r]of [[25,25,100],[50,50,0],[50,50,1],[2000,2000,1]]){const expected=scene.nearest.native(x!,y!,r!);for(const[name,run]of Object.entries(scene.nearest)){const actual=run(x!,y!,r!);assert.equal(actual,expected,`${shape}/${name}/${r}`);assert.deepEqual(scene.finish(actual===undefined?[]:[actual]),scene.finish(expected===undefined?[]:[expected]));}}
  }
});
test('priority: immutable jobs, deadline changes, cancellation and stable ties',()=>{
  for(const n of [0,1,100,1000]){const scene=priority(n),expected=scene.variants.sortedArray();assert.deepEqual(scene.variants.mnemonistHeap(),expected);assert.equal(new Set(expected).size,expected.length);for(const id of expected)assert(!scene.operations.some(op=>op.id===id&&id%7===0));}
});
test('standalone operators: early stop, identity, undefined, aggregation and joins',()=>{
  const source=queryInput(from(new Map([[undefined,{group:'a',amount:2}],[1,{group:'a',amount:3}],[2,{group:'b',amount:4}]])));
  assert.deepEqual(find(source,e=>e.amount===2),{found:true,value:undefined});assert.deepEqual(find(source,e=>e.amount===0),{found:false});
  assert.equal(some(source,e=>e.amount>3),true);assert.equal(every(source,e=>e.amount>0),true);assert.equal(count(source),3);
  assert.deepEqual(groupBy(source,e=>e.group),new Map([['a',[undefined,1]],['b',[2]]]));assert.deepEqual(aggregateBy(source,e=>e.group,()=>0,(sum,e)=>sum+e.amount),new Map([['a',5],['b',4]]));assert.equal(reduce(source,0,(sum,e)=>sum+e.amount),9);assert.deepEqual(distinctBy(source,e=>e.group),[undefined,2]);
  const left=queryInput(from([{id:1},{id:2}]));assert.deepEqual(leftJoin(left,new Map([[1,undefined]]),e=>e.id,(_,match)=>match.found),[true,false]);
  assert.deepEqual(innerJoinMany(left,new Map([[1,['a','b']]]),e=>e.id,(e,v)=>[e.id,v]),[[1,'a'],[1,'b']]);
});
