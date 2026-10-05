// Compiled, not executed: public binding/selection overloads and inferred results.
import { from, subset, entity, collect, sorted, type Source, type Brand } from "../src/index.js";
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type Id = Brand<string, "Id">;
type Entry = { kind: "invoice"; total: number } | { kind: "note"; text: string };
declare const store: ReadonlyMap<Id, Entry>;
const source = from(store);
const rebound = from(source);
type Binding = Assert<Equal<typeof rebound, Source<Id, Entry>>>;
const refs = collect(subset(source, collect(source, { limit: 2 })));
type Refs = Assert<Equal<typeof refs, Id[]>>;
const invoice = (e: Entry): e is Extract<Entry, { kind: "invoice" }> => e.kind === "invoice";
const rows = collect(source, {
  where: invoice, select: (e, id, ctx) => ({ id, amount: e.total + ctx.minimum }), context: { minimum: 10 },
});
type Rows = Assert<Equal<typeof rows, { id: Id; amount: number }[]>>;
const selectInvoice = (e: Extract<Entry, { kind: "invoice" }>, id: Id, ctx: { minimum: number }) => ({ id, amount: e.total + ctx.minimum });
const reused = collect(source, { where: invoice, select: selectInvoice, context: { minimum: 5 } });
type Reused = Assert<Equal<typeof reused, typeof rows>>;
declare const enabled: boolean;
const conditional = collect(source, { where: e => !enabled || e.kind === "invoice", limit: enabled ? 20 : Infinity });
type Conditional = Assert<Equal<typeof conditional, Id[]>>;
const external = from(refs, { context: { store }, get: (id, ctx) => ctx.store.get(id) });
const entities = collect(external, { select: e => e });
type OptionalEntities = Assert<Equal<typeof entities, (Entry | undefined)[]>>;
const order = sorted(source, e => e.kind, (a, b) => a.localeCompare(b));
type Order = Assert<Equal<typeof order, Id[]>>;
const contextual = sorted(source, (e, id, ctx) => e.kind + id + ctx.suffix, (a, b) => a.localeCompare(b), { context: { suffix: "!" } });
type Contextual = Assert<Equal<typeof contextual, Id[]>>;
declare const readonlyArray: readonly Id[], readonlySet: ReadonlySet<Id>;
const array = collect(from(readonlyArray)), set = sorted(from(readonlySet), e => e, (a, b) => a.localeCompare(b));
type ArrayRefs = Assert<Equal<typeof array, Id[]>>;
type SetRefs = Assert<Equal<typeof set, Id[]>>;
function* literalRefs(): Generator<1 | 2> { yield 1; yield 2; }
const literal = collect(from(literalRefs()), { limit: 1 });
type Literal = Assert<Equal<typeof literal, (1 | 2)[]>>;
function project<R, E, C>(input: Source<R, E, C>, select: (e: E, ref: R) => string): string[] {
  return collect(input, { select });
}
project(source, (e, id) => id + e.kind);
declare const knownId: Id;
entity(source, knownId);
// @ts-expect-error Source sort selects entities, not references; iterable fallback is excluded.
sorted(source, (id: Id) => id, (a, b) => a.localeCompare(b));
// @ts-expect-error Map binding must not become an entry-tuple source.
collect(from(store), { select: ([id, e]: [Id, Entry]) => e });
// @ts-expect-error projected entity is narrowed to invoice.
collect(source, { where: invoice, select: e => e.text });
// @ts-expect-error callback requiring context must receive it explicitly.
collect(source, { where: (e, id, ctx: { minimum: number }) => ctx.minimum > 0 });
// @ts-expect-error source context is not operation context.
collect(external, { context: { minimum: 1 }, select: (e, id, ctx) => ctx.store });
// @ts-expect-error sorted context is required when the callback needs it.
sorted(source, (e, id, ctx: { minimum: number }) => ctx.minimum, (a, b) => a - b);
// @ts-expect-error incompatible context field.
sorted(source, (e, id, ctx) => ctx.absent, (a, b) => a - b, { context: { minimum: 1 } });
