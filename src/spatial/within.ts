import { subset, type Source } from "../source.js";
import { spatialState, type PointIndex, type Bounds } from "./state.js";
import { validateBounds } from "./validate.js";
/** Inclusive, lazy repeatable area search; traversal order unspecified. Bounds captured now. */
export function within<Ref, E, C>(index: PointIndex<Ref, E, C>, bounds: Bounds): Source<Ref, E, C> {
  validateBounds(bounds);
  const { minX, minY, maxX, maxY } = bounds;
  const { root, order, references, xs, ys } = index[spatialState];
  return subset(index, {
    *[Symbol.iterator]() {
      const stack = root ? [root] : [];
      while (stack.length) {
        const node = stack.pop()!;
        if (node.maxX < minX || node.minX > maxX || node.maxY < minY || node.minY > maxY) continue;
        if (node.children) {
          for (const child of node.children) stack.push(child);
        } else {
          for (let j = node.start; j < node.end; j++) {
            const i = order[j]!, x = xs[i]!, y = ys[i]!;
            if (x >= minX && x <= maxX && y >= minY && y <= maxY) yield references[i]!;
          }
        }
      }
    },
  });
}
