import {listState,insert,type Data,type List,type LinkedList,type DoublyLinkedList,type DoublyLinkedNode} from "./state.js";
function make<V>(source:Iterable<V>,kind:"single"|"double"):List<V>{
  const data:Data<V>={kind,owner:{},head:undefined,tail:undefined,size:0};
  for(const value of source)insert(data,value,data.tail,undefined);
  return {[listState]:data,get size(){return data.size;},get first(){return data.head;},get last(){return data.tail;},*[Symbol.iterator](){for(let node=data.head;node;node=node.next)yield node.value;}};
}
export function linkedList<V>(source:Iterable<V>=[]):LinkedList<V>{return make(source,"single") as LinkedList<V>;}
export function doublyLinkedList<V>(source:Iterable<V>=[]):DoublyLinkedList<V>{return make(source,"double") as DoublyLinkedList<V>;}
// Constructor kind ensures double nodes always have a previous property. Public links stay readonly.
