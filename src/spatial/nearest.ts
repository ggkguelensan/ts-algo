import { spatialState, type PointIndex, type Nearest } from "./state.js";
import { finite } from "./validate.js";
/** Euclidean nearest point; inclusive radius, ties by original occurrence order. */
export function nearest<Ref, E, C>(index: PointIndex<Ref, E, C>, x: number, y: number, radius = Infinity): Nearest<Ref> | undefined {
  const { root, order, references, xs, ys } = index[spatialState];
  finite(x); finite(y);
  if ((radius !== Infinity && !Number.isFinite(radius)) || radius < 0) throw new RangeError("Radius must be nonnegative");
  let best = radius, found = -1;
  const stack = root ? [root] : [];
  while (stack.length) {
    const node = stack.pop()!;
    const dx = Math.max(node.minX - x, 0, x - node.maxX);
    const dy = Math.max(node.minY - y, 0, y - node.maxY);
    if (Math.hypot(dx, dy) > best) continue;
    if (node.children) {
      // Visit the containing/closest quadrant first, without sorting or a heap.
      let closest = node.children[0]!, closestDistance = Infinity;
      for (const child of node.children) {
        const distance = Math.hypot(Math.max(child.minX - x, 0, x - child.maxX),
          Math.max(child.minY - y, 0, y - child.maxY));
        if (distance < closestDistance) { closest = child; closestDistance = distance; }
      }
      for (const child of node.children) if (child !== closest) stack.push(child);
      stack.push(closest);
    } else {
      for (let j = node.start; j < node.end; j++) {
        const i = order[j]!;
        // hypot avoids the premature overflow of squared distances.
        const distance = Math.hypot(xs[i]! - x, ys[i]! - y);
        if (distance <= best && (found < 0 || distance < best || i < found)) {
          best = distance; found = i;
        }
      }
    }
  }
  return found < 0 ? undefined : { reference: references[found]!, distance: best };
}
