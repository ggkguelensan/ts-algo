import {queueState,type Queue} from "./state.js";
/** Check size before removing to distinguish stored undefined from emptiness. */
export function dequeue<V>(queue:Queue<V>):V|undefined{
  const data=queue[queueState];if(data.head===data.items.length)return undefined;
  const value=data.items[data.head];data.items[data.head++]=undefined;
  if(data.head===data.items.length){data.items=[];data.head=0;}
  else if(data.head>=1024&&data.head*2>=data.items.length){data.items=data.items.slice(data.head);data.head=0;}
  return value;
}
