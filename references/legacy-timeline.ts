// Historical pre-migration implementation; used only by tests/benchmarks.
import { sorted } from "../src/sorted.js";
import { referenceMap } from "../src/internal/reference-map.js";
import { isMapLike } from "../src/internal/collection.js";

export interface TimeSpan { readonly start: number; readonly end: number; }
export type EventTime = number | TimeSpan;
export type TemporalFields<Ref> = (
  { readonly at: number } | TimeSpan
) & { readonly causes?: Iterable<Ref>; readonly effects?: Iterable<Ref> };
export type EventPredicate<Ref, Entity, Context> = (entity: Entity, ref: Ref, context: Context) => boolean;
type Selectors<Ref, Entity, Context> = {
  readonly time: (entity: Entity, ref: Ref, context: Context) => EventTime;
  readonly causes?: (entity: Entity, ref: Ref, context: Context) => Iterable<Ref> | undefined;
  readonly effects?: (entity: Entity, ref: Ref, context: Context) => Iterable<Ref> | undefined;
};
type Item<Source> = Source extends Iterable<infer Ref> ? Ref : never;
type NonMap<Source> = Source extends ReadonlyMap<unknown, unknown> ? never : Source;

export interface Timeline<Ref, Entity, Context = undefined> extends ReadonlyMap<Ref, Entity> {
  readonly context: Context;
  timeOf(ref: Ref): EventTime;
  /** Events starting in [start, end), optionally filtered by entity properties. */
  between(start: number, end: number, predicate?: EventPredicate<Ref, Entity, Context>): Ref[];
  /** Intersections with [start, end); zero-length events behave as points. */
  overlapping(start: number, end: number, predicate?: EventPredicate<Ref, Entity, Context>): Ref[];
  filter(predicate: EventPredicate<Ref, Entity, Context>): Ref[];
  causesOf(ref: Ref): readonly Ref[];
  effectsOf(ref: Ref): readonly Ref[];
  ancestors(ref: Ref): Ref[];
  descendants(ref: Ref): Ref[];
  causalOrder(): Ref[];
}

export function timeline<Ref, Entity extends TemporalFields<Ref>>(
  source: ReadonlyMap<Ref, Entity>,
): Timeline<Ref, Entity>;
export function timeline<Entity extends TemporalFields<Entity>>(
  source: Iterable<Entity>,
): Timeline<Entity, Entity>;
export function timeline<Ref, Entity, Context>(
  source: ReadonlyMap<Ref, Entity>,
  options: Selectors<Ref, Entity, Context> & { readonly context: Context },
): Timeline<Ref, Entity, Context>;
export function timeline<Ref, Entity>(
  source: ReadonlyMap<Ref, Entity>,
  options: Selectors<Ref, Entity, undefined> & { readonly context?: undefined },
): Timeline<Ref, Entity>;
export function timeline<Source extends Iterable<unknown>, Entity, Context>(
  source: NonMap<Source>,
  options: Selectors<Item<Source>, Entity, Context> & {
    readonly context: Context;
    readonly get: (ref: Item<Source>, context: Context) => Entity;
  },
): Timeline<Item<Source>, Entity, Context>;
export function timeline<Source extends Iterable<unknown>, Entity>(
  source: NonMap<Source>,
  options: Selectors<Item<Source>, Entity, undefined> & {
    readonly context?: undefined;
    readonly get: (ref: Item<Source>, context: undefined) => Entity;
  },
): Timeline<Item<Source>, Entity>;
export function timeline<Source extends Iterable<unknown>, Context>(
  source: NonMap<Source>,
  options: Selectors<Item<Source>, Item<Source>, Context> & { readonly context: Context },
): Timeline<Item<Source>, Item<Source>, Context>;
export function timeline<Source extends Iterable<unknown>>(
  source: NonMap<Source>,
  options: Selectors<Item<Source>, Item<Source>, undefined> & { readonly context?: undefined },
): Timeline<Item<Source>, Item<Source>>;

/** Bind unique references to cached time/causality metadata. Entities stay in
 * their source: resolvers and property filters read current entities. Changing
 * temporal metadata requires rebuilding. Inputs/causal iterables must be finite.
 */
