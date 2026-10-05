import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { from, subset, entity, collect, sorted } from "../src/index.js";

const numeric = (a: number, b: number) => a - b;

test("Source keeps live Map keys/entities and explicit reference snapshots", () => {
  const store = new Map<string, { rank: number } | undefined>([["a", { rank: 1 }], ["undefined", undefined]]);
  const source = from(store), selection = subset(source, ["a"]);
  assert.equal(from(source), source);
  store.set("a", { rank: 2 }); store.set("b", { rank: 3 });
  assert.deepEqual(collect(source), ["a", "undefined", "b"]);
  assert.deepEqual(collect(selection), ["a"]);
  assert.equal(entity(selection, "a")?.rank, 2);
  assert.equal(entity(source, "undefined"), undefined);
  store.delete("a");
  assert.deepEqual(collect(selection), ["a"]);
  assert.throws(() => entity(selection, "a"), /Missing entity/);
  assert.throws(() => collect(selection, { select: e => e }), /Missing entity/);
});

test("Source supports another realm Map and preserves value identity and duplicate occurrences", () => {
  const foreign: ReadonlyMap<string, { rank: number }> = runInNewContext('new Map([["a", {rank: 2}]])');
  assert.deepEqual(collect(from(foreign)), ["a"]);
  assert.equal(entity(from(foreign), "a"), foreign.get("a"));
  const value = Object.freeze({ rank: 2 });
  assert.equal(entity(from(new Set([value])), value), value);
  assert.deepEqual(collect(from([value, value])), [value, value]);
});

test("source and operation contexts remain separate; multiple bindings share references", () => {
  const context = { records: new Map([[1, { rank: 2 }]]) };
  const source = from([1], { context, get: (id, ctx) => {
    const value = ctx.records.get(id);
    if (value === undefined) throw new RangeError("Missing metadata");
    return value;
  } });
  const other = from(source, { context: { rank: 9 }, get: (_id, ctx) => ctx });
  assert.equal(entity(other, 1).rank, 9);
  context.records.set(1, { rank: 4 });
  assert.deepEqual(collect(source, { context: { multiplier: 3 }, select: (e, _, ctx) => e.rank * ctx.multiplier }), [12]);
  assert.deepEqual(collect(source, { select: (_e, _id, ctx) => ctx }), [undefined]);
});

test("collect observes where/select order, resolves once and closes on early exit", () => {
  let closed = false;
  const calls: string[] = [];
  function* refs() { try { yield 1; yield 2; yield 3; } finally { closed = true; } }
  const source = from(refs(), { context: undefined, get: id => { calls.push(`get:${id}`); return { rank: id }; } });
  assert.deepEqual(collect(source, {
    where: (e, id) => { calls.push(`where:${id}`); return e.rank >= 2; },
    select: (e, id) => { calls.push(`select:${id}`); return { id, rank: e.rank }; },
    limit: 1,
  }), [{ id: 2, rank: 2 }]);
  assert.deepEqual(calls, ["get:1", "where:1", "get:2", "where:2", "select:2"]);
  assert.equal(closed, true);
  assert.deepEqual(collect(source), []); // Binding does not make a generator repeatable.
});

test("collect closes a generator on callback failure and validates limits without reading", () => {
  let closed = false, started = false;
  function* refs() { started = true; try { yield 1; yield 2; } finally { closed = true; } }
  const source = from(refs());
  assert.deepEqual(collect(source, { limit: 0 }), []);
  for (const limit of [-1, 0.5, NaN, -Infinity, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => collect(source, { limit }), /Invalid limit/);
  }
  assert.equal(started, false);
  assert.throws(() => collect(source, { where: () => { throw new Error("where"); } }), /where/);
  assert.equal(closed, true);
  assert.deepEqual(collect(from([undefined, undefined]), { limit: 1 }), [undefined]);
});

test("reference-only collect never resolves; projected results have no attached source binding", () => {
  const source = from([1, 2], { context: undefined, get: () => { throw new Error("unneeded entity read"); } });
  assert.deepEqual(collect(source), [1, 2]);
  const rows = collect(from(new Map([[1, { title: "a", rank: 2 }]])), { select: (e, id) => ({ id, title: e.title }) });
  assert.deepEqual(rows, [{ id: 1, title: "a" }]);
  assert.deepEqual(Reflect.ownKeys(rows[0]!), ["id", "title"]);
});

test("bound sorted snapshots refs, caches each entity value and preserves stable undefined occurrences", () => {
  let yielded = 0, reads = 0;
  const seen: (string | undefined)[] = [];
  function* refs() { for (const ref of ["b", undefined, "a", "a"]) { yielded++; yield ref; } }
  const source = from(refs(), { context: { values: new Map([["b", 3], ["a", 2], [undefined, 1]]) }, get: (ref, ctx) => {
    assert.equal(yielded, 4); reads++;
    return { rank: ctx.values.get(ref) ?? 0 };
  } });
  const result = sorted(source, (e, ref, ctx) => { seen.push(ref); return e.rank * ctx.direction; }, numeric, { context: { direction: 1 } });
  assert.deepEqual(result, [undefined, "a", "a", "b"]);
  assert.deepEqual(seen, ["b", undefined, "a", "a"]);
  assert.equal(reads, 4);
});

test("bound sorted skips singleton resolution and propagates errors without changing Map", () => {
  const fail = (): number => { throw new Error("not needed"); };
  const singleton = from([undefined], { context: undefined, get: fail });
  assert.deepEqual(sorted(singleton, fail, fail), [undefined]);
  assert.deepEqual(sorted(from([]), fail, fail), []);
  const store = new Map([["b", { rank: 2 }], ["a", { rank: 1 }]]), source = from(store);
  assert.throws(() => sorted(source, () => { throw new Error("select"); }, numeric), /select/);
  assert.throws(() => sorted(source, e => e.rank, () => { throw new Error("compare"); }), /compare/);
  assert.deepEqual([...store.keys()], ["b", "a"]);
  assert.deepEqual(sorted(source, e => e.rank, numeric), ["a", "b"]);
});
