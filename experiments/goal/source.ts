/** Experimental source binding. No per-element wrapper or entity snapshot. */
const binding = Symbol('source');
export interface Source<Ref, Entity, Context = undefined> extends Iterable<Ref> {
  readonly [binding]: {
    readonly resolve: (ref: Ref) => Entity;
    readonly context: Context;
  };
}
export function from<Ref, Entity>(source: ReadonlyMap<Ref, Entity>): Source<Ref, Entity>;
export function from<Ref>(source: Iterable<Ref>): Source<Ref, Ref>;
export function from<Ref, Entity, Context>(source: Iterable<Ref>, options: {
  context: Context; get: (ref: Ref, context: Context) => Entity;
}): Source<Ref, Entity, Context>;
export function from<Ref, Entity, Context>(source: Iterable<Ref> | ReadonlyMap<Ref, Entity>, options?: {
  context: Context; get: (ref: Ref, context: Context) => Entity;
}): Source<Ref, Entity, Context> {
  if (options) return bound(source as Iterable<Ref>, ref => options.get(ref, options.context), options.context);
  if ('get' in source && 'keys' in source && 'has' in source) {
    return bound({ [Symbol.iterator]: () => source.keys() }, ref => {
      const value = source.get(ref);
      if (value === undefined && !source.has(ref)) throw new RangeError('Missing entity');
      return value as Entity; // has distinguishes a valid undefined value from absence.
    }, undefined as Context); // Overloads restrict this path to undefined context.
  }
  return bound(source as Iterable<Ref>, ref => ref as unknown as Entity, undefined as Context);
}
function bound<Ref, Entity, Context>(refs: Iterable<Ref>, resolve: (ref: Ref) => Entity, context: Context): Source<Ref, Entity, Context> {
  return { [binding]: {resolve, context}, [Symbol.iterator]: () => refs[Symbol.iterator]() };
}
export function subset<Ref, Entity, Context>(source: Source<Ref, Entity, Context>, refs: Iterable<Ref>): Source<Ref, Entity, Context> {
  return bound(refs, source[binding].resolve, source[binding].context);
}
export function entity<Ref, Entity, Context>(source: Source<Ref, Entity, Context>, ref: Ref): Entity {
  return source[binding].resolve(ref);
}
export function sourceContext<Ref, Entity, Context>(source: Source<Ref, Entity, Context>): Context {
  return source[binding].context;
}
