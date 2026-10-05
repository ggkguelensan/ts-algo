import { entity, type Source } from './source.ts';
const inputState = Symbol('query-input');
declare const transition: unique symbol;

export interface Input<R,E,C=undefined> extends Iterable<R> {
  readonly [inputState]: {readonly resolve:(ref:R)=>E; readonly context:C};
}
function input<R,E,C>(refs:Iterable<R>,resolve:(ref:R)=>E,context:C):Input<R,E,C> {
  return {[inputState]:{resolve,context},[Symbol.iterator]:()=>refs[Symbol.iterator]()};
}
export function withContext<R,E,S,C>(source:Source<R,E,S>,context:C):Input<R,E,C> {
  return input(source,ref=>entity(source,ref),context);
}
export function queryInput<R,E,S>(source:Source<R,E,S>):Input<R,E> {
  return withContext(source,undefined);
}
type Callback<E,R,C,V>=(value:E,ref:R,context:C)=>V;
type Kind='filter'|'select'|'take'|'drop'|'sort';
export interface Step<R,E,C,NextR=R,NextE=E> {
  readonly kind:Kind;
  readonly callback?:unknown;
  readonly compare?:unknown;
  readonly amount?:number;
  // Phantom transition correlates each stage without adding runtime properties.
  readonly [transition]?: (source:Input<R,E,C>)=>Input<NextR,NextE,C>;
}
export function filtered<R,E,C,N extends E>(callback:(value:E,ref:R,context:C)=>value is N):Step<R,E,C,R,N>;
export function filtered<R,E,C>(callback:Callback<E,R,C,boolean>):Step<R,E,C>;
export function filtered(callback:unknown):Step<unknown,unknown,unknown> {return {kind:'filter',callback};}
export function selected<R,E,C,V>(callback:Callback<E,R,C,V>):Step<R,E,C,V,V> {return {kind:'select',callback};}
export function sorted<R,E,C,V>(callback:Callback<E,R,C,V>,compare:(a:V,b:V)=>number):Step<R,E,C> {return {kind:'sort',callback,compare};}
function limit(amount:number) {if(!Number.isSafeInteger(amount)||amount<0)throw new RangeError('Invalid limit');return amount;}
export function take<R,E,C>(amount:number):Step<R,E,C> {return {kind:'take',amount:limit(amount)};}
export function drop<R,E,C>(amount:number):Step<R,E,C> {return {kind:'drop',amount:limit(amount)};}

export function query<R,E,C>(source:Input<R,E,C>):R[];
export function query<R,E,C,A,B>(source:Input<R,E,C>,a:Step<R,E,C,A,B>):A[];
export function query<R,E,C,A,B,D,F>(source:Input<R,E,C>,a:Step<R,E,C,A,B>,b:Step<A,B,C,D,F>):D[];
export function query<R,E,C,A,B,D,F,G,H>(source:Input<R,E,C>,a:Step<R,E,C,A,B>,b:Step<A,B,C,D,F>,c:Step<D,F,C,G,H>):G[];
export function query<R,E,C,A,B,D,F,G,H,J,K>(source:Input<R,E,C>,a:Step<R,E,C,A,B>,b:Step<A,B,C,D,F>,c:Step<D,F,C,G,H>,d:Step<G,H,C,J,K>):J[];
export function query(source:Input<unknown,unknown,unknown>,...steps:Step<unknown,unknown,unknown>[]):unknown[] {
  let current=source;
  let begin=0;
  for(let i=0;i<=steps.length;i++) {
    if(i===steps.length||steps[i]!.kind==='sort') {
      if(i>begin)current=segment(current,steps.slice(begin,i));
      if(i<steps.length)current=sortStage(current,steps[i]!);
      begin=i+1;
    }
  }
  return Array.from(current);
}
function segment(source:Input<unknown,unknown,unknown>,steps:Step<unknown,unknown,unknown>[]):Input<unknown,unknown,unknown> {
  const ctx=source[inputState].context,projected=steps.some(s=>s.kind==='select');
  const refs={*[Symbol.iterator]() {
    // Per-iteration counters ensure a repeatable source gets a fresh execution.
    const counts=new Array<number>(steps.length).fill(0);
    if(steps.some(s=>s.kind==='take'&&s.amount===0))return;
    for(const initial of source) {
      let ref=initial,value:unknown,loaded=false,accepted=true,stop=false;
      for(let i=0;i<steps.length;i++) {
        const step=steps[i]!;
        if(step.kind==='take') {counts[i]=counts[i]!+1;if(counts[i]===step.amount)stop=true;}
        else if(step.kind==='drop') {const count=counts[i]!;counts[i]=count+1;if(count<step.amount!){accepted=false;break;}}
        else {
          if(!loaded){value=source[inputState].resolve(ref);loaded=true;}
          // Runtime erasure is isolated here; overloads establish callback transitions.
          const callback=step.callback as Callback<unknown,unknown,unknown,unknown>;
          if(step.kind==='filter'){if(!callback(value,ref,ctx)){accepted=false;break;}}
          else {value=callback(value,ref,ctx);ref=value;}
        }
      }
      if(accepted)yield ref;
      if(stop)return;
    }
  }};
  return input(refs,projected?ref=>ref:source[inputState].resolve,ctx);
}
function sortStage(source:Input<unknown,unknown,unknown>,step:Step<unknown,unknown,unknown>):Input<unknown,unknown,unknown> {
  const refs=Array.from(source),callback=step.callback as Callback<unknown,unknown,unknown,unknown>;
  const compare=step.compare as (a:unknown,b:unknown)=>number;
  if(refs.length<=1)return input(refs,source[inputState].resolve,source[inputState].context);
  const values=refs.map(ref=>callback(source[inputState].resolve(ref),ref,source[inputState].context));
  const order=refs.map((_,i)=>i);order.sort((a,b)=>compare(values[a],values[b]));
  return input(order.map(i=>refs[i]),source[inputState].resolve,source[inputState].context);
}

/** Alternative: composable lazy operators, each preserving the source binding. */
export function lazyFiltered<R,E,C>(source:Input<R,E,C>,predicate:Callback<E,R,C,boolean>):Input<R,E,C> {
  const {resolve,context}=source[inputState];
  return input({*[Symbol.iterator](){for(const ref of source)if(predicate(resolve(ref),ref,context))yield ref;}},resolve,context);
}
export function lazySelected<R,E,C,V>(source:Input<R,E,C>,select:Callback<E,R,C,V>):Input<V,V,C> {
  const {resolve,context}=source[inputState];
  return input({*[Symbol.iterator](){for(const ref of source)yield select(resolve(ref),ref,context);}},value=>value,context);
}
export function lazyTake<R,E,C>(source:Input<R,E,C>,amount:number):Input<R,E,C> {
  limit(amount);const {resolve,context}=source[inputState];
  return input({*[Symbol.iterator](){if(amount===0)return;let n=0;for(const ref of source){yield ref;if(++n===amount)return;}}},resolve,context);
}
