import { cpus } from "node:os";
import { writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { tree } from "../references/legacy-tree.js";
import { timeline } from "../references/legacy-timeline.js";
import { measure, checksum } from "./measure.js";

const runtime = process.versions.bun ? "bun" : "node";
const metadata = { runtime, version: process.versions.bun ?? process.version,
  engine: runtime === "bun" ? "JavaScriptCore" : `V8 ${process.versions.v8}`,
  cpu: cpus()[0]?.model, platform: `${process.platform}/${process.arch}`,
  samples: 7, warmups: 3, queries: 64, gcBeforeSample: true, date: new Date().toISOString() };
let seed = 123;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }
const rows = [];
for (const n of [1000, 10000, 100000]) {
  for (const shape of ["random", "sorted", "equal"] as const) {
    const source = new Map(Array.from({ length: n }, (_, id) => [id, {
      at: shape === "equal" ? 0 : shape === "sorted" ? id : Math.floor(random() * n),
      owner: id % 128, causes: id ? [id - 1] : [],
    }] as const));
    const options = { time: (e: { at: number }) => e.at,
      causes: (e: { causes: number[] }) => e.causes };
    const index = timeline(source, options);
    const points = [...source.keys()];
    const queries = Array.from({ length: metadata.queries }, (_, owner) => {
      const start = shape === "equal" ? 0 : Math.floor(random() * n);
      return { start, end: start + Math.max(1, Math.floor(n / 100)), owner };
    });
    // The native baseline starts preordered too; its one-time sorting cost
    // is measured separately, instead of charging each native query a sort.
    const ordered = points.toSorted((a, b) => source.get(a)!.at - source.get(b)!.at);
    const cachedTimes = ordered.map(key => source.get(key)!.at);
    const cachedOwners = ordered.map(key => source.get(key)!.owner);
    const cachedScan = (q: typeof queries[number], owner = false) => ordered.filter((_key, i) =>
      cachedTimes[i]! >= q.start && cachedTimes[i]! < q.end && (!owner || cachedOwners[i] === q.owner));
    const scan = (q: typeof queries[number], owner = false) => ordered.filter(key => {
      const e = source.get(key)!;
      return e.at >= q.start && e.at < q.end && (!owner || e.owner === q.owner);
    });
    for (const q of queries) {
      assert.deepEqual(index.between(q.start, q.end), scan(q));
      assert.deepEqual(index.between(q.start, q.end, e => e.owner === q.owner), scan(q, true));
      assert.deepEqual(index.between(q.start, q.end), cachedScan(q));
      assert.deepEqual(index.between(q.start, q.end, e => e.owner === q.owner), cachedScan(q, true));
    }
    assert.equal(index.causalOrder().length, n);
    assert.equal(index.ancestors(n - 1).length, n - 1);
    const ranges = (value = index) => queries.reduce((sum, q) => sum + value.between(q.start, q.end).length, 0);
    const first = queries[0]!;
    const times = measure({
      "native-sort": () => points.toSorted((a, b) => source.get(a)!.at - source.get(b)!.at).length,
      "timeline-build": () => timeline(source, options).size,
      "range-native": () => queries.reduce((sum, q) => sum + scan(q).length, 0),
      "range-index": () => ranges(),
      "range-build-query": () => ranges(timeline(source, options)),
      "property-native": () => queries.reduce((sum, q) => sum + scan(q, true).length, 0),
      "property-filter": () => queries.reduce((sum, q) => sum + index.between(q.start, q.end, e => e.owner === q.owner).length, 0),
      "single-native": () => scan(first).length,
      "single-build-query": () => timeline(source, options).between(first.start, first.end).length,
      "range-native-cached": () => queries.reduce((sum, q) => sum + cachedScan(q).length, 0),
      "property-native-cached": () => queries.reduce((sum, q) => sum + cachedScan(q, true).length, 0),
    }, metadata);
    rows.push({ n, shape, times });
  }
}
const treeRows = [];
for (const n of [1000, 10000, 100000]) {
  for (const shape of ["wide", "deep"] as const) {
    const source = new Map(Array.from({ length: n }, (_, id) => [id, {
      parent: id === 0 ? null : shape === "wide" ? 0 : id - 1, rank: random(),
    }] as const));
    const forest = tree(source, { parent: e => e.parent });
    const keys = [...source.keys()];
    assert.equal([...forest.keys()].length, n);
    const sorted = forest.sortBy(e => e.rank, (a, b) => a - b);
    if (shape === "wide") assert.deepEqual(sorted.children(0), keys.slice(1).sort((a, b) => source.get(a)!.rank - source.get(b)!.rank));
    else assert.deepEqual([...sorted.keys()], keys);
    treeRows.push({ n, shape, times: measure({
      build: () => tree(source, { parent: e => e.parent }).size,
      iterate: () => { let count = 0; for (const _key of forest.keys()) count++; return count; },
      "sort-siblings": () => forest.sortBy(e => e.rank, (a, b) => a - b).size,
      "sibling-lookups": () => { let count = 0; for (const key of keys) if (forest.nextSibling(key) !== undefined) count++; return count; },
    }, metadata) });
  }
}
const stem = `docs/hierarchy-time-results-${runtime}`;
writeFileSync(`${stem}.json`, JSON.stringify({ metadata, rows, treeRows, checksum }, null, 2) + "\n");
const names = ["native-sort", "timeline-build", "range-native", "range-index", "range-build-query", "property-native", "property-filter", "single-native", "single-build-query"];
const report = `# Hierarchy and timeline: ${runtime}\n\n${metadata.version}; ${metadata.engine}; ${metadata.cpu}; ${metadata.platform}.\n\n` +
  `Median ms, ${metadata.samples} samples, ${metadata.warmups} warmups, rotated variants. Explicit GC before each variant (outside timing); automatic GC within a measured call is possible. Range/property columns are batches of ${metadata.queries} queries; single columns one query.\n\n` +
  "Timeline builds temporal/causal indexes, for points and a causal chain. Native-sort builds chronological references only, not equivalent causal indexes. Native queries use a preordered array and Map lookups; sorting that array is excluded from query time. Both variants return the same references in the same order, checked before timing. Equal-time queries return all points, exposing result allocation cost.\n\n" +
  `| n | shape | ${names.join(" | ")} |\n|---|---|${names.map(() => "---:").join("|")}|\n` +
  rows.map(r => `| ${r.n} | ${r.shape} | ${names.map(name => r.times[name]!.median.toFixed(3)).join(" | ")} |`).join("\n") +
  "\n\nAdditional native filter baseline with precomputed time/owner arrays, avoiding Map lookups. Preparation of these caches is excluded, just as index preparation is excluded from range-index/property-filter. This isolates indexed search from selector caching. Each column is 64 queries.\n\n| n | shape | range-native-cached | range-index | property-native-cached | property-filter |\n|---|---|---:|---:|---:|---:|\n" +
  rows.map(r => `| ${r.n} | ${r.shape} | ${["range-native-cached", "range-index", "property-native-cached", "property-filter"].map(name => r.times[name]!.median.toFixed(3)).join(" | ")} |`).join("\n") +
  "\n\nTree timings are costs, not speedups over an equivalent tree library. Wide is one root with n-1 children, deep is a chain. Sibling sorting uses cached native sort; deep chains have no nontrivial sibling groups.\n\n| n | shape | build | iterate | sort-siblings | sibling-lookups |\n|---|---|---:|---:|---:|---:|\n" +
  treeRows.map(r => `| ${r.n} | ${r.shape} | ${["build", "iterate", "sort-siblings", "sibling-lookups"].map(name => r.times[name]!.median.toFixed(3)).join(" | ")} |`).join("\n") +
  "\n\nStatic time/causality indexes only. Browser performance, peak heap, edits and interval events are not measured. Causal traversal is checked but not separately timed. Automatic GC can occur; small differences need repeated runs. JSON also records min/max.\n";
writeFileSync(`${stem}.md`, report);
console.log(report);
