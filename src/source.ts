import { isMapLike } from "./internal/collection.js";
import { sourceState } from "./internal/source-state.js";

/** Iterable references with live entity resolution. No per-reference wrapper. */
export interface Source<Ref, Entity, Context = undefined> extends Iterable<Ref> {
  readonly [sourceState]: {
    readonly resolve: (ref: Ref) => Entity;
    readonly context: Context;
  };
}

/** Preserve an existing binding, including its resolver and context. */
export function from<Ref, Entity, Context>(source: Source<Ref, Entity, Context>): Source<Ref, Entity, Context>;
/** Live keys and values; a present undefined value is not a missing entity. */
export function from<Ref, Entity>(source: ReadonlyMap<Ref, Entity>): Source<Ref, Entity>;
/** Values are both references and entities. A one-shot iterable stays one-shot. */
export function from<Ref>(source: Iterable<Ref>): Source<Ref, Ref>;
/** Rebind iterable references to an explicit resolver and source context. */
export function from<Ref, Entity, Context>(source: Iterable<Ref>, options: {
  context: Context;
  get: (ref: Ref, context: Context) => Entity;
}): Source<Ref, Entity, Context>;
export function from<Ref, Entity, Context>(
  source: Iterable<Ref> | ReadonlyMap<Ref, Entity>,
  options?: { context: Context; get: (ref: Ref, context: Context) => Entity },
): Source<Ref, Entity, Context> {
  if (options) {
    // This overload accepts iterable references, not the automatic Map binding.
    return bind(source as Iterable<Ref>, ref => options.get(ref, options.context), options.context);
  }
  if (isSource<Ref, Entity, Context>(source)) return source;
  if (isMapLike(source)) {
    return bind({ [Symbol.iterator]: () => source.keys() }, ref => {
      const value = source.get(ref);
      if (value === undefined && !source.has(ref)) throw new RangeError("Missing entity");
      return value as Entity; // Membership proves a present, possibly undefined value.
    }, undefined as Context); // Automatic-binding overloads have undefined context.
  }
  return bind(source as Iterable<Ref>, ref => ref as unknown as Entity, undefined as Context);
}

function bind<Ref, Entity, Context>(
  refs: Iterable<Ref>, resolve: (ref: Ref) => Entity, context: Context,
): Source<Ref, Entity, Context> {
  return { [sourceState]: { resolve, context }, [Symbol.iterator]: () => refs[Symbol.iterator]() };
}

/** Replace reference iteration without copying refs or changing entity resolution. */
export function subset<Ref, Entity, Context>(
  source: Source<Ref, Entity, Context>, refs: Iterable<Ref>,
): Source<Ref, Entity, Context> {
  const data = source[sourceState];
  return bind(refs, data.resolve, data.context);
}

/** Resolve one reference; custom getters define their own absence/error contract. */
export function entity<Ref, Entity, Context>(source: Source<Ref, Entity, Context>, ref: Ref): Entity {
  return source[sourceState].resolve(ref);
}

/** Internal discrimination; the private symbol is not exposed by package exports. */
export function isSource<Ref, Entity, Context>(value: unknown): value is Source<Ref, Entity, Context> {
  return typeof value === "object" && value !== null && sourceState in value;
}
