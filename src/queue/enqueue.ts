import {queueState,type Queue} from "./state.js";
export function enqueue<V>(queue:Queue<V>,value:V):void{queue[queueState].items.push(value);}
