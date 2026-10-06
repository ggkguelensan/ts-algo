import {dequeState,type Deque} from "./state.js";
export function clear<V>(deque:Deque<V>):void{const d=deque[dequeState];d.items=new Array<V|undefined>(16);d.head=0;d.count=0;}
