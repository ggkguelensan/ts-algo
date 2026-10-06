import { entity, type Source } from "../source.js";
import { sourceState } from "../internal/source-state.js";
import { arraySource } from "../internal/array-source.js";
import { spatialState, type PointIndex, type Bounds, type Node } from "./state.js";
import { finite } from "./validate.js";
/** Static coordinate/membership snapshot; entities resolve live. Duplicate occurrences allowed.
 * Selectors run once per coordinate per occurrence and must not mutate source membership.
 */
export function pointIndex<Ref, Entity, Context>(source: Source<Ref, Entity, Context>, coordinates: {
  readonly x: (entity: NoInfer<Entity>, ref: NoInfer<Ref>, context: NoInfer<Context>) => number;
  readonly y: (entity: NoInfer<Entity>, ref: NoInfer<Ref>, context: NoInfer<Context>) => number;
}): PointIndex<Ref, Entity, Context> {
  const references = Array.from(source), xs = new Array<number>(references.length), ys = new Array<number>(references.length);
  const context = source[sourceState].context;
  for (let i = 0; i < references.length; i++) {
    const ref = references[i]!, value = entity(source, ref);
    xs[i] = coordinates.x(value, ref, context); ys[i] = coordinates.y(value, ref, context);
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const order = new Array<number>(references.length);
  for (let i = 0; i < references.length; i++) {
    const x = xs[i]!, y = ys[i]!;
    finite(x); finite(y);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    order[i] = i;
  }

  // Bucket quadtree, built by partitioning one index array in place.
  // No point wrappers or child arrays containing copies of point indices.
  function build(start: number, end: number, bounds: Bounds, depth: number): Node {
    const node: Node = { ...bounds, start, end, children: undefined };
    const mx = bounds.minX / 2 + bounds.maxX / 2;
    const my = bounds.minY / 2 + bounds.maxY / 2;
    if (end - start <= 16 || depth >= 32
      || ((mx === bounds.minX || mx === bounds.maxX)
        && (my === bounds.minY || my === bounds.maxY))) return node;

    const splitX = partition(start, end, xs, mx);
    const leftY = partition(start, splitX, ys, my);
    const rightY = partition(splitX, end, ys, my);
    const children: Node[] = [];
    function add(a: number, b: number, x0: number, y0: number, x1: number, y1: number) {
      if (a < b) children.push(build(a, b, { minX: x0, minY: y0, maxX: x1, maxY: y1 }, depth + 1));
    }
    add(start, leftY, bounds.minX, bounds.minY, mx, my);
    add(leftY, splitX, bounds.minX, my, mx, bounds.maxY);
    add(splitX, rightY, mx, bounds.minY, bounds.maxX, my);
    add(rightY, end, mx, my, bounds.maxX, bounds.maxY);
    node.children = children;
    return node;
  }

  function partition(start: number, end: number, values: readonly number[], middle: number): number {
    let left = start, right = end - 1;
    while (left <= right) {
      if (values[order[left]!]! < middle) left++;
      else {
        const temp = order[left]!;
        order[left] = order[right]!; order[right--] = temp;
      }
    }
    return left;
  }

  const root = references.length === 0 ? undefined
    : build(0, references.length, { minX, minY, maxX, maxY }, 0);
  return { ...arraySource(source, references), size: references.length, [spatialState]: { references, xs, ys, order, root } };
}
