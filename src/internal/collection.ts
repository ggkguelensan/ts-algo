// Structural detection also supports readonly Map wrappers and other realms.
// Future map-like structures implement ReadonlyMap; ordinary sources Iterable.
export function isMapLike<Ref, Entity>(
  source: ReadonlyMap<Ref, Entity> | Iterable<Ref>,
): source is ReadonlyMap<Ref, Entity> {
  return typeof source === "object" && source !== null
    && "get" in source && typeof source.get === "function"
    && "has" in source && typeof source.has === "function"
    && "forEach" in source && typeof source.forEach === "function"
    && "keys" in source && typeof source.keys === "function"
    && "values" in source && typeof source.values === "function"
    && "entries" in source && typeof source.entries === "function"
    && "size" in source && typeof source.size === "number";
}

