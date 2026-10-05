import type { Compare } from "./quick-sort.js";
import { sortedReferences } from "./sorted-references.js";
import { referenceMap, snapshotMap } from "./internal/reference-map.js";

export interface Tree<Key, Entity> extends ReadonlyMap<Key, Entity> {
  readonly roots: readonly Key[];
  children(key: Key): readonly Key[];
  parent(key: Key): Key | undefined;
  /** Preorder, including the starting node; iterative, safe for deep trees. */
  subtree(key: Key): IterableIterator<Key>;
  /** Immediate parent first; excludes the starting node. */
  ancestors(key: Key): IterableIterator<Key>;
  /** New view, stable sibling order; relationships and entities are shared. */
  sortBy<Value>(select: (entity: Entity, key: Key) => Value, compare: Compare<Value>): Tree<Key, Entity>;
}

/** Forest from a Map of entities. Null/undefined parents denote roots.
 * Keys must be non-nullish. Selectors run once per entity and must not mutate
 * the source. Missing parents and cycles are errors. Membership is a snapshot.
 */
export function tree<Key extends NonNullable<unknown>, Entity>(
  source: ReadonlyMap<Key, Entity>,
  options: { readonly parent: (entity: Entity, key: Key) => Key | null | undefined },
): Tree<Key, Entity> {
  const entities = snapshotMap(source);
  const roots: Key[] = [];
  const parents = new Map<Key, Key>();
  const children = new Map<Key, Key[]>();
  entities.forEach((entity, key) => {
    if (key == null) throw new RangeError("Tree keys must be non-nullish");
    const parent = options.parent(entity, key);
    if (parent == null) roots.push(key);
    else {
      if (!entities.has(parent)) throw new RangeError("Missing tree parent");
      parents.set(key, parent);
      const siblings = children.get(parent);
      if (siblings) siblings.push(key);
      else children.set(parent, [key]);
    }
  });
  const view = makeTree(entities, roots, parents, children);
  let visited = 0;
  for (const _key of view.keys()) visited++;
  if (visited !== entities.size) throw new RangeError("Tree contains a cycle");
  return view;
}

function makeTree<Key, Entity>(
  entities: ReadonlyMap<Key, Entity>, roots: readonly Key[],
  parents: ReadonlyMap<Key, Key>, children: ReadonlyMap<Key, readonly Key[]>,
): Tree<Key, Entity> {
  const empty: readonly Key[] = [];
  function requireKey(key: Key) {
    if (!entities.has(key)) throw new RangeError("Missing tree node");
  }
  function* walk(start: readonly Key[]): MapIterator<Key> {
    const stack = Array.from(start).reverse();
    while (stack.length) {
      const key = stack.pop()!;
      yield key;
      const next = children.get(key);
      if (next) for (let i = next.length - 1; i >= 0; i--) stack.push(next[i]!);
    }
  }
  return {
    ...referenceMap(entities, () => walk(roots)),
    roots,
    children(key) { requireKey(key); return children.get(key) ?? empty; },
    parent(key) { requireKey(key); return parents.get(key); },
    subtree(key) { requireKey(key); return walk([key]); },
    *ancestors(key) {
      requireKey(key);
      while (parents.has(key)) { key = parents.get(key)!; yield key; }
    },
    sortBy(select, compare) {
      const sort = (keys: readonly Key[]) => keys.length < 2 ? keys
        : sortedReferences(keys, key => select(entities.get(key)!, key), compare);
      const orderedChildren = new Map<Key, readonly Key[]>();
      children.forEach((keys, key) => { orderedChildren.set(key, sort(keys)); });
      return makeTree(entities, sort(roots), parents, orderedChildren);
    },
  };
}
