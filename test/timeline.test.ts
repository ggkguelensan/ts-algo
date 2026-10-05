import { test } from "node:test";
import assert from "node:assert/strict";
import { timeline, sorted } from "../src/index.js";

test("chronology, owners and multi-cause DAG remain independent", () => {
  const source = new Map<string, Readonly<{ at: number; owner: string; causes: readonly string[] }>>([
    ["paid", Object.freeze({ at: 30, owner: "customer", causes: ["order", "approved"] })],
    ["order", Object.freeze({ at: 10, owner: "customer", causes: [] })],
    ["approved", Object.freeze({ at: 40, owner: "manager", causes: ["order", "order"] })],
    ["shipped", Object.freeze({ at: 30, owner: "warehouse", causes: ["paid", "approved"] })],
  ]);
  const calls = { at: 0, causes: 0 };
  const events = timeline(source, {
    time: e => { calls.at++; return e.at; },
    causes: e => { calls.causes++; return e.causes; },
  });
  assert.deepEqual([...events.keys()], ["order", "paid", "shipped", "approved"]);
  assert.deepEqual(events.between(10, 30), ["order"]);
  assert.deepEqual(events.between(30, 31), ["paid", "shipped"]);
  assert.deepEqual(events.between(30, 30), []);
  assert.deepEqual(events.between(0, 100, e => e.owner === "customer"), ["order", "paid"]);
  assert.equal(events.filter(e => e.owner === "absent").length, 0);
  assert.deepEqual(events.causesOf("approved"), ["order"]);
  assert.deepEqual(events.effectsOf("order"), ["paid", "approved"]);
  assert.deepEqual(events.ancestors("shipped"), ["paid", "approved", "order"]);
  assert.deepEqual(events.descendants("order"), ["paid", "approved", "shipped"]);
  assert.deepEqual(events.causalOrder(), ["order", "approved", "paid", "shipped"]);
  assert.deepEqual(sorted(events, e => e.at, (a, b) => b - a), ["approved", "paid", "shipped", "order"]);
  events.forEach((value, key, map) => { assert.equal(map, events); assert.equal(value, source.get(key)); });
  assert.deepEqual(calls, { at: 4, causes: 4 });
  source.set("order", { at: 1000, owner: "new", causes: [] });
  assert.equal(events.get("order"), source.get("order"));
  assert.equal(events.timeOf("order"), 10); // time remains cached
  assert.deepEqual(events.filter(e => e.owner === "new"), ["order"]);
  assert.equal([...events.values()][0], source.get("order"));
  source.clear();
  assert.equal(events.size, 4);
  assert.deepEqual(events.between(10, 30), ["order"]);
  assert.throws(() => events.get("order"), /Missing event entity/);
  assert.equal(events.get("unknown"), undefined);
});

test("differential owner/time queries on random data and DAG reachability", () => {
  let seed = 91;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  const source = new Map(Array.from({ length: 1000 }, (_, id) => [id, {
    at: Math.floor(random() * 50), owner: id % 7,
    causes: id ? [Math.floor(random() * id), Math.floor(random() * id)] : [],
  }] as const));
  const events = timeline(source, { time: e => e.at, causes: e => e.causes });
  for (let q = 0; q < 100; q++) {
    const start = Math.floor(random() * 60) - 5, end = start + Math.floor(random() * 20);
    const expected = [...source].filter(([, e]) => e.at >= start && e.at < end).sort((a, b) => a[1].at - b[1].at);
    assert.deepEqual(events.between(start, end), expected.map(([key]) => key));
    const owner = q % 7;
    assert.deepEqual(events.between(start, end, e => e.owner === owner), expected.filter(([, e]) => e.owner === owner).map(([key]) => key));
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
    time: e => e.at,
  });
  assert.deepEqual(events.between(0, 1, e => e.owner === owner), [key]);
  assert.deepEqual(events.between(0, 2, e => e.owner === undefined), [undefined]);
  assert.deepEqual(events.causalOrder(), [key, undefined]);
  const empty = timeline(new Map<string, number>(), { time: e => e });
  assert.deepEqual(empty.between(0, 1), []);
  assert.throws(() => events.between(1, 0), RangeError);
  assert.throws(() => events.between(NaN, 1), RangeError);
  assert.throws(() => events.causesOf("missing" as never), RangeError);
  assert.throws(() => timeline(new Map([["a", NaN]]), { time: e => e }), RangeError);
  assert.throws(() => timeline(new Map([["a", 1]]), { time: e => e, causes: () => ["missing"] }), /Missing/);
  assert.throws(() => timeline(new Map([["a", "b"], ["b", "a"]]), { time: () => 0, causes: e => [e] }), /cycle/);
  assert.throws(() => timeline(new Map([["a", 0]]), { time: e => e, causes: () => ["a"] }), /cycle/);
});

