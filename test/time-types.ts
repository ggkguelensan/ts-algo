import { from, collect, sorted, type Brand, type Source } from "../src/index.js";
import { timeline, startsBetween, overlapping, type TimeWindow, type Timeline } from "../src/time/index.js";
import { freeSlots, type Span } from "../src/ranges/index.js";
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type Id = Brand<string, "EventId">;
declare const store: ReadonlyMap<Id, { title: string }>;
const index = timeline(from(store), () => new Date(0));
type Index = Assert<Equal<typeof index, Timeline<Id, { title: string }>>>;
const selection = overlapping(index, { start: new Date(0), end: 1 });
type Selection = Assert<Equal<typeof selection, Source<Id, { title: string }>>>;
const order = sorted(index, e => e.title, (a, b) => a.localeCompare(b));
type Order = Assert<Equal<typeof order, Id[]>>;
const rows = collect(selection, { context: { suffix: "!" }, select: (e, id, ctx) => ({ id, title: e.title + ctx.suffix }) });
type Rows = Assert<Equal<typeof rows, { id: Id; title: string }[]>>;
const external = from(["a"], { context: { title: "A", at: 1 }, get: (_id, ctx) => ({ title: ctx.title }) });
const contextual = timeline(external, (e, id, ctx) => ctx.at + id.length + e.title.length);
const refs = collect(startsBetween(contextual, { start: 0, end: 100 }));
type Refs = Assert<Equal<typeof refs, string[]>>;
const interval: TimeWindow = { start: new Date(0), end: new Date(10) };
overlapping(index, interval);
const gaps: Span[] = freeSlots([], { start: 0, end: 1 });
// @ts-expect-error entities have no mandatory time property; getter is required.
timeline(from(store));
// @ts-expect-error getter returns time, not arbitrary strings.
timeline(from(store), e => e.title);
// @ts-expect-error strings must be normalized before temporal operations.
overlapping(index, { start: "2026-01-01", end: new Date(0) });
// @ts-expect-error timeline has no graph methods.
index.causesOf("a");
// @ts-expect-error property callback receives the entity, not its branded ref.
sorted(index, (id: Id) => id, (a, b) => a.localeCompare(b));
// @ts-expect-error business operation context does not inherit source context.
collect(overlapping(contextual, interval), { context: { suffix: "!" }, select: (e, id, ctx) => ctx.at });
void gaps;
