import { isMapLike } from "./internal/collection.js";

export interface Bounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

export interface Nearest<Ref> {
  readonly reference: Ref;
  readonly distance: number;
}

export interface PointIndex<Ref> {
  readonly size: number;
  /** Inclusive edges. Result order is unspecified. */
  within(bounds: Bounds): Ref[];
  /** Euclidean distance; ties use source order. Radius is inclusive. */
  nearest(x: number, y: number, radius?: number): Nearest<Ref> | undefined;
}

type Coordinates<Entity, Key = Entity> = {
  readonly x: (entity: Entity, key: Key) => number;
  readonly y: (entity: Entity, key: Key) => number;
};
type Item<Source> = Source extends Iterable<infer Ref> ? Ref : never;

export function pointIndex<Key, Entity>(
  source: ReadonlyMap<Key, Entity>, coordinates: Coordinates<Entity, Key>,
): PointIndex<Key>;
export function pointIndex<Ref>(
  source: readonly Ref[] | ReadonlySet<Ref>, coordinates: Coordinates<Ref>,
): PointIndex<Ref>;
export function pointIndex<Source extends Iterable<unknown>>(
  source: Source extends ReadonlyMap<unknown, unknown> ? never : Source,
  coordinates: Coordinates<Item<Source>>,
): PointIndex<Item<Source>>;

/** Static snapshot. Selectors run once per coordinate per occurrence.
 * Sources must be finite; arrays dense; selectors must not mutate the source.
 * Coordinates must be finite. Rebuild after positions or membership change.
 */
export function pointIndex<Ref, Entity>(
  source: ReadonlyMap<Ref, Entity> | Iterable<Ref>,
  coordinates: Coordinates<Entity, Ref> | Coordinates<Ref>,
): PointIndex<Ref> {
  let references: Ref[];
  let xs: number[];
  let ys: number[];
  if (isMapLike(source)) {
    // The overload correlates the Map with its entity/key selectors.
    const select = coordinates as Coordinates<Entity, Ref>;
    references = new Array<Ref>(source.size);
    xs = new Array<number>(source.size);
    ys = new Array<number>(source.size);
    let i = 0;
    source.forEach((entity, key) => {
      references[i] = key;
      xs[i] = select.x(entity, key);
      ys[i] = select.y(entity, key);
      i++;
    });
  } else {
    const select = coordinates as Coordinates<Ref>;
    // Fully consume single-use iterables before invoking user callbacks.
    references = Array.isArray(source) ? source.slice() : Array.from(source);
    xs = new Array<number>(references.length);
    ys = new Array<number>(references.length);
    for (let i = 0; i < references.length; i++) {
      const ref = references[i]!;
      xs[i] = select.x(ref, ref);
      ys[i] = select.y(ref, ref);
    }
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
  return {
    size: references.length,
    within(bounds) {
      validateBounds(bounds);
      const result: Ref[] = [];
      const stack = root ? [root] : [];
      while (stack.length) {
        const node = stack.pop()!;
        if (node.maxX < bounds.minX || node.minX > bounds.maxX
          || node.maxY < bounds.minY || node.minY > bounds.maxY) continue;
        if (node.children) {
          for (const child of node.children) stack.push(child);
        } else {
          for (let j = node.start; j < node.end; j++) {
            const i = order[j]!, x = xs[i]!, y = ys[i]!;
            if (x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY) {
              result.push(references[i]!);
            }
          }
        }
      }
      return result;
    },
    nearest(x, y, radius = Infinity) {
      finite(x); finite(y);
      if (Number.isNaN(radius) || radius < 0) throw new RangeError("Radius must be nonnegative");
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
    },
  };
}

interface Node extends Bounds {
  start: number;
  end: number;
  children: Node[] | undefined;
}
function finite(value: number): void {
  if (!Number.isFinite(value)) throw new RangeError("Coordinates must be finite");
}
function validateBounds(bounds: Bounds): void {
  finite(bounds.minX); finite(bounds.minY); finite(bounds.maxX); finite(bounds.maxY);
  if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) {
    throw new RangeError("Bounds must be ordered");
  }
}
