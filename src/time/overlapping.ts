import { subset, type Source } from "../source.js";
import { bounds, lowerBound } from "./normalize.js";
import { timeState, type Timeline, type TimeWindow } from "./state.js";
/**
 * Lazy repeatable intersections with [start,end), in stable chronological order.
 * Zero-duration events are points; an empty window contains no events.
 * The query snapshots bounds, then iteration searches immutable cached metadata.
 */
export function overlapping<Ref, Entity, Context>(
  index: Timeline<Ref, Entity, Context>, window: TimeWindow,
): Source<Ref, Entity, Context> {
  const [start, end] = bounds(window), data = index[timeState];
  const limit = lowerBound(data.starts, end);
  const first = data.maxima ? 0 : lowerBound(data.starts, start);
  return subset(index, {
    *[Symbol.iterator]() {
      if (start === end) return;
      if (!data.maxima) {
        for (let i = first; i < limit; i++) yield data.refs[i]!;
        return;
      }
      const nodes = [1], lefts = [0], rights = [data.base];
      while (nodes.length) {
        const node = nodes.pop()!, left = lefts.pop()!, right = rights.pop()!;
        // Point end=start must survive equality with the window's left edge.
        if (left >= limit || data.maxima[node]! < start) continue;
        if (right - left === 1) {
          const a = data.starts[left]!, b = data.ends[left]!;
          if (a === b ? a >= start : b > start) yield data.refs[left]!;
        } else {
          const middle = (left + right) >>> 1;
          nodes.push(node * 2 + 1, node * 2); lefts.push(middle, left); rights.push(right, middle);
        }
      }
    },
  });
}
