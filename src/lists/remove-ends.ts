import {listState,owned,unlink,type List,type DoublyLinkedList,type LinkedNode} from "./state.js";
export function removeFirst<V>(list:List<V>):V|undefined{const d=list[listState];return d.head?unlink(d,d.head,undefined):undefined;}
export function removeLast<V>(list:DoublyLinkedList<V>):V|undefined{const d=list[listState];return d.tail?unlink(d,d.tail,d.tail.previous):undefined;}
export function removeAfter<V>(list:List<V>,handle:LinkedNode<V>):V|undefined{const d=list[listState],previous=owned(d,handle);return previous.next?unlink(d,previous.next,previous):undefined;}
