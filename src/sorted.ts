import { isMapLike } from "./internal/collection.js";
import type { Compare } from "./compare.js";

type IterableItem<Source> = Source extends Iterable<infer Item> ? Item : never;

/** Sort Map keys using values selected directly from its entities. */
export function sorted<Key, Entity, Value>(
  source: ReadonlyMap<Key, Entity>,
  getValue: (entity: Entity, key: Key) => Value,
  compare: Compare<Value>,
): Key[];

/** Sort Set elements while preserving their identity. */
export function sorted<Ref, Value>(
  source: ReadonlySet<Ref>,
  getValue: (ref: Ref) => Value,
  compare: Compare<Value>,
): Ref[];

export function sorted<Ref, Value>(
  references: readonly Ref[],
  getValue: (ref: Ref) => Value,
  compare: Compare<Value>,
): Ref[];

/** Consume an iterable once; Map uses its entity/key overload instead. */
export function sorted<Source extends Iterable<unknown>, Value>(
  source: Source extends ReadonlyMap<unknown, unknown> ? never : Source,
  getValue: (ref: IterableItem<Source>) => Value,
  compare: Compare<Value>,
): IterableItem<Source>[];

/**
 * Native stable sorting with cached values. Returns a new array of references.
 * Arrays must be dense. Callbacks must not mutate the source or its ordering.
 * Empty and singleton sources do not require getValue or compare calls.
 */
export function sorted<Ref, Entity, Value>(
  source: ReadonlyMap<Ref, Entity> | Iterable<Ref>,
  getValue: ((entity: Entity, key: Ref) => Value) | ((ref: Ref) => Value),
  compare: Compare<Value>,
): Ref[] {
  if (isMapLike(source)) {
    // Overloads correlate Map inputs with entity/key selectors. TypeScript
    // cannot retain that correlation in this union implementation.
    const select = getValue as (entity: Entity, key: Ref) => Value;
    const references = new Array<Ref>(source.size);
    if (source.size <= 1) {
      source.forEach((_entity, key) => { references[0] = key; });
      return references;
    }

    const values = new Array<Value>(source.size);
    const order = new Array<number>(source.size);
    let i = 0;
    // forEach avoids one [key, entity] entry array per Map element.
    source.forEach((entity, key) => {
      references[i] = key;
      values[i] = select(entity, key);
      order[i] = i;
      i++;
    });
    return sortPrepared(references, values, order, compare);
  }

  const select = getValue as (ref: Ref) => Value;
  // Preserve the existing indexed array path. Other iterable sources need
  // one snapshot for random access; the source itself is consumed only once.
  const references: readonly Ref[] = Array.isArray(source) ? source : Array.from(source);
  return sortArray(references, select, compare);
}

function sortArray<Ref, Value>(
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

  return sortPrepared(references, values, order, compare);
}

function sortPrepared<Ref, Value>(
  references: readonly Ref[],
  values: readonly Value[],
  order: number[],
  compare: Compare<Value>,
): Ref[] {
  // Native sort preserves input order for equal values; no index tie-breaker.
  order.sort((a, b) => compare(values[a]!, values[b]!));

  const result = new Array<Ref>(references.length);
  for (let i = 0; i < references.length; i++) {
    result[i] = references[order[i]!]!;
  }
  return result;
}
