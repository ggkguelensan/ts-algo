import {dequeState,grow,type Deque} from "./state.js";
export function pushBack<V>(deque:Deque<V>,value:V):void{const d=deque[dequeState];grow(d);d.items[(d.head+d.count)%d.items.length]=value;d.count++;}
