import {dequeState,grow,type Deque} from "./state.js";
export function pushFront<V>(deque:Deque<V>,value:V):void{const d=deque[dequeState];grow(d);d.head=(d.head+d.items.length-1)%d.items.length;d.items[d.head]=value;d.count++;}
