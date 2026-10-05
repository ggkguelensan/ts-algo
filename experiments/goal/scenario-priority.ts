import {Heap} from 'mnemonist';
type Entry={id:number;deadline:number;version:number};
const compare=(a:Entry,b:Entry)=>a.deadline-b.deadline||a.id-b.id;
export function priority(n=1000,limit=n){
  const initial=Array.from({length:n},(_,id)=>({id,deadline:id%101,version:0}));
  const operations=Array.from({length:Math.floor(n/10)},(_,i)=>({id:i*3,deadline:-1-(i%7)}));
  const run=(heap:boolean)=>{
    const versions=new Map(initial.map(e=>[e.id,e.version])),cancelled=new Set<number>();
    const queue=heap?Heap.from(initial,compare):null,entries=heap?[]:[...initial];
    for(const op of operations){if(op.id%7===0){cancelled.add(op.id);continue;}const version=versions.get(op.id)!+1;versions.set(op.id,version);const entry={...op,version};if(queue)queue.push(entry);else entries.push(entry);}
    if(!queue)entries.sort(compare);
    const result:number[]=[];let position=0;if(limit===0)return result;
    while(queue?queue.size>0:position<entries.length){const entry=queue?queue.pop()!:entries[position++]!;if(cancelled.has(entry.id)||versions.get(entry.id)!==entry.version)continue;result.push(entry.id);if(result.length===limit)break;}
    return result;
  };
  return {initial,operations,variants:{sortedArray:()=>run(false),mnemonistHeap:()=>run(true)}};
}
