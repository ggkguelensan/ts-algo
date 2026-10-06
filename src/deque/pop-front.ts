import {dequeState,type Deque} from "./state.js";
export function popFront<V>(deque:Deque<V>):V|undefined{const d=deque[dequeState];if(!d.count)return undefined;const v=d.items[d.head];d.items[d.head]=undefined;d.head=(d.head+1)%d.items.length;d.count--;return v;}
