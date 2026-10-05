export type Span={readonly start:number;readonly end:number};
export type Reservation=Span&{readonly units:number};
export function valid(span:Span):void {
  if(!Number.isFinite(span.start)||!Number.isFinite(span.end)||span.start>span.end)throw new RangeError('Invalid interval');
}
export function conflicts(items:readonly Span[]):Array<readonly[number,number]> {
  items.forEach(valid);const order=items.map((_,i)=>i).sort((a,b)=>items[a]!.start-items[b]!.start);
  const active:number[]=[],result:Array<readonly[number,number]>=[];
  for(const id of order){const item=items[id]!;if(item.start===item.end)continue;let retained=0;
    for(const other of active){const value=items[other]!;if(value.end>item.start){active[retained++]=other;result.push(id<other?[id,other]:[other,id]);}}
    active.length=retained;active.push(id);
  }return result.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
}
export function freeSlots(items:readonly Span[],window:Span):Span[] {
  valid(window);items.forEach(valid);if(window.start===window.end)return [];
  const spans=items.filter(i=>i.start<i.end&&i.start<window.end&&i.end>window.start).toSorted((a,b)=>a.start-b.start);
  const result:Span[]=[];let cursor=window.start;
  for(const item of spans){const start=Math.max(item.start,window.start);if(start>cursor)result.push({start:cursor,end:start});cursor=Math.max(cursor,Math.min(item.end,window.end));}
  if(cursor<window.end)result.push({start:cursor,end:window.end});return result;
}
export function overloaded(items:readonly Reservation[],window:Span,capacity:number):Span[] {
  valid(window);if(!Number.isFinite(capacity)||capacity<0)throw new RangeError('Invalid capacity');
  const deltas=new Map<number,number>();
  for(const item of items){valid(item);if(!Number.isFinite(item.units)||item.units<0)throw new RangeError('Invalid units');const a=Math.max(item.start,window.start),b=Math.min(item.end,window.end);if(a>=b)continue;deltas.set(a,(deltas.get(a)??0)+item.units);deltas.set(b,(deltas.get(b)??0)-item.units);}
  const points=[...deltas.keys()].sort((a,b)=>a-b),result:Span[]=[];let load=0;
  for(let i=0;i<points.length-1;i++){const a=points[i]!,b=points[i+1]!;load+=deltas.get(a)!;if(load>capacity){const last=result.at(-1);if(last?.end===a)result[result.length-1]={start:last.start,end:b};else result.push({start:a,end:b});}}
  return result;
}
