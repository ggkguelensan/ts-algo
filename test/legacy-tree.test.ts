import { test } from "node:test";
import assert from "node:assert/strict";
import { sorted, pointIndex } from "../src/index.js";
import { tree } from "../references/legacy-tree.js";

test("forest hierarchy, stable sibling sorting and flat sorting share entities", () => {
  const storage = new Map<string, Readonly<{ parentId: string | null; rank: number; x: number; y: number }>>([
    ["root", Object.freeze({ parentId: null, rank: 10, x: 0, y: 0 })],
    ["b", Object.freeze({ parentId: "root", rank: 2, x: 1, y: 0 })],
    ["a", Object.freeze({ parentId: "root", rank: 1, x: 2, y: 0 })],
    ["tie", Object.freeze({ parentId: "root", rank: 1, x: 3, y: 0 })],
    ["grandchild", Object.freeze({ parentId: "b", rank: 0, x: 4, y: 0 })],
    ["other", Object.freeze({ parentId: null, rank: 20, x: 5, y: 0 })],
  ]);
  let parentCalls = 0;
  const forest = tree(storage, { parent: e => { parentCalls++; return e.parentId; } });
  assert.equal(parentCalls, storage.size);
  assert.deepEqual([...forest.keys()], ["root", "b", "grandchild", "a", "tie", "other"]);
  assert.deepEqual([...forest.ancestors("grandchild")], ["b", "root"]);
  assert.deepEqual([...forest.subtree("b")], ["b", "grandchild"]);
  let selections = 0;
  const ordered = forest.sortBy(e => { selections++; return e.rank; }, (a, b) => a - b);
  assert.equal(selections, 5); // two roots + three siblings; singleton unchanged
  assert.deepEqual([...ordered.keys()], ["root", "a", "tie", "b", "grandchild", "other"]);
  assert.deepEqual(forest.children("root"), ["b", "a", "tie"]);
  assert.equal(forest.nextSibling("b"), "a");
  assert.equal(forest.previousSibling("tie"), "a");
  assert.equal(forest.previousSibling("b"), undefined);
  assert.equal(ordered.nextSibling("a"), "tie");
  assert.equal(ordered.previousSibling("b"), "tie");
  assert.equal(ordered.nextSibling("grandchild"), undefined);
  assert.equal(ordered.nextSibling("root"), "other");
  assert.equal(ordered.previousSibling("other"), "root");
  assert.equal(ordered.parent("grandchild"), "b");
  assert.equal(ordered.get("a"), storage.get("a"));
  assert.deepEqual(sorted(forest, e => e.rank, (a, b) => a - b), ["grandchild", "a", "tie", "b", "root", "other"]);
  assert.equal(pointIndex(ordered, { x: e => e.x, y: e => e.y }).nearest(2, 0)?.reference, "a");
  assert.deepEqual([...ordered], [...ordered.keys()].map(key => [key, storage.get(key)]));
  ordered.forEach((value, key, map) => { assert.equal(map, ordered); assert.equal(value, storage.get(key)); });
  storage.clear();
  assert.equal(ordered.size, 6);
});

test("deep trees use iterative traversal; invalid forests and unknown nodes fail", () => {
  const count = 20000;
  const source = new Map(Array.from({ length: count }, (_, id) => [id, { parent: id === 0 ? null : id - 1 }] as const));
  const result = tree(source, { parent: e => e.parent });
  assert.equal([...result.subtree(0)].length, count);
  assert.equal([...result.ancestors(count - 1)].length, count - 1);
  assert.equal([...result.sortBy(e => e.parent, () => 0).keys()].length, count);
  assert.throws(() => result.children(-1), RangeError);
  assert.throws(() => result.parent(-1), RangeError);
  assert.throws(() => result.subtree(-1), RangeError);
  assert.throws(() => [...result.ancestors(-1)], RangeError);
  assert.throws(() => tree(new Map([["a", "b"]]), { parent: p => p }), /Missing/);
  assert.throws(() => tree(new Map([["a", "b"], ["b", "a"]]), { parent: p => p }), /cycle/);
  assert.throws(() => tree(new Map([["a", "a"]]), { parent: p => p }), /cycle/);
  assert.deepEqual([...tree(new Map<string, null>(), { parent: () => null })], []);
});

test("object keys and undefined entities remain valid", () => {
  const root = {}, child = {};
  const result = tree(new Map([[root, undefined], [child, undefined]]), {
    parent: (_e, key) => key === root ? null : root,
  });
  assert.deepEqual(result.children(root), [child]);
  assert.ok(result.has(child));
  assert.deepEqual(sorted(result, (_entity, key) => key === root ? 1 : 0, (a, b) => a - b), [child, root]);
  assert.deepEqual([...result.values()], [undefined, undefined]);
});
