import assert from "node:assert/strict";
import test from "node:test";
import {from,collect,sorted} from "../src/index.js";
import {queue,enqueue,dequeue,peek,clear as clearQueue} from "../src/queue/index.js";
import {deque,pushFront,pushBack,popFront,popBack,peekFront,peekBack,clear as clearDeque} from "../src/deque/index.js";
import {linkedList,doublyLinkedList,append,prepend,insertAfter,insertBefore,remove,removeAfter,removeFirst,removeLast,clear as clearList,type DoublyLinkedNode} from "../src/lists/index.js";

test("queue operators preserve FIFO, identity, undefined, compaction and live iteration",()=>{
  const value=Object.freeze({rank:3}),q=queue([value]);assert.equal(peek(q),value);assert.equal(dequeue(q),value);
  const refs=queue<number|undefined>();for(let i=0;i<6000;i++)enqueue(refs,i);
  for(let i=0;i<5000;i++)assert.equal(dequeue(refs),i);assert.equal(refs.size,1000);
  assert.deepEqual(collect(from(refs)),Array.from({length:1000},(_,i)=>i+5000));
  clearQueue(refs);enqueue(refs,undefined);assert.equal(refs.size,1);assert.equal(dequeue(refs),undefined);assert.equal(refs.size,0);assert.equal(dequeue(refs),undefined);
  enqueue(refs,2);enqueue(refs,1);assert.deepEqual(sorted(refs,e=>e??0,(a,b)=>a-b),[1,2]);
  assert.equal("enqueue"in refs,false);
});

test("deque differential end operations across wrapping, growth and clear",()=>{
  const q=deque<number|undefined>(),oracle:(number|undefined)[]=[];let seed=333;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  for(let i=0;i<10000;i++){
    const op=Math.floor(random()*7),value=i%13===0?undefined:i;
    if(op===0){pushFront(q,value);oracle.unshift(value);}else if(op<=2){pushBack(q,value);oracle.push(value);}
    else if(op===3)assert.equal(popFront(q),oracle.shift());else if(op===4)assert.equal(popBack(q),oracle.pop());
    else if(op===5)assert.equal(peekFront(q),oracle[0]);else assert.equal(peekBack(q),oracle.at(-1));
    assert.equal(q.size,oracle.length);if(i%100===0)assert.deepEqual([...q],oracle);
  }
  clearDeque(q);assert.equal(q.size,0);assert.deepEqual([...q],[]);pushFront(q,9);pushBack(q,10);assert.deepEqual([...q],[9,10]);
  const large=deque(Array.from({length:1000},(_,i)=>i));assert.equal(popBack(large),999);assert.equal(popFront(large),0);
});

test("singly linked functions preserve stable handles and invalidate detached/foreign nodes",()=>{
  const list=linkedList([1,3]),first=list.first!;const middle=insertAfter(list,first,2),last=list.last!;
  assert.deepEqual([...list],[1,2,3]);assert.equal(first.next,middle);assert.equal(middle.next,last);
  assert.equal(removeAfter(list,first),2);assert.equal(middle.next,undefined);assert.throws(()=>insertAfter(list,middle,4),/foreign|detached/);
  assert.equal(remove(list,last),3);assert.equal(list.last,first);assert.equal(removeFirst(list),1);assert.equal(list.first,undefined);
  const next=append(list,4);prepend(list,0);assert.deepEqual([...list],[0,4]);assert.throws(()=>remove(linkedList<number>(),next),/foreign|detached/);
  clearList(list);assert.equal(next.next,undefined);assert.throws(()=>remove(list,next),/foreign|detached/);
  assert.equal("previous"in next,false);assert.equal("append"in list,false);
});

test("double list bidirectional edits preserve handles and ownership",()=>{
  const list=doublyLinkedList([1,3]),first=list.first!,last=list.last!;
  const middle=insertBefore(list,last,2);assert.equal(first.next,middle);assert.equal(last.previous,middle);assert.deepEqual([...list],[1,2,3]);
  assert.equal(remove(list,middle),2);assert.equal(middle.next,undefined);assert.equal(middle.previous,undefined);
  const before=prepend(list,0),after=append(list,4);assert.equal(first.previous,before);assert.equal(last.next,after);
  assert.equal(removeLast(list),4);assert.equal(removeFirst(list),0);
  assert.throws(()=>insertBefore(doublyLinkedList<number>(),first,9),/foreign|detached/);
  clearList(list);for(const node of [first,last,middle]){assert.equal(node.next,undefined);assert.equal(node.previous,undefined);assert.throws(()=>remove(list,node),/foreign|detached/);}
  assert.equal(list.size,0);
});

test("random double-list local edits match an array and every retained neighbor",()=>{
  const list=doublyLinkedList<number>(),nodes:DoublyLinkedNode<number>[]=[];
  let seed=987;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  for(let i=0;i<2000;i++){
    if(!nodes.length||random()<0.6){const index=Math.floor(random()*(nodes.length+1));const node=index===nodes.length?append(list,i):insertBefore(list,nodes[index]!,i);nodes.splice(index,0,node);}
    else{const index=Math.floor(random()*nodes.length),node=nodes.splice(index,1)[0]!;assert.equal(remove(list,node),node.value);}
    assert.deepEqual([...list],nodes.map(node=>node.value));assert.equal(list.size,nodes.length);
    let index=0;for(let node=list.first;node;node=node.next){assert.equal(node,nodes[index]);assert.equal(node.previous,nodes[index-1]);assert.equal(node.next,nodes[index+1]);index++;}
  }
});
