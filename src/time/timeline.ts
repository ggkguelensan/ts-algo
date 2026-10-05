import { entity, subset, type Source } from "../source.js";
import { sourceState } from "../internal/source-state.js";
import { timeState, type Timeline, type EventTime } from "./state.js";
import { timestamp } from "./normalize.js";

/**
 * Snapshot membership/time metadata; retain live entity resolution.
 * A getter is called once per reference with the source context. References
 * must be unique. Changing metadata requires rebuilding, not mutating entities.
 */
export function timeline<Ref, Entity, Context>(
  source: Source<Ref, Entity, Context>,
  time: (entity: Entity, ref: Ref, context: Context) => EventTime,
): Timeline<Ref, Entity, Context> {
  const input = Array.from(source);
  if (new Set(input).size !== input.length) throw new RangeError("Duplicate reference");
  const rawStarts = new Float64Array(input.length), order = new Array<number>(input.length);
  let rawEnds: Float64Array | undefined;
  const context = source[sourceState].context;
  for (let i = 0; i < input.length; i++) {
    const ref = input[i]!, value = time(entity(source, ref), ref, context);
    let start: number, end: number;
    if (typeof value === "number" || value instanceof Date) {
      start = end = timestamp(value); // Normalize point Date once, then snapshot it.
    } else {
      if (typeof value !== "object" || value === null) throw new RangeError("Invalid interval");
      start = timestamp(value.start); end = timestamp(value.end);
      if (start > end) throw new RangeError("Reversed interval");
    }
    rawStarts[i] = start; order[i] = i;
    if (!rawEnds && start !== end) rawEnds = rawStarts.slice();
    if (rawEnds) rawEnds[i] = end;
  }
  order.sort((a, b) => rawStarts[a]! - rawStarts[b]!);
  const refs = new Array<Ref>(input.length), starts = new Float64Array(input.length);
  const ends = rawEnds ? new Float64Array(input.length) : starts;
  for (let i = 0; i < order.length; i++) {
    const position = order[i]!;
    refs[i] = input[position]!; starts[i] = rawStarts[position]!;
    if (rawEnds) ends[i] = rawEnds[position]!;
  }
  let base = 1;
  while (base < refs.length) base *= 2;
  const maxima = rawEnds ? new Float64Array(base * 2).fill(-Infinity) : undefined;
  if (maxima) {
    maxima.set(ends, base);
    for (let i = base - 1; i > 0; i--) maxima[i] = Math.max(maxima[i * 2]!, maxima[i * 2 + 1]!);
  }
  return { ...subset(source, refs), size: refs.length, [timeState]: { refs, starts, ends, maxima, base } };
}
