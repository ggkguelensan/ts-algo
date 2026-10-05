import { entity, type Source } from "./source.js";

type Predicate<Ref, Entity, Context> = (entity: Entity, ref: Ref, context: Context) => boolean;
type Select<Ref, Entity, Context, Value> = (entity: Entity, ref: Ref, context: Context) => Value;
type Options<Ref, Entity, Context> = {
  where?: Predicate<Ref, Entity, Context>;
  limit?: number;
  context?: Context;
} & (undefined extends Context ? {} : { context: Context });

/** A type guard narrows the entity passed to select. */
export function collect<Ref, Entity, SourceContext, Narrow extends Entity, Value, Context = undefined>(
  source: Source<Ref, Entity, SourceContext>,
  options: Omit<Options<Ref, Entity, Context>, "where"> & {
    where: (entity: Entity, ref: Ref, context: Context) => entity is Narrow;
    select: Select<Ref, Narrow, Context, Value>;
  },
): Value[];
export function collect<Ref, Entity, SourceContext, Value, Context = undefined>(
  source: Source<Ref, Entity, SourceContext>,
  options: Options<Ref, Entity, Context> & { select: Select<Ref, Entity, Context, Value> },
): Value[];
/** Without a projection the output contains original references. */
export function collect<Ref, Entity, SourceContext, Context = undefined>(
  source: Source<Ref, Entity, SourceContext>, options?: Options<Ref, Entity, Context>,
): Ref[];

/**
 * Fixed order: where → select → limit. Resolves each visited reference once when
 * callbacks need the entity. Reference-only collection does not resolve entities.
 * limit=0 does not iterate; early exit and callback failure close the iterator.
 * Callbacks must not mutate source membership during an operation.
 */
export function collect<Ref, Entity, SourceContext, Value, Context>(
  source: Source<Ref, Entity, SourceContext>,
  options: {
    where?: Predicate<Ref, Entity, Context>;
    select?: Select<Ref, Entity, Context, Value>;
    limit?: number;
    context?: Context;
  } = {},
): (Ref | Value)[] {
  const { where, select, limit = Infinity, context } = options;
  if (limit !== Infinity && (!Number.isSafeInteger(limit) || limit < 0)) {
    throw new RangeError("Invalid limit");
  }
  const result: (Ref | Value)[] = [];
  if (limit === 0) return result;
  for (const ref of source) {
    if (!where && !select) {
      result.push(ref);
    } else {
      const value = entity(source, ref);
      // Overloads require context when its type excludes undefined.
      if (where && !where(value, ref, context as Context)) continue;
      result.push(select ? select(value, ref, context as Context) : ref);
    }
    if (result.length === limit) break;
  }
  return result;
}
