import { quickSortInPlace } from "./quick-sort.js";
import type { Compare } from "../src/compare.js";

export interface SortOptions {
  /** Preserve input order for equal values. Default: true. */
  stable?: boolean;
}

/**
 * Returns the original references in a new sorted array.
 * Entities and input references are not mutated. Values are cached once.
 * Dense input; callbacks must not mutate input or change ordering mid-sort.
 */
export function sortedReferencesQuickSort<Ref, Value>(
  references: readonly Ref[],
  getValue: (ref: Ref) => Value,
  compare: Compare<Value>,
  options: SortOptions = {},
): Ref[] {
  const length = references.length;
  if (length <= 1) return references.slice();

  const values = new Array<Value>(length);
  const order = new Array<number>(length);
  for (let i = 0; i < length; i++) {
    values[i] = getValue(references[i]!);
    order[i] = i;
  }

  const stable = options.stable ?? true;
  const compareIndices: Compare<number> = stable
    ? (a, b) => {
        const result = compare(values[a]!, values[b]!);
        return result === 0 ? a - b : result;
      }
    : (a, b) => compare(values[a]!, values[b]!);

  quickSortInPlace(order, compareIndices);

  const result = new Array<Ref>(length);
  for (let i = 0; i < length; i++) {
    result[i] = references[order[i]!]!;
  }
  return result;
}
