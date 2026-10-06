import {queueState,type Queue} from "./state.js";
export function peek<V>(queue:Queue<V>):V|undefined{const data=queue[queueState];return data.items[data.head];}
