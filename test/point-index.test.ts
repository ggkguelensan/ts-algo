import { test } from "node:test";
import assert from "node:assert/strict";
import { pointIndex } from "../src/index.js";

const coordinates = { x: (p: { x: number }) => p.x, y: (p: { y: number }) => p.y };

test("Map selectors receive entities and keys, coordinates are cached, keys retain identity", () => {
  const key = Object.freeze({ id: 1 });
  const entity = Object.freeze({ x: 2, y: 3 });
  const map = new Map([[key, entity]]);
  let calls = 0;
  const index = pointIndex(map, {
    x: (p, id) => { assert.equal(id, key); calls++; return p.x; },
    y: p => { calls++; return p.y; },
  });
  assert.equal(index.size, 1);
  assert.deepEqual(index.within({ minX: 2, minY: 3, maxX: 2, maxY: 3 }), [key]);
  assert.deepEqual(index.nearest(2, 3, 0), { reference: key, distance: 0 });
  assert.equal(calls, 2);
  assert.equal(map.get(key), entity);
  map.clear();
  assert.equal(index.nearest(2, 3)?.reference, key);
});

test("empty, duplicates, tie order and undefined keys", () => {
  const empty = pointIndex([], coordinates);
  assert.equal(empty.nearest(0, 0), undefined);
  assert.deepEqual(empty.within({ minX: 0, minY: 0, maxX: 1, maxY: 1 }), []);
  const duplicates = Array.from({ length: 1000 }, (_, id) => ({ x: 0, y: 0, id }));
  const index = pointIndex(new Set(duplicates), coordinates);
  assert.equal(index.within({ minX: 0, minY: 0, maxX: 0, maxY: 0 }).length, 1000);
  assert.equal(index.nearest(0, 0)?.reference, duplicates[0]);
  const map = pointIndex(new Map([[undefined, { x: 1, y: 0 }]]), coordinates);
  assert.deepEqual(map.nearest(0, 0, 1), { reference: undefined, distance: 1 });
  assert.equal(map.nearest(0, 0, 0.9), undefined);
});

test("single-use iterable and static coordinate snapshot", () => {
  const point = { x: 1, y: 2 };
  let consumed = false;
  function* source() { yield point; consumed = true; }
  const index = pointIndex(source(), {
    x: p => { assert.ok(consumed); return p.x; }, y: p => p.y,
  });
  point.x = 999;
  assert.deepEqual(index.nearest(1, 2), { reference: point, distance: 0 });
});

test("differential range and nearest queries, clustered data and split boundaries", () => {
  let seed = 321;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (const shape of ["random", "clustered", "line"] as const) {
    const points = Array.from({ length: 2000 }, (_, id) => ({ id,
      x: shape === "line" ? 0 : Math.floor(random() * (shape === "clustered" ? 4 : 100)),
      y: Math.floor(random() * 100),
    }));
    const index = pointIndex(points, coordinates);
    for (let q = 0; q < 100; q++) {
      const x = random() * 110 - 5, y = random() * 110 - 5;
      const box = { minX: x, minY: y, maxX: x + 10, maxY: y + 10 };
      const expected = points.filter(p => p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY);
      assert.deepEqual(index.within(box).map(p => p.id).sort((a, b) => a - b), expected.map(p => p.id));
      const radius = q % 2 ? Infinity : 5;
      let best = radius, found: typeof points[number] | undefined;
      for (const p of points) {
        const distance = Math.hypot(p.x - x, p.y - y);
        if (distance <= best && (!found || distance < best)) { found = p; best = distance; }
      }
      assert.deepEqual(index.nearest(x, y, radius), found ? { reference: found, distance: best } : undefined);
    }
  }
});

test("finite coordinates, ordered bounds, valid radius, very large and tiny coordinates", () => {
  assert.throws(() => pointIndex([{ x: NaN, y: 0 }], coordinates), RangeError);
  const index = pointIndex([{ x: 1e200, y: 1e200 }], coordinates);
  assert.equal(index.nearest(0, 0)?.distance, Math.hypot(1e200, 1e200));
  assert.throws(() => index.nearest(Infinity, 0), RangeError);
  assert.throws(() => index.nearest(0, 0, -1), RangeError);
  assert.throws(() => index.nearest(0, 0, NaN), RangeError);
  assert.throws(() => index.within({ minX: 2, minY: 0, maxX: 1, maxY: 1 }), RangeError);
  const tiny = Array.from({ length: 100 }, (_, x) => ({ x: x * Number.MIN_VALUE, y: 0 }));
  assert.equal(pointIndex(tiny, coordinates).nearest(0, 0)?.reference, tiny[0]);
});
