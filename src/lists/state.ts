import {listOwner,requireOwned} from "../internal/list-owner.js";
export const listState=Symbol("list");
export interface LinkedNode<V>{readonly value:V;readonly next:LinkedNode<V>|undefined;}
export interface DoublyLinkedNode<V> extends LinkedNode<V>{readonly next:DoublyLinkedNode<V>|undefined;readonly previous:DoublyLinkedNode<V>|undefined;}
export interface Node<V> extends LinkedNode<V>{next:Node<V>|undefined;previous?:Node<V>|undefined;[listOwner]:object|undefined;}
export interface Data<V>{kind:"single"|"double";owner:object;head:Node<V>|undefined;tail:Node<V>|undefined;size:number;}
export interface List<V> extends Iterable<V>{readonly size:number;readonly first:LinkedNode<V>|undefined;readonly last:LinkedNode<V>|undefined;readonly[listState]:Data<V>;}
export interface LinkedList<V> extends List<V>{readonly[listState]:Data<V>&{kind:"single"};}
export interface DoublyLinkedList<V> extends List<V>{readonly first:DoublyLinkedNode<V>|undefined;readonly last:DoublyLinkedNode<V>|undefined;readonly[listState]:Data<V>&{kind:"double"};}
export function owned<V>(data:Data<V>,handle:LinkedNode<V>):Node<V>{return requireOwned<Node<V>>(handle,data.owner);}
export function insert<V>(data:Data<V>,value:V,previous:Node<V>|undefined,next:Node<V>|undefined):Node<V>{
  return data.kind==="double"?insertDouble(data,value,previous,next):insertSingle(data,value,previous,next);
}
function insertSingle<V>(data:Data<V>,value:V,previous:Node<V>|undefined,next:Node<V>|undefined):Node<V>{
  const node:Node<V>={value,next,[listOwner]:data.owner};
  if(previous)previous.next=node;else data.head=node;
  if(!next)data.tail=node;
  data.size++;return node;
}
function insertDouble<V>(data:Data<V>,value:V,previous:Node<V>|undefined,next:Node<V>|undefined):Node<V>{
  const node:Node<V>={value,previous,next,[listOwner]:data.owner};
  if(previous)previous.next=node;else data.head=node;
  if(next)next.previous=node;else data.tail=node;
  data.size++;return node;
}
export function unlink<V>(data:Data<V>,node:Node<V>,previous:Node<V>|undefined):V{
  return data.kind==="double"?unlinkDouble(data,node,previous):unlinkSingle(data,node,previous);
}
function unlinkSingle<V>(data:Data<V>,node:Node<V>,previous:Node<V>|undefined):V{
  if(previous)previous.next=node.next;else data.head=node.next;
  if(data.tail===node)data.tail=previous;
  node.next=undefined;node[listOwner]=undefined;data.size--;return node.value;
}
function unlinkDouble<V>(data:Data<V>,node:Node<V>,previous:Node<V>|undefined):V{
  if(previous)previous.next=node.next;else data.head=node.next;
  if(node.next)node.next.previous=previous;else data.tail=previous;
  node.next=undefined;node.previous=undefined;node[listOwner]=undefined;data.size--;return node.value;
}
