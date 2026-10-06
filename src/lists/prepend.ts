import {listState,insert,type List,type LinkedList,type DoublyLinkedList,type LinkedNode,type DoublyLinkedNode} from "./state.js";
export function prepend<V>(list:DoublyLinkedList<V>,value:V):DoublyLinkedNode<V>;
export function prepend<V>(list:LinkedList<V>,value:V):LinkedNode<V>;
export function prepend<V>(list:List<V>,value:V):LinkedNode<V>{const d=list[listState];return insert(d,value,undefined,d.head);}
