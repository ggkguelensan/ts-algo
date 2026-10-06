import {from,collect,sorted,type Brand} from "../src/index.js";
import {queue,enqueue,dequeue} from "../src/queue/index.js";
import {deque,pushFront} from "../src/deque/index.js";
import {linkedList,doublyLinkedList,append,insertBefore,removeLast,type DoublyLinkedNode} from "../src/lists/index.js";
type Equal<A,B>=(<T>()=>T extends A?1:2)extends(<T>()=>T extends B?1:2)?true:false;type Assert<T extends true>=T;
type Id=Brand<string,"Id">;declare const ids:readonly Id[];
const q=queue(ids),dq=deque(ids),list=linkedList(ids),double=doublyLinkedList(ids);
const refs=sorted(q,id=>id,(a,b)=>a.localeCompare(b));type Refs=Assert<Equal<typeof refs,Id[]>>;
const selected=collect(from(dq));type Selected=Assert<Equal<typeof selected,Id[]>>;
const item=dequeue(q);type Item=Assert<Equal<typeof item,Id|undefined>>;
declare const id:Id;const node=append(double,id);type Node=Assert<Equal<typeof node,DoublyLinkedNode<Id>>>;
// @ts-expect-error values preserve branded ID types.
enqueue(q,"raw");
// @ts-expect-error deque values preserve ID type.
pushFront(dq,1);
// @ts-expect-error singly linked lists cannot insert before in O(1).
insertBefore(list,append(list,id),id);
// @ts-expect-error no removeLast on a singly linked list.
removeLast(list);
// @ts-expect-error singly linked nodes have no previous link.
append(list,id).previous;
// @ts-expect-error links are readonly to callers.
node.next=undefined;
// @ts-expect-error mutation is a function, not a custom collection method.
q.enqueue(id);
