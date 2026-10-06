export const dequeState=Symbol("deque");
export interface Deque<V> extends Iterable<V>{readonly size:number;readonly[dequeState]:{items:(V|undefined)[];head:number;count:number};}
export function grow<V>(data:Deque<V>[typeof dequeState]):void{
  if(data.count<data.items.length)return;
  const next=new Array<V|undefined>(data.items.length*2);
  for(let i=0;i<data.count;i++)next[i]=data.items[(data.head+i)%data.items.length];
  data.items=next;data.head=0;
}
