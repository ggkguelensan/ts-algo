import type { Source } from "../source.js";
export const timeState = Symbol("timeline");
export interface Timeline<Ref, Entity, Context = undefined> extends Source<Ref, Entity, Context> {
  readonly size: number;
  readonly [timeState]: {
    readonly refs: readonly Ref[];
    readonly starts: Float64Array;
    readonly ends: Float64Array;
    readonly maxima: Float64Array | undefined;
    readonly base: number;
  };
}
/** Date/number subset of date-fns Interval; no declaration dependency on date-fns. */
export type Instant = number | Date;
export interface TimeWindow { readonly start: Instant; readonly end: Instant; }
export type EventTime = Instant | TimeWindow;
