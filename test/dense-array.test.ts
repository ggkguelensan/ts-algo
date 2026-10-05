import assert from "node:assert/strict";
import test from "node:test";
import * as z from "zod/mini";
import { isDenseArray, sorted } from "../src/index.js";
import { denseArray } from "../src/zod/index.js";

test("density checks distinguish holes from explicit undefined", () => {
  for (const input of [[], [undefined], [null], Object.freeze([1, 2])]) {
    assert.equal(isDenseArray(input), true);
  }
  const deleted = [1, 2, 3];
  delete deleted[1];
  const extended = [1];
  extended.length = 3;
  for (const input of [new Array(1), [, 2], [1, ,], deleted, extended]) {
    assert.equal(isDenseArray(input), false);
  }
  for (const input of [null, undefined, { 0: 1, length: 1 }, new Set([1]), new Uint8Array([1])]) {
    assert.equal(isDenseArray(input), false);
  }
});

test("density checks require own indices and do not read element values", () => {
  const input = new Array(1);
  const prototype = Object.create(Array.prototype);
  prototype[0] = 42;
  Object.setPrototypeOf(input, prototype);
  assert.equal(input[0], 42);
  assert.equal(isDenseArray(input), false);
  assert.equal(denseArray(z.number()).safeParse(input).success, false);

  let reads = 0;
  const getters: number[] = [];
  Object.defineProperty(getters, 0, { get: () => { reads++; return 1; } });
  assert.equal(isDenseArray(getters), true);
  assert.equal(reads, 0);
});

test("denseArray checks original holes before optional elements can normalize them", () => {
  const item = z.optional(z.number());
  const sparse = new Array(2);
  assert.equal(z.array(item).safeParse(sparse).success, true);
  const schema = denseArray(item);
  const rejected = schema.safeParse(sparse);
  assert.equal(rejected.success, false);
  if (!rejected.success) assert.match(rejected.error.issues[0]!.message, /no holes/);
  assert.deepEqual(schema.parse([undefined, 2]), [undefined, 2]);
  assert.deepEqual(schema.parse([]), []);
  assert.equal(schema.safeParse(["wrong"]).success, false);
  assert.equal(schema.safeParse({ length: 0 }).success, false);
});

test("denseArray rejects holes before running element callbacks; preserves item errors", () => {
  let checks = 0;
  const schema = denseArray(z.custom<number>(value => { checks++; return typeof value === "number"; }));
  assert.equal(schema.safeParse([1, , 3]).success, false);
  assert.equal(checks, 0);
  assert.deepEqual(schema.parse([1, 2]), [1, 2]);
  assert.equal(checks, 2);

  const rejected = denseArray(z.number()).safeParse([1, "wrong"]);
  assert.equal(rejected.success, false);
  if (!rejected.success) assert.deepEqual(rejected.error.issues[0]!.path, [1]);
});

test("denseArray supports transformed and asynchronous element schemas", async () => {
  const lengths = denseArray(z.pipe(z.string(), z.transform(value => value.length)));
  assert.deepEqual(lengths.parse(["a", "abc"]), [1, 3]);
  const asyncSchema = denseArray(z.number().check(z.refine(async value => value > 0)));
  assert.deepEqual(await asyncSchema.parseAsync([1, 2]), [1, 2]);
  assert.equal((await asyncSchema.safeParseAsync([1, -1])).success, false);
  assert.equal((await asyncSchema.safeParseAsync(new Array(1))).success, false);
});

test("shape-only guard preserves references and works with sorted", () => {
  const entities = [{ rank: 2 }, { rank: 1 }];
  const source: unknown = entities;
  assert.equal(isDenseArray(source), true);
  assert.equal(source, entities);
  const schema = denseArray(z.custom<{ rank: number }>(value =>
    typeof value === "object" && value !== null && "rank" in value && typeof value.rank === "number"));
  const parsed = schema.parse(source);
  assert.notEqual(parsed, source);
  assert.equal(parsed[0], entities[0]);
  const result = sorted(parsed, entity => entity.rank, (a, b) => a - b);
  assert.equal(result[0], entities[1]);
  assert.equal(result[1], entities[0]);
});
