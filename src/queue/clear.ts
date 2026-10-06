import {queueState,type Queue} from "./state.js";
export function clear<V>(queue:Queue<V>):void{const data=queue[queueState];data.items=[];data.head=0;}
