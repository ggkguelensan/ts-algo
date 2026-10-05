import assert from "node:assert/strict";
import test from "node:test";
import { sorted } from "../src/index.js";
import { quickSortInPlace } from "../references/quick-sort.js";
import { sortedReferencesQuickSort } from "../references/sorted-references-quick-sort.js";

const numeric = (a: number, b: number) => a - b;

type ArraySorter = <Ref, Value>(
  refs: readonly Ref[],
  getValue: (ref: Ref) => Value,
  compare: (a: Value, b: Value) => number,
) => Ref[];

const backends: readonly (readonly [string, ArraySorter])[] = [
  ["native", sorted],
  ["quick", sortedReferencesQuickSort],
];

for (const [backend, sortReferences] of backends) {
  test(`${backend}: empty/singleton return fresh arrays without reading values`, () => {
    const getValue = () => { throw new Error("No value required"); };
    const empty: number[] = [];
    const one = [42];
    assert.deepEqual(sortReferences(empty, getValue, numeric), []);
    assert.notEqual(sortReferences(empty, getValue, numeric), empty);
    assert.deepEqual(sortReferences(one, getValue, numeric), one);
    assert.notEqual(sortReferences(one, getValue, numeric), one);
  });

  test(`${backend}: frozen entities in external storage; stable ties; one lookup per occurrence`, () => {
    const anna = Object.freeze({ age: 30 });
    const boris = Object.freeze({ age: 20 });
    const vera = Object.freeze({ age: 30 });
    const storage = new Map<string, Readonly<{ age: number }>>([
      ["anna", anna], ["boris", boris], ["vera", vera],
    ]);
    const input = Object.freeze(["anna", "boris", "vera", "anna"]);
    let reads = 0;
    const result = sortReferences(input, id => {
      reads++;
      const entity = storage.get(id);
      if (entity === undefined) throw new Error(`Missing entity: ${id}`);
      return entity.age;
    }, numeric);
    assert.deepEqual(result, ["boris", "anna", "vera", "anna"]);
    assert.deepEqual(input, ["anna", "boris", "vera", "anna"]);
    assert.equal(reads, input.length);
    assert.equal(storage.get("anna"), anna);
    assert.equal(storage.get("boris"), boris);
    assert.equal(storage.get("vera"), vera);
  });

  test(`${backend}: preserves object reference identity and permits explicit undefined keys`, () => {
    const refs = Object.freeze([
      Object.freeze({ key: 2 }),
      Object.freeze({ key: undefined }),
      Object.freeze({ key: 1 }),
    ]);
    const result = sortReferences(refs, ref => ref.key, (a, b) => {
      if (a === b) return 0;
      if (a === undefined) return 1;
      if (b === undefined) return -1;
      return a - b;
    });
    assert.equal(result[0], refs[2]);
    assert.equal(result[1], refs[0]);
    assert.equal(result[2], refs[1]);
  });

  test(`${backend}: descending strings and callback errors`, () => {
    const refs = ["b", "a", "c"];
    assert.deepEqual(sortReferences(refs, x => x, (a, b) => b.localeCompare(a)), ["c", "b", "a"]);
    assert.throws(() => sortReferences(refs, () => { throw new Error("lookup"); }, numeric), /lookup/);
    assert.throws(() => sortReferences(refs, x => x, () => { throw new Error("compare"); }), /compare/);
    assert.deepEqual(refs, ["b", "a", "c"]);
  });

  test(`${backend}: randomized differential check against native stable sort`, () => {
    let seed = 123456;
    function next(): number {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed;
    }
    for (let run = 0; run < 300; run++) {
      const length = next() % 500;
      const keys = Array.from({ length }, () => next() % 23);
      const refs = Object.freeze(Array.from({ length }, (_, i) => i));
      const expected = refs.slice().sort((a, b) => keys[a]! - keys[b]!);
      assert.deepEqual(sortReferences(refs, i => keys[i]!, numeric), expected);
      const unstable = sortedReferencesQuickSort(refs, i => keys[i]!, numeric, { stable: false });
      assert.deepEqual(unstable.map(i => keys[i]), expected.map(i => keys[i]));
      assert.deepEqual(unstable.slice().sort(numeric), refs);
    }
  });
}

test("kernel handles structured inputs and all-equal keys in one partition", () => {
  const length = 10_000;
  for (const values of [
    Array.from({ length }, (_, i) => i),
    Array.from({ length }, (_, i) => length - i),
    Array.from({ length }, (_, i) => Math.min(i, length - i)),
  ]) {
    const expected = values.slice().sort(numeric);
    quickSortInPlace(values, numeric);
    assert.deepEqual(values, expected);
  }
  const equal = new Array<number>(length).fill(7);
  let comparisons = 0;
  quickSortInPlace(equal, (a, b) => { comparisons++; return a - b; });
  assert.equal(comparisons, length);
  assert.deepEqual(equal, new Array<number>(length).fill(7));
});
