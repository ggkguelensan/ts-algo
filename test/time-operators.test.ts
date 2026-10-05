import assert from "node:assert/strict";
import test from "node:test";
import { from, entity, collect, sorted } from "../src/index.js";
import { timeline, overlapping, startsBetween } from "../src/time/index.js";
import { freeSlots, conflicts, overloaded, type Span } from "../src/ranges/index.js";

const intersects = (a: number, b: number, start: number, end: number) => start !== end && a < end && (a === b ? a >= start : b > start);

test("time operators use half-open windows, stable ties, points and nested intervals", () => {
  const times = new Map([[0, { start: 0, end: 10 }], [1, { start: 10, end: 10 }], [2, { start: 10, end: 20 }], [3, { start: -100, end: 100 }], [4, { start: 11, end: 12 }]]);
  const events = from(new Map([...times.keys()].map(id => [id, { title: `event-${id}` }]))), metadata = from(times);
  const index = timeline(events, (_, id) => entity(metadata, id));
  for (const [start = 0, end = 0] of [[0, 10], [10, 11], [10, 10], [-100, 100], [11, 12], [100, 101]]) {
    const expected = [...times].filter(([, t]) => intersects(t.start, t.end, start, end)).map(([id]) => id).sort((a, b) => times.get(a)!.start - times.get(b)!.start);
    assert.deepEqual(collect(overlapping(index, { start, end })), expected);
  }
  assert.deepEqual(collect(startsBetween(index, { start: 10, end: 12 })), [1, 2, 4]);
  assert.deepEqual(collect(index), [3, 0, 1, 2, 4]);
  assert.equal(from(index), index);
  assert.deepEqual(sorted(index, e => e.title, (a, b) => a.localeCompare(b)), [0, 1, 2, 3, 4]);
});

test("time index snapshots metadata/membership, resolves entities live and never reads graph metadata", () => {
  const records = new Map([[1, { at: 0, title: "old", get causes(): never { throw new Error("Graph was read"); } }]]);
  let calls = 0;
  const index = timeline(from(records), e => { calls++; return e.at; });
  const selection = overlapping(index, { start: 0, end: 1 });
  const replacement = { at: 100, title: "new", get causes(): never { throw new Error("Graph was read"); } };
  records.set(1, replacement); records.set(2, replacement);
  assert.equal(entity(selection, 1).title, "new");
  assert.deepEqual(collect(index), [1]);
  assert.deepEqual(collect(selection), [1]);
  assert.equal(calls, 1);
  records.delete(1);
  assert.deepEqual(collect(selection), [1]);
  assert.throws(() => collect(selection, { select: e => e.title }), /Missing entity/);
});

test("query bounds snapshot Dates now, selections are repeatable and limit stops entity reads", () => {
  let reads = 0, dateReads = 0;
  class PointDate extends Date { override getTime(): number { dateReads++; return super.getTime(); } }
  const point = new PointDate(10);
  const index = timeline(from([1, 2, 3], { context: { factor: 1 }, get: (id, ctx) => { reads++; return { rank: id * ctx.factor }; } }), e => e.rank === 1 ? point : { start: 10, end: 20 });
  assert.equal(reads, 3); assert.equal(dateReads, 1); point.setTime(100);
  const window = { start: new Date(10), end: new Date(11) }, selection = overlapping(index, window);
  window.start.setTime(100); window.end.setTime(101);
  reads = 0;
  assert.deepEqual(collect(selection, { limit: 0, select: e => e.rank }), []); assert.equal(reads, 0);
  assert.deepEqual(collect(selection, { limit: 1, select: e => e.rank }), [1]); assert.equal(reads, 1);
  assert.deepEqual(collect(selection), [1, 2, 3]); assert.deepEqual(collect(selection), [1, 2, 3]);
  assert.deepEqual(collect(startsBetween(index, { start: 10, end: 11 })), [1, 2, 3]);
});

test("time index handles one-shot refs, identity keys, undefined and invalid temporal input", () => {
  function* once() { yield undefined; yield 1; }
  const index = timeline(from(once()), () => 1);
  assert.deepEqual(collect(overlapping(index, { start: 1, end: 2 })), [undefined, 1]);
  assert.deepEqual(collect(index), [undefined, 1]);
  assert.deepEqual(collect(overlapping(timeline(from([]), () => 1), { start: 0, end: 10 })), []);
  assert.throws(() => timeline(from([1, 1]), () => 0), /Duplicate/);
  for (const value of [NaN, Infinity, -Infinity, new Date(NaN)]) assert.throws(() => timeline(from([1]), () => value), /Invalid/);
  assert.throws(() => timeline(from([1]), () => ({ start: 2, end: 1 })), /Reversed/);
  assert.throws(() => overlapping(index, { start: 2, end: 1 }), /Reversed/);
  assert.throws(() => startsBetween(index, { start: NaN, end: 2 }), /Invalid/);
  const id = Object.freeze({ id: 1 });
  assert.equal(collect(timeline(from(new Set([id])), () => 0))[0], id);
});