test("interval overlap includes earlier starts, points and half-open boundaries", () => {
  const source = new Map([
    ["long", { start: 0, end: 100 }], ["ends-at-10", { start: 1, end: 10 }],
    ["point-10", { start: 10, end: 10 }], ["starts-at-10", { start: 10, end: 20 }],
    ["starts-at-20", { start: 20, end: 30 }],
  ]);
  const events = timeline(source);
  assert.deepEqual(events.between(10, 20), ["point-10", "starts-at-10"]);
  assert.deepEqual(events.overlapping(10, 20), ["long", "point-10", "starts-at-10"]);
  assert.deepEqual(events.overlapping(10, 10), []);
  assert.deepEqual(events.overlapping(50, 60), ["long"]);
  assert.deepEqual(events.timeOf("long"), { start: 0, end: 100 });
  assert.equal(events.timeOf("point-10"), 10);
  assert.throws(() => timeline(new Map([["bad", { start: 2, end: 1 }]])), RangeError);
});

test("external context supplies entities, time, causes or effects; properties are read live", () => {
  const entities = new Map([["a", { label: "A", owner: "one" }], ["b", { label: "B", owner: "two" }]]);
  const context = {
    entity(id: string) { const result = entities.get(id); if (!result) throw new Error("Missing"); return result; },
    time(id: string) { return id === "a" ? { start: 1, end: 5 } : 3; },
    links: new Map([["a", ["b"]], ["b", []]]),
    owner: "one",
  };
  const line = timeline(["b", "a"], {
    context, get: (id, ctx) => ctx.entity(id),
    time: (_event, id, ctx) => ctx.time(id), effects: (_event, id, ctx) => ctx.links.get(id),
  });
  assert.equal(line.context, context);
  assert.deepEqual(line.causesOf("b"), ["a"]);
  assert.deepEqual(line.effectsOf("a"), ["b"]);
  assert.deepEqual(line.filter((e, _id, ctx) => e.owner === ctx.owner), ["a"]);
  entities.set("a", { label: "new", owner: "two" });
  assert.equal(line.get("a"), entities.get("a"));
  assert.deepEqual(line.filter((e, _id, ctx) => e.owner === ctx.owner), []);
  assert.deepEqual(line.overlapping(4, 5), ["a"]);
  assert.deepEqual(line.overlapping(2, 4, e => e.owner === "two"), ["a", "b"]);
  assert.deepEqual(sorted(line, e => e.label, (a, b) => a.localeCompare(b)), ["b", "a"]);
  entities.clear();
  assert.deepEqual(line.between(0, 10), ["a", "b"]); // metadata doesn't need entity resolution
  assert.throws(() => line.filter(() => true), /Missing/);
  assert.throws(() => timeline(["a", "a"], { time: () => 0 }), /Duplicate/);
});

test("entities may themselves be references; cause/effect declarations deduplicate", () => {
  const entities = [{ at: 2, flag: true }, { at: 1, flag: false }];
  const line = timeline(new Set(entities));
  assert.deepEqual(line.filter(e => e.flag), [entities[0]]);
  const linked = timeline(new Map([
    ["a", { at: 1, causes: [] as string[], effects: ["b"] }],
    ["b", { at: 2, causes: ["a"], effects: [] as string[] }],
  ]));
  assert.deepEqual(linked.causesOf("b"), ["a"]);
  assert.deepEqual(linked.effectsOf("a"), ["b"]);
  assert.deepEqual(linked.causalOrder(), ["a", "b"]);
});

test("differential interval queries for long, overlapping, point and equal-end events", () => {
  let seed = 11;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (const shape of ["mixed", "equal-end"] as const) {
    const data = new Map(Array.from({ length: 1000 }, (_, id) => {
      const start = Math.floor(random() * 100);
      return [id, { start, end: shape === "equal-end" ? 100 : start + (id % 3 ? Math.floor(random() * 100) : 0), flag: id % 2 === 0 }] as const;
    }));
    const line = timeline(data);
    const ordered = [...data].sort((a, b) => a[1].start - b[1].start);
    for (let q = 0; q < 150; q++) {
      const start = Math.floor(random() * 220) - 10, end = start + Math.floor(random() * 30);
      const expected = ordered.filter(([, e]) => start < end && (e.start === e.end
        ? e.start >= start && e.start < end : e.start < end && e.end > start));
      assert.deepEqual(line.overlapping(start, end), expected.map(([id]) => id));
      assert.deepEqual(line.overlapping(start, end, e => e.flag), expected.filter(([, e]) => e.flag).map(([id]) => id));
    }
  }
});
