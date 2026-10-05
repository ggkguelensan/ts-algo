import { validSpan, type Span } from "./span.js";
/** All positive-duration overlapping index pairs, lexicographically ordered. */
export function conflicts(items: readonly Span[]): Array<readonly [number, number]> {
  for (const item of items) validSpan(item);
  const order = items.map((_, i) => i).sort((a, b) => items[a]!.start - items[b]!.start);
  const active: number[] = [], result: Array<readonly [number, number]> = [];
  for (const id of order) {
    const item = items[id]!;
    if (item.start === item.end) continue;
    let retained = 0;
    for (const other of active) {
      if (items[other]!.end > item.start) {
        active[retained++] = other;
        result.push(id < other ? [id, other] : [other, id]);
      }
    }
    active.length = retained; active.push(id);
  }
  return result.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
}
