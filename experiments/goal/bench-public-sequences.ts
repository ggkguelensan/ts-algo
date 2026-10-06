import assert from 'node:assert/strict';
import {Queue,LinkedList} from 'mnemonist';
import {queue,enqueue,dequeue} from '../../dist/src/queue/index.js';
import {deque,pushBack,popFront} from '../../dist/src/deque/index.js';
import {linkedList,doublyLinkedList,append,remove,removeFirst} from '../../dist/src/lists/index.js';
import {queue as oldQueue} from '../../dist/references/legacy-queue.js';
import {deque as oldDeque} from '../../dist/references/legacy-deque.js';
import {linkedList as oldSingle} from '../../dist/references/legacy-linked-list.js';
import {doublyLinkedList as oldDouble} from '../../dist/references/legacy-doubly-linked-list.js';
import {diffBy} from '../../dist/src/diff/index.js';
import {diffBy as prototypeDiff} from './diff.ts';
import {measure,save} from './measure.ts';
const rows=[];
for(const n of [1000,20000,100000]){
  const values=Array.from({length:n},(_,i)=>i),expected=n*(n-1)/2;
  const variants={nativeCursor:()=>{const a:(number|undefined)[]=[...values];let sum=0;for(let i=0;i<a.length;i++){sum+=a[i]!;a[i]=undefined;}return sum;},publicQueue:()=>{const q=queue(values);let sum=0;while(q.size)sum+=dequeue(q)!;return sum;},legacyQueue:()=>{const q=oldQueue(values);let sum=0;while(q.size)sum+=q.dequeue()!;return sum;},publicDeque:()=>{const q=deque(values);let sum=0;while(q.size)sum+=popFront(q)!;return sum;},legacyDeque:()=>{const q=oldDeque(values);let sum=0;while(q.size)sum+=q.popFront()!;return sum;},publicSingle:()=>{const q=linkedList(values);let sum=0;while(q.size)sum+=removeFirst(q)!;return sum;},legacySingle:()=>{const q=oldSingle(values);let sum=0;while(q.size)sum+=q.removeFirst()!;return sum;},mnemonistQueue:()=>{const q=Queue.from(values);let sum=0;while(q.size)sum+=q.dequeue()!;return sum;},mnemonistList:()=>{const q=LinkedList.from(values);let sum=0;while(q.size)sum+=q.shift()!;return sum;}};
  for(const run of Object.values(variants))assert.equal(run(),expected);
  rows.push({n,kind:'build and drain FIFO; preserve original references and release consumed slots',timings:measure(variants)});
  const edited=values.filter((_,i)=>i%2===1),edits={nativeBatch:()=>values.filter((_,i)=>i%2===1),publicHandles:()=>{const list=doublyLinkedList<number>(),handles=values.map(v=>append(list,v));for(let i=0;i<handles.length;i+=2)remove(list,handles[i]!);return [...list];},legacyHandles:()=>{const list=oldDouble<number>(),handles=values.map(v=>list.append(v));for(let i=0;i<handles.length;i+=2)list.remove(handles[i]!);return [...list];}};
  for(const run of Object.values(edits))assert.deepEqual(run(),edited);rows.push({n,kind:'build handles and remove alternate positions; native batch has no handle contract',timings:measure(Object.fromEntries(Object.entries(edits).map(([name,run])=>[name,()=>run().length])))});
  const before=new Map(values.map(id=>[id,{revision:1}])),after=new Map(values.map(i=>[i+10,{revision:i%5===0?2:1}]));
  const equal=(a:{revision:number},b:{revision:number})=>a.revision===b.revision;
  const diffs={public:()=>diffBy(before,after,equal),prototype:()=>prototypeDiff(before,after,equal),nativeLoop:()=>{const added:number[]=[],changed:number[]=[],removed:number[]=[];for(const[id,value]of after){const old=before.get(id);if(old===undefined&&!before.has(id))added.push(id);else if(!equal(old!,value))changed.push(id);}for(const id of before.keys())if(!after.has(id))removed.push(id);return {added,removed,changed};}};
  const expectedDiff=diffs.nativeLoop();for(const run of Object.values(diffs))assert.deepEqual(run(),expectedDiff);rows.push({n,kind:'full synchronization with stable keys and custom content equality',timings:measure(Object.fromEntries(Object.entries(diffs).map(([name,run])=>[name,()=>{const result=run();return result.added.length+result.removed.length+result.changed.length;}])))});
}
for(const width of [20,2000]){
  const variants={publicQueue:()=>{const q=queue<number>();let total=0;for(let w=0;w<100;w++){for(let i=0;i<width;i++)enqueue(q,i);while(q.size)total+=dequeue(q)!;}return total;},legacyQueue:()=>{const q=oldQueue<number>();let total=0;for(let w=0;w<100;w++){for(let i=0;i<width;i++)q.enqueue(i);while(q.size)total+=q.dequeue()!;}return total;},publicDeque:()=>{const q=deque<number>();let total=0;for(let w=0;w<100;w++){for(let i=0;i<width;i++)pushBack(q,i);while(q.size)total+=popFront(q)!;}return total;}};
  const expected=width*(width-1)/2*100;for(const run of Object.values(variants))assert.equal(run(),expected);rows.push({width,kind:'100 enqueue/drain waves on reused empty collection',timings:measure(variants)});
}
save('migration-sequences',rows);
