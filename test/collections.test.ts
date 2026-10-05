import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { sorted } from "../src/index.js";

const numeric = (a: number, b: number) => a - b;
type Entity = Readonly<{ age: number }>;

test("Map selects entities directly and returns original keys, with stable ties", () => {
  const anna = Object.freeze({ age: 30 });
  const boris = Object.freeze({ age: 20 });
  const vera = Object.freeze({ age: 30 });
  class Storage extends Map<string, Entity> {
    override get(_key: string): Entity | undefined {
      throw new Error("Sorting should not look up entities by key");
    }
    override entries(): MapIterator<[string, Entity]> {
      throw new Error("Sorting should not allocate entry tuples");
    }
  }
  const source = new Storage([["anna", anna], ["boris", boris], ["vera", vera]]);
  const seen: string[] = [];
  const result = sorted(source, (entity, key) => {
    seen.push(key);
    return entity.age;
  }, numeric);
  assert.deepEqual(result, ["boris", "anna", "vera"]);
  assert.deepEqual(seen, ["anna", "boris", "vera"]);
  assert.deepEqual(Array.from(source.keys()), ["anna", "boris", "vera"]);
  assert.deepEqual(Array.from(source.values()), [anna, boris, vera]);
});

test("Map permits undefined entities and preserves object key identity", () => {
  const first = Object.freeze({ id: 1 });
  const second = Object.freeze({ id: 2 });
  const source = new Map<object, Entity | undefined>([
    [first, undefined], [second, Object.freeze({ age: 20 })],
  ]);
  const result = sorted(source, entity => entity?.age ?? 100, numeric);
  assert.equal(result[0], second);
  assert.equal(result[1], first);
});

test("empty and singleton Map and Set skip selector and comparator", () => {
  const fail = (): number => { throw new Error("No sorting required"); };
  assert.deepEqual(sorted(new Map<string, Entity>(), fail, fail), []);
  assert.deepEqual(sorted(new Map([["only", { age: 9 }]]), fail, fail), ["only"]);
  assert.deepEqual(sorted(new Set<number>(), fail, fail), []);
  assert.deepEqual(sorted(new Set([9]), fail, fail), [9]);
});

test("Set returns identical entities and leaves insertion order unchanged", () => {
  const anna = Object.freeze({ age: 30 });
  const boris = Object.freeze({ age: 20 });
  const vera = Object.freeze({ age: 30 });
  const source: ReadonlySet<Entity> = new Set([anna, boris, vera]);
  let calls = 0;
  const result = sorted(source, entity => { calls++; return entity.age; }, numeric);
  assert.equal(result[0], boris);
  assert.equal(result[1], anna);
  assert.equal(result[2], vera);
  assert.deepEqual(Array.from(source), [anna, boris, vera]);
  assert.equal(calls, source.size);
});

test("one-shot iterable is consumed once and snapshots references before selecting", () => {
  let traversals = 0;
  let yields = 0;
  const source: Iterable<number> = {
    *[Symbol.iterator]() {
      if (++traversals > 1) throw new Error("Iterable consumed twice");
      for (const value of [3, 1, 2]) { yields++; yield value; }
    },
  };
  let selections = 0;
  const result = sorted(source, value => {
    assert.equal(yields, 3);
    selections++;
    return value;
  }, numeric);
  assert.deepEqual(result, [1, 2, 3]);
  assert.equal(traversals, 1);
  assert.equal(selections, 3);
});

test("Map from another realm has the same entity/key semantics", () => {
  const source: ReadonlyMap<string, Entity> = runInNewContext(
    'new Map([["older", { age: 30 }], ["younger", { age: 20 }]])',
  );
  assert.equal(source instanceof Map, false);
  assert.deepEqual(sorted(source, entity => entity.age, numeric), ["younger", "older"]);
});

test("ReadonlyMap wrapper uses the same key/entity protocol", () => {
  const storage = new Map([["older", { age: 30 }], ["younger", { age: 20 }]]);
  const view: ReadonlyMap<string, Entity> = {
    get size() { return storage.size; },
    get: key => storage.get(key),
    has: key => storage.has(key),
    keys: () => storage.keys(),
    values: () => storage.values(),
    entries: () => storage.entries(),
    [Symbol.iterator]: () => storage[Symbol.iterator](),
    forEach(callback, thisArg) {
      storage.forEach((entity, key) => callback.call(thisArg, entity, key, view));
    },
  };
  assert.deepEqual(sorted(view, entity => entity.age, numeric), ["younger", "older"]);
});

test("collection callback errors propagate without changing the source", () => {
  const source = new Map([["b", { age: 2 }], ["a", { age: 1 }]]);
  assert.throws(() => sorted(source, () => { throw new Error("select"); }, numeric), /select/);
  assert.throws(() => sorted(source, entity => entity.age, () => { throw new Error("compare"); }), /compare/);
  assert.deepEqual(Array.from(source.keys()), ["b", "a"]);
});