export function timeline<Ref, Entity, Context>(
  source: ReadonlyMap<Ref, Entity> | Iterable<Ref>,
  options?: Selectors<Ref, Entity, Context> & {
    readonly context?: Context;
    readonly get?: (ref: Ref, context: Context) => Entity;
  },
): Timeline<Ref, Entity, Context> {
  const { refs, resolve, context } = bindSource(source, options);
  const selectors: Selectors<Ref, Entity, Context> = options ?? {
    time: entity => {
      const fields = entity as unknown as TemporalFields<Ref>;
      return "at" in fields ? fields.at : fields;
    },
    causes: entity => (entity as unknown as TemporalFields<Ref>).causes,
    effects: entity => (entity as unknown as TemporalFields<Ref>).effects,
  };
  const positions = new Map<Ref, number>();
  for (let i = 0; i < refs.length; i++) {
    if (positions.has(refs[i]!)) throw new RangeError("Duplicate event reference");
    positions.set(refs[i]!, i);
  }
  const rawStarts = new Array<number>(refs.length);
  let rawEnds: number[] | undefined;
  const incoming = new Map<Ref, Set<Ref>>();
  const effects = new Map<Ref, Ref[]>();
  function edge(cause: Ref, effect: Ref) {
    if (!positions.has(cause) || !positions.has(effect)) throw new RangeError("Missing causal event");
    let links = incoming.get(effect);
    if (!links) { links = new Set(); incoming.set(effect, links); }
    if (links.has(cause)) return;
    links.add(cause);
    const next = effects.get(cause);
    if (next) next.push(effect); else effects.set(cause, [effect]);
  }
  for (let i = 0; i < refs.length; i++) {
    const ref = refs[i]!, entity = resolve(ref);
    const time = selectors.time(entity, ref, context);
    const start = typeof time === "number" ? time : time.start;
    const end = typeof time === "number" ? time : time.end;
    ordered(start, end);
    rawStarts[i] = start;
    if (start !== end && !rawEnds) rawEnds = rawStarts.slice();
    if (rawEnds) rawEnds[i] = end;
    const causes = selectors.causes?.(entity, ref, context);
    if (causes) for (const cause of causes) edge(cause, ref);
    const next = selectors.effects?.(entity, ref, context);
    if (next) for (const effect of next) edge(ref, effect);
  }
  const keys = sorted(refs, ref => rawStarts[positions.get(ref)!]!, (a, b) => a - b);
  const starts = keys.map(ref => rawStarts[positions.get(ref)!]!);
  const ends = rawEnds ? keys.map(ref => rawEnds![positions.get(ref)!]!) : undefined;
  for (let i = 0; i < keys.length; i++) positions.set(keys[i]!, i);
  const causes = new Map<Ref, readonly Ref[]>();
  const pending = new Map<Ref, number>();
  incoming.forEach((links, ref) => { causes.set(ref, Array.from(links)); pending.set(ref, links.size); });
  const causal = keys.filter(ref => !pending.has(ref));
  for (let i = 0; i < causal.length; i++) {
    const next = effects.get(causal[i]!);
    if (!next) continue;
    for (const effect of next) {
      const count = pending.get(effect)! - 1;
      pending.set(effect, count);
      if (count === 0) causal.push(effect);
    }
  }
  if (causal.length !== keys.length) throw new RangeError("Causal graph contains a cycle");
  return makeTimeline(keys, starts, ends, positions, causes, effects, causal, resolve, context);
}

// Resolver closures have their own scope: construction caches/selectors are
// not retained with the live entity binding.
function bindSource<Ref, Entity, Context>(
  source: ReadonlyMap<Ref, Entity> | Iterable<Ref>,
  options: { readonly context?: Context; readonly get?: (ref: Ref, context: Context) => Entity } | undefined,
) {
  const mapped = isMapLike(source) ? source : undefined;
  const refs: Ref[] = mapped ? Array.from(mapped.keys()) : Array.from(source as Iterable<Ref>);
  // Overloads require non-undefined context and correlate identity Ref/Entity.
  const context = options?.context as Context;
  const get = options?.get;
  const resolve = get ? (ref: Ref) => get(ref, context)
    : mapped ? (ref: Ref) => {
      const entity = mapped.get(ref);
      if (entity === undefined && !mapped.has(ref)) throw new RangeError("Missing event entity");
      return entity!;
    } : (ref: Ref) => ref as unknown as Entity;
  return { refs, resolve, context };
}

