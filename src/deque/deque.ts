import {dequeState,grow,type Deque} from "./state.js";
/** Growing circular array; one pass over source, no extra input snapshot. */
export function deque<V>(source:Iterable<V>=[]):Deque<V>{
  const data={items:new Array<V|undefined>(16),head:0,count:0};
  for(const value of source){grow(data);data.items[data.count++]=value;}
  return {[dequeState]:data,get size(){return data.count;},*[Symbol.iterator](){for(let i=0;i<data.count;i++)yield data.items[(data.head+i)%data.items.length]!;}};
}
