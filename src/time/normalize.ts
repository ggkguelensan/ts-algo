import type { Instant, TimeWindow } from "./state.js";
export function timestamp(value: Instant): number {
  const result = typeof value === "number" ? value : value instanceof Date ? value.getTime() : NaN;
  if (!Number.isFinite(result)) throw new RangeError("Invalid time");
  return result;
}
export function bounds(window: TimeWindow): readonly [number, number] {
  if (typeof window !== "object" || window === null) throw new RangeError("Invalid interval");
  const start = timestamp(window.start), end = timestamp(window.end);
  if (start > end) throw new RangeError("Reversed interval");
  return [start, end];
}
export function lowerBound(values: Float64Array, value: number): number {
  let lo = 0, hi = values.length;
  while (lo < hi) {
    const middle = (lo + hi) >>> 1;
    if (values[middle]! < value) lo = middle + 1; else hi = middle;
  }
  return lo;
}
