import assert from 'node:assert/strict';
import {Queue,LinkedList} from 'mnemonist';
import {queue,linkedList,doublyLinkedList,deque} from '../../dist/src/index.js';
import {measure,save} from './measure.ts';
const rows=[];
for(const n of [1000,20000,100000]){
  const values=Array.from({length:n},(_,id)=>id),expected=values.reduce((a,b)=>a+b,0);
  const variants={
    nativeCursor:()=>{const array:(number|undefined)[]=[...values];let total=0;for(let i=0;i<array.length;i++){total+=array[i]!;array[i]=undefined;}return total;},
    queue:()=>{const q=queue(values);let total=0;while(q.size)total+=q.dequeue()!;return total;},
    deque:()=>{const q=deque(values);let total=0;while(q.size)total+=q.popFront()!;return total;},
    linkedList:()=>{const q=linkedList(values);let total=0;while(q.size)total+=q.removeFirst()!;return total;},
    mnemonistQueue:()=>{const q=Queue.from(values);let total=0;while(q.size)total+=q.dequeue()!;return total;},
    mnemonistList:()=>{const q=LinkedList.from(values);let total=0;while(q.size)total+=q.shift()!;return total;},
  };
  for(const run of Object.values(variants))assert.equal(run(),expected);
  rows.push({kind:'build and drain FIFO; clear consumed references',n,timings:measure(variants)});
  const edits={
    nativeBatch:()=>values.filter(id=>id%2!==0),
    handles:()=>{const list=doublyLinkedList<number>(),handles=values.map(id=>list.append(id));for(let i=0;i<n;i+=2)list.remove(handles[i]!);return [...list];},
    mapLinks:()=>{const nodes=new Map(values.map(id=>[id,{value:id,next:id+1<n?id+1:undefined,previous:id>0?id-1:undefined}])),handles=[...nodes.keys()];let head:number|undefined=n?0:undefined;
      // Handles identify occurrences, not values: repeated entity references would still need distinct IDs.
      for(let i=0;i<handles.length;i+=2){const id=handles[i]!,node=nodes.get(id)!;if(node.previous!==undefined)nodes.get(node.previous)!.next=node.next;else head=node.next;if(node.next!==undefined)nodes.get(node.next)!.previous=node.previous;nodes.delete(id);}
      const result:number[]=[];for(let id=head;id!==undefined;id=nodes.get(id)!.next)result.push(nodes.get(id)!.value);return result;},
  };
  const expectedEdits=edits.nativeBatch();for(const run of Object.values(edits))assert.deepEqual(run(),expectedEdits);
  rows.push({kind:'build, remove every other occurrence, traverse',n,notes:'Batch filtering has no stable editable handles. Map draft is local primitive state, omits public ownership/error checks; it is an optimistic reference, not a proposed public list.',timings:measure(Object.fromEntries(Object.entries(edits).map(([name,run])=>[name,()=>run().length])))});
}
for(const width of [20,2000]){
  const waves=100,variants={
    nativeCursor:()=>{let values:(number|undefined)[]=[],head=0,total=0;for(let wave=0;wave<waves;wave++){for(let i=0;i<width;i++)values.push(i);for(let i=0;i<width;i++){total+=values[head]!;values[head++]=undefined;}values=[];head=0;}return total;},
    queue:()=>{const q=queue<number>();let total=0;for(let wave=0;wave<waves;wave++){for(let i=0;i<width;i++)q.enqueue(i);for(let i=0;i<width;i++)total+=q.dequeue()!;}return total;},
    deque:()=>{const q=deque<number>();let total=0;for(let wave=0;wave<waves;wave++){for(let i=0;i<width;i++)q.pushBack(i);for(let i=0;i<width;i++)total+=q.popFront()!;}return total;},
    mnemonistQueue:()=>{const q=new Queue<number>();let total=0;for(let wave=0;wave<waves;wave++){for(let i=0;i<width;i++)q.enqueue(i);for(let i=0;i<width;i++)total+=q.dequeue()!;}return total;},
  };
  const expected=width*(width-1)/2*waves;for(const run of Object.values(variants))assert.equal(run(),expected);
  rows.push({kind:'100 enqueue/drain waves; reused empty collection',width,waves,timings:measure(variants)});
}
save('sequences',rows);
