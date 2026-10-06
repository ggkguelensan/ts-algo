import {listState,insert,owned,type List,type LinkedList,type DoublyLinkedList,type LinkedNode,type DoublyLinkedNode} from "./state.js";
export function insertAfter<V>(list:DoublyLinkedList<V>,node:DoublyLinkedNode<V>,value:V):DoublyLinkedNode<V>;
export function insertAfter<V>(list:LinkedList<V>,node:LinkedNode<V>,value:V):LinkedNode<V>;
export function insertAfter<V>(list:List<V>,node:LinkedNode<V>,value:V):LinkedNode<V>{const d=list[listState],previous=owned(d,node);return insert(d,value,previous,previous.next);}
