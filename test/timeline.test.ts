import { test } from "node:test";
import assert from "node:assert/strict";
import { timeline, sortedReferences } from "../src/index.js";

test("chronology, owners and multi-cause DAG remain independent", () => {
  const source = new Map<string, Readonly<{ at: number; owner: string; causes: readonly string[] }>>([
    ["paid", Object.freeze({ at: 30, owner: "customer", causes: ["order", "approved"] })],
    ["order", Object.freeze({ at: 10, owner: "customer", causes: [] })],
    ["approved", Object.freeze({ at: 40, owner: "manager", causes: ["order", "order"] })],
    ["shipped", Object.freeze({ at: 30, owner: "warehouse", causes: ["paid", "approved"] })],
  ]);
  const calls = { at: 0, owner: 0, causes: 0 };
  const events = timeline(source, {
    at: e => { calls.at++; return e.at; },
    owner: e => { calls.owner++; return e.owner; },
    causes: e => { calls.causes++; return e.causes; },
  });
  assert.deepEqual([...events.keys()], ["order", "paid", "shipped", "approved"]);
  assert.deepEqual(events.between(10, 30), ["order"]);
  assert.deepEqual(events.between(30, 31), ["paid", "shipped"]);
  assert.deepEqual(events.between(30, 30), []);
  assert.deepEqual(events.forOwner("customer").between(0, 100), ["order", "paid"]);
  assert.equal(events.forOwner("absent").size, 0);
  assert.deepEqual(events.causesOf("approved"), ["order"]);
  assert.deepEqual(events.effectsOf("order"), ["paid", "approved"]);
  assert.deepEqual(events.ancestors("shipped"), ["paid", "approved", "order"]);
  assert.deepEqual(events.descendants("order"), ["paid", "approved", "shipped"]);
  assert.deepEqual(events.causalOrder(), ["order", "approved", "paid", "shipped"]);
  assert.deepEqual(sortedReferences(events, e => e.at, (a, b) => b - a), ["approved", "paid", "shipped", "order"]);
  events.forEach((value, key, map) => { assert.equal(map, events); assert.equal(value, source.get(key)); });
  assert.deepEqual(calls, { at: 4, owner: 4, causes: 4 });
  source.clear();
  assert.equal(events.size, 4);
});

test("differential owner/time queries on random data and DAG reachability", () => {
  let seed = 91;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const source = new Map(Array.from({ length: 1000 }, (_, id) => [id, {
    at: Math.floor(random() * 50), owner: id % 7,
    causes: id ? [Math.floor(random() * id), Math.floor(random() * id)] : [],
  }] as const));
  const events = timeline(source, { at: e => e.at, owner: e => e.owner, causes: e => e.causes });
  for (let q = 0; q < 100; q++) {
    const start = Math.floor(random() * 60) - 5, end = start + Math.floor(random() * 20);
    const expected = [...source].filter(([, e]) => e.at >= start && e.at < end).sort((a, b) => a[1].at - b[1].at);
    assert.deepEqual(events.between(start, end), expected.map(([key]) => key));
    const owner = q % 7;
    assert.deepEqual(events.forOwner(owner).between(start, end), expected.filter(([, e]) => e.owner === owner).map(([key]) => key));
  }
  const positions = new Map(events.causalOrder().map((key, index) => [key, index]));
  source.forEach((e, key) => { for (const cause of e.causes) assert.ok(positions.get(cause)! < positions.get(key)!); });
  const expected = new Set<number>();
  const stack = [999];
  while (stack.length) for (const cause of source.get(stack.pop()!)!.causes) {
    if (!expected.has(cause)) { expected.add(cause); stack.push(cause); }
  }
  assert.deepEqual(new Set(events.ancestors(999)), expected);
});

test("empty timelines, identity keys/owners and invalid data", () => {
  const key = {}, owner = {};
  const events = timeline(new Map([[key, { at: 0, owner }], [undefined, { at: 1, owner: undefined }]]), {
    at: e => e.at, owner: e => e.owner,
  });
  assert.deepEqual(events.forOwner(owner).between(0, 1), [key]);
  assert.deepEqual(events.forOwner(undefined).between(0, 2), [undefined]);
  assert.deepEqual(events.causalOrder(), [key, undefined]);
  const empty = timeline(new Map<string, number>(), { at: e => e });
  assert.deepEqual(empty.between(0, 1), []);
  assert.throws(() => Reflect.apply(empty.forOwner, empty, ["owner"]), TypeError);
  assert.throws(() => events.between(1, 0), RangeError);
  assert.throws(() => events.between(NaN, 1), RangeError);
  assert.throws(() => events.causesOf("missing" as never), RangeError);
  assert.throws(() => timeline(new Map([["a", NaN]]), { at: e => e }), RangeError);
  assert.throws(() => timeline(new Map([["a", 1]]), { at: e => e, causes: () => ["missing"] }), /Missing/);
  assert.throws(() => timeline(new Map([["a", "b"], ["b", "a"]]), { at: () => 0, causes: e => [e] }), /cycle/);
  assert.throws(() => timeline(new Map([["a", 0]]), { at: e => e, causes: () => ["a"] }), /cycle/);
});
