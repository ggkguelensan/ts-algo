import {queueState,type Queue} from "./state.js";
/** FIFO with native push, a read offset and amortized compaction. No per-value node. */
export function queue<Value>(source:Iterable<Value>=[]):Queue<Value>{
  const data={items:Array.from(source) as (Value|undefined)[],head:0};
  return {[queueState]:data,get size(){return data.items.length-data.head;},*[Symbol.iterator](){for(let i=data.head;i<data.items.length;i++)yield data.items[i]!;}};
}
