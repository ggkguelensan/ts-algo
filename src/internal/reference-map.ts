/** Ordered readonly Map view; entities and reference order live separately. */
export function referenceMap<Key, Entity>(
  entities: ReadonlyMap<Key, Entity>, keys: () => MapIterator<Key>,
): ReadonlyMap<Key, Entity> {
  const view: ReadonlyMap<Key, Entity> = {
    size: entities.size,
    get: key => entities.get(key),
    has: key => entities.has(key),
    keys,
    *values(): MapIterator<Entity> { for (const key of keys()) yield entities.get(key)!; },
    *entries(): MapIterator<[Key, Entity]> { for (const key of keys()) yield [key, entities.get(key)!]; },
    [Symbol.iterator]() { return this.entries(); },
    forEach(callback, thisArg) {
      for (const key of keys()) callback.call(thisArg, entities.get(key)!, key, this);
    },
  };
  return view;
}

export function snapshotMap<Key, Entity>(source: ReadonlyMap<Key, Entity>): Map<Key, Entity> {
  const result = new Map<Key, Entity>();
  source.forEach((entity, key) => { result.set(key, entity); });
  return result;
}
