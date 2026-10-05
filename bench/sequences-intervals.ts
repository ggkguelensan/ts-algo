import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { queue, deque, linkedList, doublyLinkedList, timeline } from "../src/index.js";
import { measure, checksum } from "./measure.js";

const runtime = process.versions.bun ? "bun" : "node";
const metadata = { runtime, version: process.versions.bun ?? process.version,
  engine: runtime === "bun" ? "JavaScriptCore" : `V8 ${process.versions.v8}`,
  cpu: cpus()[0]?.model, platform: `${process.platform}/${process.arch}`,
  samples: 7, warmups: 3, queries: 64, gcBeforeSample: true, date: new Date().toISOString() };
const sequenceRows = [];
for (const n of [1000, 10000, 50000]) {
  const values = Array.from({ length: n }, (_, i) => i);
  const variants = {
    "array-shift": () => { const a = values.slice(); let sum = 0; while (a.length) sum += a.shift()!; return sum; },
    "array-cursor": () => { const a: (number | undefined)[] = values.slice(); let sum = 0; for (let i = 0; i < a.length; i++) { sum += a[i]!; a[i] = undefined; } return sum; },
    queue: () => { const q = queue(values); let sum = 0; while (q.size) sum += q.dequeue()!; return sum; },
    deque: () => { const q = deque(values); let sum = 0; while (q.size) sum += q.popFront()!; return sum; },
    linkedList: () => { const q = linkedList(values); let sum = 0; while (q.size) sum += q.removeFirst()!; return sum; },
    doublyLinkedList: () => { const q = doublyLinkedList(values); let sum = 0; while (q.size) sum += q.removeFirst()!; return sum; },
  };
  for (const run of Object.values(variants)) assert.equal(run(), n * (n - 1) / 2);
  sequenceRows.push({ n, workload: "fifo-build-drain", times: measure(variants, metadata) });
  const ends = {
    array: () => { const a = values.slice(); let sum = 0, front = true; while (a.length) { sum += (front ? a.shift() : a.pop())!; front = !front; } return sum; },
    deque: () => { const q = deque(values); let sum = 0, front = true; while (q.size) { sum += (front ? q.popFront() : q.popBack())!; front = !front; } return sum; },
  };
  for (const run of Object.values(ends)) assert.equal(run(), n * (n - 1) / 2);
  sequenceRows.push({ n, workload: "alternate-ends-build-drain", times: measure(ends, metadata) });
  const edits = {
    "array-indexOf-splice": () => { const a = values.slice(); for (let i = 0; i < n; i += 2) a.splice(a.indexOf(i), 1); return a.reduce((sum, x) => sum + x, 0); },
    "array-filter-batch": () => values.filter(x => x % 2).reduce((sum, x) => sum + x, 0),
    "list-handles": () => { const list = doublyLinkedList<number>(); const handles = values.map(x => list.append(x)); for (let i = 0; i < n; i += 2) list.remove(handles[i]!); let sum = 0; for (const x of list) sum += x; return sum; },
  };
  const expected = values.filter(x => x % 2).reduce((sum, x) => sum + x, 0);
  for (const run of Object.values(edits)) assert.equal(run(), expected);
  sequenceRows.push({ n, workload: "remove-even-build-edit", times: measure(edits, metadata) });
}
let seed = 123;
function random() { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; }
const intervalRows = [];
for (const n of [1000, 10000, 100000]) {
  for (const shape of ["points", "short", "long", "mixed"] as const) {
    const source = new Map(Array.from({ length: n }, (_, id) => {
      const start = Math.floor(random() * n);
      const duration = shape === "points" ? 0 : shape === "long" ? n : shape === "mixed" && id % 2 ? 0 : Math.floor(random() * 20);
      return [id, { start, end: start + duration }] as const;
    }));
    const index = timeline(source);
    const ordered = [...source.keys()].toSorted((a, b) => source.get(a)!.start - source.get(b)!.start);
    const starts = ordered.map(ref => source.get(ref)!.start), ends = ordered.map(ref => source.get(ref)!.end);
    const queries = Array.from({ length: metadata.queries }, () => { const start = Math.floor(random() * n); return { start, end: start + Math.max(1, n / 100) }; });
    const scan = (q: typeof queries[number]) => ordered.filter((_ref, i) => starts[i] === ends[i]
      ? starts[i]! >= q.start && starts[i]! < q.end : starts[i]! < q.end && ends[i]! > q.start);
    for (const q of queries) assert.deepEqual(index.overlapping(q.start, q.end), scan(q));
    const ranges = (value = index) => queries.reduce((sum, q) => sum + value.overlapping(q.start, q.end).length, 0);
    intervalRows.push({ n, shape, times: measure({
      build: () => timeline(source).size,
      "native-cached-filter": () => queries.reduce((sum, q) => sum + scan(q).length, 0),
      "overlap-index": () => ranges(),
      "build-and-overlap": () => ranges(timeline(source)),
    }, metadata) });
  }
}
const stem = `docs/sequences-intervals-results-${runtime}`;
writeFileSync(`${stem}.json`, JSON.stringify({ metadata, sequenceRows, intervalRows, checksum }, null, 2) + "\n");
let report = `# Sequences and interval search: ${runtime}\n\n${metadata.version}; ${metadata.engine}; ${metadata.cpu}; ${metadata.platform}.\n\n` +
  `Median ms, ${metadata.samples} samples, ${metadata.warmups} warmups, rotated variants. Explicit GC outside each timed call; GC during the call is included. JSON contains min/max.\n\n`;
for (const workload of ["fifo-build-drain", "alternate-ends-build-drain", "remove-even-build-edit"]) {
  const rows = sequenceRows.filter(r => r.workload === workload), names = Object.keys(rows[0]!.times);
  report += `## ${workload}\n\n| n | ${names.join(" | ")} |\n|---|${names.map(() => "---:").join("|")}|\n` +
    rows.map(r => `| ${r.n} | ${names.map(name => r.times[name]!.median.toFixed(3)).join(" | ")} |`).join("\n") + "\n\n";
}
report += "Sequence timings include building/copying and draining/editing. FIFO cursor baseline releases references but does not compact its temporary array; queue also supports ongoing enqueue and compaction. Linked lists allocate nodes and check handles. Batch filter is a separate native solution for a known batch of deletions; it does not offer stable editable node handles. Checksums validated before timing; order/identity and mixed operations covered by tests.\n\n";
const names = ["build", "native-cached-filter", "overlap-index", "build-and-overlap"];
report += `## Interval queries\n\n64 queries per column except build. Native filter uses preordered references and cached starts/ends; cache preparation is excluded. Index query excludes construction too. Both return identical chronological references, checked before timing. Points have zero duration; short durations are 0–19; long durations equal n; mixed alternates points and short intervals.\n\n| n | shape | ${names.join(" | ")} |\n|---|---|${names.map(() => "---:").join("|")}|\n` +
  intervalRows.map(r => `| ${r.n} | ${r.shape} | ${names.map(name => r.times[name]!.median.toFixed(3)).join(" | ")} |`).join("\n") +
  "\n\nSingle machine/runtime versions only. No peak heap, browser measurements or dynamic interval updates. Large outputs cost O(k); overlapping many long events can favor linear native filtering. Build-and-query includes the complete index cost. These measurements do not establish a universally faster data structure.\n";
writeFileSync(`${stem}.md`, report);
console.log(report);
