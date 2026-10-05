import { subset, type Source } from "../source.js";
import { bounds, lowerBound } from "./normalize.js";
import { timeState, type Timeline, type TimeWindow } from "./state.js";
/** Lazy repeatable selection by start in [start,end); captures query bounds now. */
export function startsBetween<Ref, Entity, Context>(
  index: Timeline<Ref, Entity, Context>, window: TimeWindow,
): Source<Ref, Entity, Context> {
  const [start, end] = bounds(window), { starts, refs } = index[timeState];
  const first = lowerBound(starts, start), limit = lowerBound(starts, end);
  return subset(index, {
    *[Symbol.iterator]() { for (let i = first; i < limit; i++) yield refs[i]!; },
  });
}
