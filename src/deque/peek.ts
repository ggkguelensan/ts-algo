import {dequeState,type Deque} from "./state.js";
export function peekFront<V>(deque:Deque<V>):V|undefined{const d=deque[dequeState];return d.count?d.items[d.head]:undefined;}
export function peekBack<V>(deque:Deque<V>):V|undefined{const d=deque[dequeState];return d.count?d.items[(d.head+d.count-1)%d.items.length]:undefined;}
