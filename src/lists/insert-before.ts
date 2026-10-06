import {listState,insert,owned,type DoublyLinkedList,type DoublyLinkedNode} from "./state.js";
export function insertBefore<V>(list:DoublyLinkedList<V>,handle:DoublyLinkedNode<V>,value:V):DoublyLinkedNode<V>{const d=list[listState],next=owned(d,handle);return insert(d,value,next.previous,next) as DoublyLinkedNode<V>;}