function makeTimeline<Ref, Entity, Context>(
  keys: readonly Ref[], starts: readonly number[], ends: readonly number[] | undefined,
  positions: ReadonlyMap<Ref, number>, causes: ReadonlyMap<Ref, readonly Ref[]>,
  effects: ReadonlyMap<Ref, readonly Ref[]>, causal: readonly Ref[],
  resolve: (ref: Ref) => Entity, context: Context,
): Timeline<Ref, Entity, Context> {
  // Only intervals need the max-end segment tree; point-only imports share
  // the start array as ends and skip this allocation entirely.
  let base = 1;
  while (base < keys.length) base *= 2;
  const maxima = ends ? new Float64Array(base * 2).fill(-Infinity) : undefined;
  if (maxima && ends) {
    for (let i = 0; i < ends.length; i++) maxima[base + i] = ends[i]!;
    for (let i = base - 1; i > 0; i--) maxima[i] = Math.max(maxima[i * 2]!, maxima[i * 2 + 1]!);
  }
  const empty: readonly Ref[] = [];
  function position(ref: Ref): number {
    const index = positions.get(ref);
    if (index === undefined) throw new RangeError("Missing timeline event");
    return index;
  }
  function lowerBound(value: number): number {
    let low = 0, high = keys.length;
    while (low < high) {
      const middle = low + Math.floor((high - low) / 2);
      if (starts[middle]! < value) low = middle + 1; else high = middle;
    }
    return low;
  }
  function append(result: Ref[], index: number, predicate?: EventPredicate<Ref, Entity, Context>) {
    const ref = keys[index]!;
    if (!predicate || predicate(resolve(ref), ref, context)) result.push(ref);
  }
  function direct(graph: ReadonlyMap<Ref, readonly Ref[]>, ref: Ref) {
    position(ref); return graph.get(ref) ?? empty;
  }
  function trace(graph: ReadonlyMap<Ref, readonly Ref[]>, ref: Ref) {
    const result = Array.from(direct(graph, ref)), seen = new Set(result);
    for (let i = 0; i < result.length; i++) for (const next of graph.get(result[i]!) ?? empty) {
      if (!seen.has(next)) { seen.add(next); result.push(next); }
    }
    return result;
  }
  return {
    ...referenceMap({ size: keys.length, has: ref => positions.has(ref),
      get: ref => positions.has(ref) ? resolve(ref) : undefined }, () => keys.values(), resolve),
    context,
    timeOf(ref) {
      const i = position(ref), start = starts[i]!, end = ends?.[i] ?? start;
      return start === end ? start : { start, end };
    },
    between(start, end, predicate) {
      ordered(start, end);
      const result: Ref[] = [], high = lowerBound(end);
      for (let i = lowerBound(start); i < high; i++) append(result, i, predicate);
      return result;
    },
    overlapping(start, end, predicate) {
      ordered(start, end);
      const result: Ref[] = [];
      if (start === end) return result;
      const low = lowerBound(start), high = lowerBound(end);
      function older(node: number, from: number, to: number) {
        if (from >= low || maxima![node]! <= start) return;
        if (to - from === 1) { append(result, from, predicate); return; }
        const middle = (from + to) / 2;
        older(node * 2, from, middle); older(node * 2 + 1, middle, to);
      }
      if (maxima && low) older(1, 0, base);
      for (let i = low; i < high; i++) append(result, i, predicate);
      return result;
    },
    filter(predicate) {
      const result: Ref[] = [];
      for (let i = 0; i < keys.length; i++) append(result, i, predicate);
      return result;
    },
    causesOf: ref => direct(causes, ref), effectsOf: ref => direct(effects, ref),
    ancestors: ref => trace(causes, ref), descendants: ref => trace(effects, ref),
    causalOrder: () => causal.slice(),
  };
}
function ordered(start: number, end: number) {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    throw new RangeError("Times must be finite and ordered");
  }
}
