import { sortedReferences } from "./sorted-references.js";
import { referenceMap, snapshotMap } from "./internal/reference-map.js";

export interface TimeWindow<Key> {
  readonly size: number;
  /** Chronological references in [start, end); equal times use source order. */
  between(start: number, end: number): Key[];
}
export interface Timeline<Key, Entity, Owner = never> extends ReadonlyMap<Key, Entity>, TimeWindow<Key> {
  forOwner(owner: Owner): TimeWindow<Key>;
  causesOf(key: Key): readonly Key[];
  effectsOf(key: Key): readonly Key[];
  /** Transitive causes/effects, breadth-first, unique; excludes self. */
  ancestors(key: Key): Key[];
  descendants(key: Key): Key[];
  /** Topological order; FIFO readiness, not necessarily time order. */
  causalOrder(): Key[];
}

/** Static point-event timeline. Times are finite numbers in caller-defined
 * units; owners and causes use identity. Multiple causes form a DAG, not a
 * tree. Later timestamps on causes are allowed (e.g. clock skew).
 */
export function timeline<Key, Entity, Owner = never>(
  source: ReadonlyMap<Key, Entity>,
  options: {
    readonly at: (entity: Entity, key: Key) => number;
    readonly owner?: (entity: Entity, key: Key) => Owner;
    readonly causes?: (entity: Entity, key: Key) => Iterable<Key>;
  },
): Timeline<Key, Entity, Owner> {
  const entities = snapshotMap(source);
  const timeByKey = new Map<Key, number>();
  const ownerByKey = new Map<Key, Owner>();
  const causes = new Map<Key, Key[]>();
  const effects = new Map<Key, Key[]>();
  entities.forEach((entity, key) => {
    const time = options.at(entity, key);
    finite(time); timeByKey.set(key, time);
    if (options.owner) ownerByKey.set(key, options.owner(entity, key));
    if (options.causes) {
      const unique = new Set<Key>();
      for (const cause of options.causes(entity, key)) {
        if (!entities.has(cause)) throw new RangeError("Missing causal event");
        if (unique.has(cause)) continue;
        unique.add(cause);
        const next = effects.get(cause);
        if (next) next.push(key); else effects.set(cause, [key]);
      }
      if (unique.size) causes.set(key, Array.from(unique));
    }
  });
  const keys = sortedReferences(entities, (_entity, key) => timeByKey.get(key)!, (a, b) => a - b);
  const times = keys.map(key => timeByKey.get(key)!);
  const owners = new Map<Owner, number[]>();
  const hasOwners = options.owner !== undefined;
  if (options.owner) for (let i = 0; i < keys.length; i++) {
    const owner = ownerByKey.get(keys[i]!)!;
    const group = owners.get(owner);
    if (group) group.push(i); else owners.set(owner, [i]);
  }

  // Kahn traversal both validates the DAG and prepares causal order once.
  const pending = new Map<Key, number>();
  causes.forEach((parents, key) => { pending.set(key, parents.length); });
  const causal = keys.filter(key => !pending.has(key));
  for (let i = 0; i < causal.length; i++) {
    const nextEvents = effects.get(causal[i]!);
    if (!nextEvents) continue;
    for (const next of nextEvents) {
      const count = pending.get(next)! - 1;
      pending.set(next, count);
      if (count === 0) causal.push(next);
    }
  }
  if (causal.length !== keys.length) throw new RangeError("Causal graph contains a cycle");

  // Keep construction-only maps and user selectors out of query closures.
  return makeTimeline(entities, keys, times, owners, causes, effects, causal, hasOwners);
}

function makeTimeline<Key, Entity, Owner>(
  entities: ReadonlyMap<Key, Entity>, keys: readonly Key[], times: readonly number[],
  owners: ReadonlyMap<Owner, readonly number[]>,
  causes: ReadonlyMap<Key, readonly Key[]>, effects: ReadonlyMap<Key, readonly Key[]>,
  causal: readonly Key[], hasOwners: boolean,
): Timeline<Key, Entity, Owner> {

  const empty: readonly Key[] = [];
  function direct(graph: ReadonlyMap<Key, readonly Key[]>, key: Key): readonly Key[] {
    if (!entities.has(key)) throw new RangeError("Missing timeline event");
    return graph.get(key) ?? empty;
  }
  function trace(graph: ReadonlyMap<Key, readonly Key[]>, key: Key): Key[] {
    const result = Array.from(direct(graph, key));
    const seen = new Set(result);
    for (let i = 0; i < result.length; i++) for (const next of graph.get(result[i]!) ?? empty) {
      if (!seen.has(next)) { seen.add(next); result.push(next); }
    }
    return result;
  }
  function window(positions?: readonly number[]): TimeWindow<Key> {
    const size = positions ? positions.length : keys.length;
    const indexAt = (i: number) => positions ? positions[i]! : i;
    function lowerBound(value: number) {
      let low = 0, high = size;
      while (low < high) {
        const middle = low + Math.floor((high - low) / 2);
        if (times[indexAt(middle)]! < value) low = middle + 1;
        else high = middle;
      }
      return low;
    }
    return {
      size,
      between(start, end) {
        finite(start); finite(end);
        if (start > end) throw new RangeError("Time window must be ordered");
        const low = lowerBound(start), high = lowerBound(end);
        const result = new Array<Key>(high - low);
        for (let i = low; i < high; i++) result[i - low] = keys[indexAt(i)]!;
        return result;
      },
    };
  }
  return {
    ...referenceMap(entities, () => keys.values()),
    ...window(),
    forOwner(owner) {
      if (!hasOwners) throw new TypeError("Timeline has no owner selector");
      return window(owners.get(owner) ?? []);
    },
    causesOf: key => direct(causes, key),
    effectsOf: key => direct(effects, key),
    ancestors: key => trace(causes, key),
    descendants: key => trace(effects, key),
    causalOrder: () => causal.slice(),
  };
}
function finite(value: number) {
  if (!Number.isFinite(value)) throw new RangeError("Times must be finite");
}
