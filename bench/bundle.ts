import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

// Export-only fixtures keep the selected public functions observable to the
// bundler while permitting it to remove all unused exports and TS types.
const directory = mkdtempSync(resolve("dist/bundle-"));
const rows = [];
try {
  const selections = [["sorted"], ["isDenseArray"], ["pointIndex"], ["sorted", "pointIndex"],
    ["tree"], ["timeline"],
    ["queue"], ["deque"], ["linkedList"], ["doublyLinkedList"],
    ["sorted", "pointIndex", "tree", "timeline", "queue", "deque", "linkedList", "doublyLinkedList"], ["denseArray"]];
  for (const names of selections) {
    const fixture = join(directory, "entry.ts");
    const entry = names.includes("denseArray") ? "../../src/zod/index.ts" : "../../src/index.ts";
    const coreNames = names.filter(name => name !== "timeline" && name !== "tree");
    const code = (coreNames.length ? `export { ${coreNames.join(", ")} } from "${entry}";\n` : "") +
      (names.includes("tree") ? `export {tree,children,nextSibling,previousSibling,sortChildren} from "../../src/tree/index.ts";${names.includes("timeline") ? "" : 'export {from,collect} from "../../src/index.ts";'}\n` : "") +
      (names.includes("timeline") ? `export {timeline,startsBetween,overlapping} from "../../src/time/index.ts";export {from,collect} from "../../src/index.ts";\n` : "");
    writeFileSync(fixture, code);
    const output = execFileSync("bun", ["build", fixture, "--target=browser", "--format=esm", "--minify"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const artifact = join(directory, `bundle-${rows.length}.mjs`);
    writeFileSync(artifact, output);
    const module = await import(pathToFileURL(artifact).href);
    for (const name of names) assert.equal(typeof module[name], "function");
    if (module.isDenseArray) {
      assert.equal(module.isDenseArray([undefined]), true);
      assert.equal(module.isDenseArray(new Array(1)), false);
    }
    if (module.denseArray) {
      const z = await import("zod/mini");
      const schema = module.denseArray(z.optional(z.number()));
      assert.deepEqual(schema.parse([undefined, 1]), [undefined, 1]);
      assert.equal(schema.safeParse(new Array(1)).success, false);
    }
    if (module.sorted) assert.deepEqual(module.sorted([2, 1], (x: number) => x, (a: number, b: number) => a - b), [1, 2]);
    if (module.pointIndex) assert.equal(module.pointIndex([{ x: 1, y: 2 }], {
      x: (p: { x: number }) => p.x, y: (p: { y: number }) => p.y,
    }).nearest(1, 2).distance, 0);
    if (module.tree) {
      const result = module.tree(module.from(new Map([["root", { parent: null }], ["child", { parent: "root" }], ["sibling", { parent: "root" }]])), (e: { parent: string | null }) => e.parent);
      assert.deepEqual(module.collect(result), ["root", "child", "sibling"]);
      assert.equal(module.nextSibling(result, "child"), "sibling");
      assert.equal(module.previousSibling(result, "sibling"), "child");
      assert.deepEqual(module.children(module.sortChildren(result, () => 0, () => 0), "root"), ["child", "sibling"]);
    }
    if (module.timeline) {
      const result = module.timeline(module.from(new Map([["a", { at: 1 }], ["b", { at: 2 }]])), (e: { at: number }) => e.at);
      assert.deepEqual(module.collect(module.startsBetween(result, { start: 1, end: 2 })), ["a"]);
      const context = new Map([["span", { start: 0, end: 10, flag: true }]]);
      const external = module.timeline(module.from(["span"], { context,
        get: (key: string, ctx: typeof context) => ctx.get(key)!,
      }), (e: { start: number; end: number }) => e);
      assert.deepEqual(module.collect(module.overlapping(external, { start: 5, end: 6 }), { where: (e: { flag: boolean }) => e.flag }), ["span"]);
    }
    if (module.queue) { const q = module.queue([1, 2]); assert.equal(q.dequeue(), 1); q.enqueue(3); assert.deepEqual([...q], [2, 3]); }
    if (module.deque) { const q = module.deque([1, 2]); q.pushFront(0); assert.equal(q.popBack(), 2); assert.deepEqual([...q], [0, 1]); }
    if (module.linkedList) { const list = module.linkedList([1]); list.insertAfter(list.first, 2); assert.deepEqual([...list], [1, 2]); }
    if (module.doublyLinkedList) { const list = module.doublyLinkedList([1, 2]); assert.equal(list.last.previous.value, 1); list.remove(list.first); assert.deepEqual([...list], [2]); }
    rows.push({ exports: names, bytes: Buffer.byteLength(output), gzipBytes: gzipSync(output).length });
  }
} finally { rmSync(directory, { recursive: true }); }
const metadata = { bundler: `Bun ${execFileSync("bun", ["--version"], { encoding: "utf8" }).trim()}`,
  zod: createRequire(import.meta.url)("zod/package.json").version as string,
  target: "browser", format: "esm", minify: true, date: new Date().toISOString() };
writeFileSync("docs/bundle-results.json", JSON.stringify({ metadata, rows }, null, 2) + "\n");
const report = `# Browser bundle size\n\n${metadata.bundler}, browser ESM, minified, export-only fixtures imported through src/index.ts; denseArray through src/zod/index.ts (Zod ${metadata.zod}).\n\n` +
  "| Exports | JS bytes | gzip bytes |\n|---|---:|---:|\n" + rows.map(r => `| ${r.exports.join(", ")} | ${r.bytes} | ${r.gzipBytes} |`).join("\n") +
  "\n\nIncludes shared helpers; excludes TypeScript declarations. Core imports have no runtime dependencies; the denseArray row includes its Zod Mini dependency but not a consumer-provided element schema. Every generated artifact is imported and its exports checked before measuring; every selected module also receives smoke checks. These are incremental library artifacts, not a whole app; compressed contributions in a shared application bundle may differ. Bun bundling does not replace tsc type checking.\n";
writeFileSync("docs/bundle-results.md", report);
console.log(report);
