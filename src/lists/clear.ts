import {listState,unlink,type List} from "./state.js";
/** Invalidate retained handles and release both links, O(n). */
export function clear<V>(list:List<V>):void{const d=list[listState];while(d.head)unlink(d,d.head,undefined);}