test("900 public temporal queries match an independent sorted linear oracle", () => {
  let seed = 123;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let round = 0; round < 30; round++) {
    const values = Array.from({ length: 100 }, (_, id) => ({ id, start: Math.floor(random() * 100), length: Math.floor(random() * 20) }));
    const index = timeline(from(values), e => ({ start: e.start, end: e.start + e.length }));
    for (let i = 0; i < 30; i++) {
      const start = Math.floor(random() * 110), end = start + Math.floor(random() * 20);
      const expected = values.filter(e => intersects(e.start, e.start + e.length, start, end)).sort((a, b) => a.start - b.start);
      assert.deepEqual(collect(overlapping(index, { start, end })), expected);
      assert.deepEqual(collect(startsBetween(index, { start, end })), values.filter(e => e.start >= start && e.start < end).sort((a, b) => a.start - b.start));
    }
  }
});

test("external schedule composes public time/core/range modules", () => {
  const events = from(new Map([["a", { owner: "alice", units: 2 }], ["b", { owner: "alice", units: 2 }], ["c", { owner: "bob", units: 1 }]]));
  const times = from(new Map([["a", { start: 0, end: 10 }], ["b", { start: 5, end: 15 }], ["c", { start: 20, end: 25 }]]));
  const index = timeline(events, (_, id) => entity(times, id)), window = { start: 0, end: 25 };
  const reservations = collect(overlapping(index, window), { context: { owner: "alice" }, where: (e, _, ctx) => e.owner === ctx.owner, select: (e, id) => ({ ...entity(times, id), units: e.units }) });
  assert.deepEqual(conflicts(reservations), [[0, 1]]);
  assert.deepEqual(freeSlots(reservations, window), [{ start: 15, end: 25 }]);
  assert.deepEqual(overloaded(reservations, window, 3), [{ start: 5, end: 10 }]);
});

test("range operations match 100 independently sampled segment/all-pair oracles", () => {
  let seed = 321;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (let round = 0; round < 100; round++) {
    const items = Array.from({ length: 20 }, () => { const start = Math.floor(random() * 20); return { start, end: start + Math.floor(random() * 8), units: 1 + Math.floor(random() * 3) }; });
    const window = { start: 0, end: 25 }, edges = [...new Set([0, 25, ...items.flatMap(e => [Math.max(0, Math.min(25, e.start)), Math.max(0, Math.min(25, e.end))])])].sort((a, b) => a - b);
    const segments = (predicate: (load: number) => boolean) => {
      const result: Span[] = [];
      for (let i = 0; i < edges.length - 1; i++) {
        const a = edges[i]!, b = edges[i + 1]!, mid = (a + b) / 2;
        const load = items.reduce((sum, e) => sum + (e.start <= mid && e.end > mid ? e.units : 0), 0);
        if (predicate(load)) { const last = result.at(-1); if (last?.end === a) result[result.length - 1] = { start: last.start, end: b }; else result.push({ start: a, end: b }); }
      }
      return result;
    };
    assert.deepEqual(freeSlots(items, window), segments(load => load === 0)); assert.deepEqual(overloaded(items, window, 3), segments(load => load > 3));
    const pairs = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) { const a = items[i]!, b = items[j]!; if (a.start < a.end && b.start < b.end && a.start < b.end && b.start < a.end) pairs.push([i, j]); }
    assert.deepEqual(conflicts(items), pairs);
  }
  assert.throws(() => conflicts(new Array<Span>(1)), /Invalid interval/);
  assert.throws(() => freeSlots([], { start: 2, end: 1 }), /Invalid interval/);
  assert.throws(() => overloaded([{ start: 0, end: 1, units: -1 }], { start: 0, end: 2 }, 1), /Invalid units/);
  assert.throws(() => overloaded([], { start: 0, end: 1 }, NaN), /Invalid capacity/);
  assert.throws(() => overloaded([{ start: 0, end: 2, units: 1e308 }, { start: 1, end: 3, units: 1e308 }], { start: 0, end: 4 }, 1e308), /Load overflow/);
});
