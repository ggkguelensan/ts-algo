import type { Interval } from 'date-fns';
import { entity, sourceContext, subset, type Source } from './source.ts';

export type Instant = number | Date;
export type Window = Readonly<Interval<Instant, Instant>>;
export type EventTime = Instant | Window;
const state = Symbol('temporal');
export interface Temporal<Ref, Entity, Context> {
  readonly size: number;
  readonly [state]: {
    readonly source: Source<Ref, Entity, Context>;
    readonly refs: Ref[];
    readonly starts: Float64Array;
    readonly ends: Float64Array;
    readonly maxima: Float64Array | undefined;
    readonly base: number;
  };
}
function timestamp(value: Instant): number {
  const result = typeof value === 'number' ? value : value.getTime();
  if (!Number.isFinite(result)) throw new RangeError('Invalid time');
  return result;
}
function bounds(window: Window): [number, number] {
  const start = timestamp(window.start), end = timestamp(window.end);
  if (start > end) throw new RangeError('Reversed interval');
  return [start, end];
}
export function temporal<Ref, Entity, Context>(source: Source<Ref, Entity, Context>, time: (entity: Entity, ref: Ref, context: Context) => EventTime): Temporal<Ref, Entity, Context> {
  const input = Array.from(source);
  if (new Set(input).size !== input.length) throw new RangeError('Duplicate reference');
  const rawStarts = new Float64Array(input.length), rawEnds = new Float64Array(input.length);
  const order = new Array<number>(input.length);
  let spans = false;
  for (let i = 0; i < input.length; i++) {
    const ref = input[i]!;
    const value = time(entity(source, ref), ref, sourceContext(source));
    const [start, end] = typeof value === 'number' || value instanceof Date ? [timestamp(value), timestamp(value)] : bounds(value);
    rawStarts[i] = start; rawEnds[i] = end; order[i] = i;
    spans ||= start !== end;
  }
  order.sort((a,b) => rawStarts[a]! - rawStarts[b]!);
  const refs = new Array<Ref>(input.length), starts = new Float64Array(input.length);
  const ends = spans ? new Float64Array(input.length) : starts;
  for (let i = 0; i < order.length; i++) {
    const position = order[i]!;
    refs[i] = input[position]!; starts[i] = rawStarts[position]!;
    if (spans) ends[i] = rawEnds[position]!;
  }
  let base = 1;
  while (base < refs.length) base *= 2;
  const maxima = spans ? new Float64Array(base * 2).fill(-Infinity) : undefined;
  if (maxima) {
    maxima.set(ends, base);
    for (let i = base - 1; i > 0; i--) maxima[i] = Math.max(maxima[i*2]!, maxima[i*2+1]!);
  }
  return { size: refs.length, [state]: {source, refs, starts, ends, maxima, base} };
}
function lowerBound(values: Float64Array, value: number): number {
  let lo = 0, hi = values.length;
  while (lo < hi) {const middle = (lo+hi)>>>1; if(values[middle]!<value) lo=middle+1; else hi=middle;}
  return lo;
}
export function startsBetween<Ref, Entity, Context>(index: Temporal<Ref, Entity, Context>, window: Window): Source<Ref, Entity, Context> {
  const [start,end] = bounds(window), data = index[state];
  return subset(data.source, data.refs.slice(lowerBound(data.starts,start),lowerBound(data.starts,end)));
}
export function overlapping<Ref, Entity, Context>(index: Temporal<Ref, Entity, Context>, window: Window): Source<Ref, Entity, Context> {
  const [start,end] = bounds(window), data = index[state];
  if (start === end) return subset(data.source, []);
  if (!data.maxima) return startsBetween(index, window);
  const result: Ref[] = [], limit = lowerBound(data.starts,end);
  const nodes = [1], lefts = [0], rights = [data.base];
  while (nodes.length) {
    const node = nodes.pop()!, left = lefts.pop()!, right = rights.pop()!;
    // max=end=start points must survive equality with the query's left edge.
    if (left >= limit || data.maxima[node]! < start) continue;
    if (right-left === 1) {
      const a = data.starts[left]!, b = data.ends[left]!;
      if (a === b ? a >= start : b > start) result.push(data.refs[left]!);
    } else {
      const middle = (left+right)>>>1;
      nodes.push(node*2+1,node*2); lefts.push(middle,left); rights.push(right,middle);
    }
  }
  return subset(data.source, result);
}
