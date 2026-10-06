import {dequeState,type Deque} from "./state.js";
export function popBack<V>(deque:Deque<V>):V|undefined{const d=deque[dequeState];if(!d.count)return undefined;const i=(d.head+d.count-1)%d.items.length,v=d.items[i];d.items[i]=undefined;d.count--;return v;}
