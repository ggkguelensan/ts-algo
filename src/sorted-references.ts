import type { Compare } from "./quick-sort.js";

/**
 * Native stable sorting of references with values cached once per occurrence.
 * Returns a new array; neither references nor entities are modified.
 * Dense input; callbacks must not mutate input or change ordering mid-sort.
 */
export function sortedReferences<Ref, Value>(
  references: readonly Ref[],
  getValue: (ref: Ref) => Value,
  compare: Compare<Value>,
): Ref[] {
  const length = references.length;
  if (length <= 1) return references.slice();

  // The parallel arrays are fully populated before indexed reads during sort.
  const values = new Array<Value>(length);
  const order = new Array<number>(length);
  for (let i = 0; i < length; i++) {
    values[i] = getValue(references[i]!);
    order[i] = i;
  }

  // Native sort preserves input order for equal values; no index tie-breaker.
  order.sort((a, b) => compare(values[a]!, values[b]!));

  const result = new Array<Ref>(length);
  for (let i = 0; i < length; i++) {
    result[i] = references[order[i]!]!;
  }
  return result;
}
