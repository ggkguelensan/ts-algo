import { measure, checksum } from "./measure.js";
import { writeFileSync } from "node:fs";
import { cpus } from "node:os";
import assert from "node:assert/strict";
import { pointIndex, type Bounds } from "../src/index.js";

const runtime = process.versions.bun ? "bun" : "node";
const metadata = { runtime, version: process.versions.bun ?? process.version,
  engine: runtime === "bun" ? "JavaScriptCore" : `V8 ${process.versions.v8}`,
  cpu: cpus()[0]?.model, platform: `${process.platform}/${process.arch}`,
  samples: 7, warmups: 3, queries: 64, date: new Date().toISOString() };
const coordinates = { x: (p: Point) => p.x, y: (p: Point) => p.y };
type Point = { x: number; y: number; id: number };
let seed = 0xabcdef;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }
function linearNearest(points: readonly Point[], x: number, y: number): Point | undefined {
  let found: Point | undefined, best = Infinity;
  for (const p of points) {
    const distance = Math.hypot(p.x - x, p.y - y);
    if (!found || distance < best) { found = p; best = distance; }
  }
  return found;
}
function matches(p: Point, b: Bounds) {
  return p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;
}
const rows = [];
for (const n of [1000, 10000, 100000]) {
  for (const shape of ["uniform", "clustered", "identical"] as const) {
    const points = Array.from({ length: n }, (_, id) => ({ id,
      x: shape === "identical" ? 500 : random() * (shape === "clustered" ? 10 : 1000),
      y: shape === "identical" ? 500 : random() * (shape === "clustered" ? 10 : 1000),
    }));
    const extent = shape === "clustered" ? 10 : 1000;
    const queries = Array.from({ length: metadata.queries }, () => {
      const x = random() * extent, y = random() * extent;
      return { x, y, bounds: { minX: x, minY: y, maxX: x + extent / 50, maxY: y + extent / 50 } };
    });
    const index = pointIndex(points, coordinates);
    for (const q of queries) {
      assert.deepEqual(index.within(q.bounds).map(p => p.id).sort((a, b) => a - b), points.filter(p => matches(p, q.bounds)).map(p => p.id));
      assert.equal(index.nearest(q.x, q.y)?.reference, linearNearest(points, q.x, q.y));
    }
    const range = (tree = index) => queries.reduce((sum, q) => sum + tree.within(q.bounds).length, 0);
    const nearest = (tree = index) => queries.reduce((sum, q) => sum + (tree.nearest(q.x, q.y)?.reference.id ?? 0), 0);
    const first = queries[0]!.bounds;
    const wide = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
    assert.equal(index.within(wide).length, points.length);
    const times = measure({
      build: () => pointIndex(points, coordinates).size,
      "range-native": () => queries.reduce((sum, q) => sum + points.filter(p => matches(p, q.bounds)).length, 0),
      "range-index": () => range(),
      "range-build-query": () => range(pointIndex(points, coordinates)),
      "nearest-linear": () => queries.reduce((sum, q) => sum + (linearNearest(points, q.x, q.y)?.id ?? 0), 0),
      "nearest-index": () => nearest(),
      "nearest-build-query": () => nearest(pointIndex(points, coordinates)),
      "single-range-native": () => points.filter(p => matches(p, first)).length,
      "single-range-build-query": () => pointIndex(points, coordinates).within(first).length,
      "wide-range-native": () => points.filter(p => matches(p, wide)).length,
      "wide-range-index": () => index.within(wide).length,
    }, metadata);
    rows.push({ n, shape, times });
  }
}
const stem = `docs/spatial-results-${runtime}`;
writeFileSync(`${stem}.json`, JSON.stringify({ metadata, rows, sink: checksum }, null, 2) + "\n");
const names = ["build", "range-native", "range-index", "range-build-query", "nearest-linear", "nearest-index", "nearest-build-query"];
const otherNames = ["single-range-native", "single-range-build-query", "wide-range-native", "wide-range-index"];
const text = `# Spatial benchmark: ${runtime}\n\n${metadata.version}; ${metadata.engine}; ${metadata.cpu}; ${metadata.platform}.\n\n` +
  `Median milliseconds; ${metadata.samples} samples after ${metadata.warmups} warmups. Query columns contain batches of ${metadata.queries} queries. Native range uses Array.filter; nearest uses a linear loop. Both return original references. Build-query includes constructing the index. Every query is checked against the baseline before timing. Variants rotate; automatic GC may occur.\n\n` +
  `| n | shape | ${names.join(" | ")} |\n|---|---|${names.map(() => "---:").join("|")}|\n` +
  rows.map(r => `| ${r.n} | ${r.shape} | ${names.map(name => r.times[name]!.median.toFixed(3)).join(" | ")} |`).join("\n") +
  "\n\nOne narrow query (including build for the index) and one whole-domain query (prebuilt index):\n\n" +
  `| n | shape | ${otherNames.join(" | ")} |\n|---|---|${otherNames.map(() => "---:").join("|")}|\n` +
  rows.map(r => `| ${r.n} | ${r.shape} | ${otherNames.map(name => r.times[name]!.median.toFixed(3)).join(" | ")} |`).join("\n") +
  "\n\nThese are static point workloads, not rectangle collisions, geography, or continuously updated positions. Identical points expose the linear worst case for nearest queries. Broad ranges also approach a full scan. Heap usage and browser-engine performance are not measured. Small timing differences need repeated runs.\n";
writeFileSync(`${stem}.md`, text);
console.log(text);
