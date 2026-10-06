import {listState,owned,unlink,type List,type LinkedNode} from "./state.js";
/** Double removal O(1); singly linked removal searches the predecessor, O(n). */
export function remove<V>(list:List<V>,handle:LinkedNode<V>):V{
  const d=list[listState],node=owned(d,handle);let previous=node.previous;
  if(d.kind==="single"){previous=undefined;for(let current=d.head;current!==node;current=current!.next)previous=current;}
  return unlink(d,node,previous);
}
