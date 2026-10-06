export const queueState=Symbol("queue");
export interface Queue<Value> extends Iterable<Value>{readonly size:number;readonly[queueState]:{items:(Value|undefined)[];head:number};}
