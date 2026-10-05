import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { resolve, join } from "node:path";
import { gzipSync } from "node:zlib";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

// Export-only fixtures keep the selected public functions observable to the
// bundler while permitting it to remove all unused exports and TS types.
const directory = mkdtempSync(resolve("dist/bundle-"));
const rows = [];
try {
  for (const names of [["sortedReferences"], ["pointIndex"], ["sortedReferences", "pointIndex"],
    ["quickSortInPlace", "sortedReferencesQuickSort"]]) {
    const fixture = join(directory, "entry.ts");
    writeFileSync(fixture, `export { ${names.join(", ")} } from "../../src/index.ts";\n`);
    const output = execFileSync("bun", ["build", fixture, "--target=browser", "--format=esm", "--minify"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    const artifact = join(directory, `bundle-${rows.length}.mjs`);
    writeFileSync(artifact, output);
    const module = await import(pathToFileURL(artifact).href);
    for (const name of names) assert.equal(typeof module[name], "function");
    if (module.sortedReferences) assert.deepEqual(module.sortedReferences([2, 1], (x: number) => x, (a: number, b: number) => a - b), [1, 2]);
    if (module.pointIndex) assert.equal(module.pointIndex([{ x: 1, y: 2 }], {
      x: (p: { x: number }) => p.x, y: (p: { y: number }) => p.y,
    }).nearest(1, 2).distance, 0);
    rows.push({ exports: names, bytes: Buffer.byteLength(output), gzipBytes: gzipSync(output).length });
  }
} finally { rmSync(directory, { recursive: true }); }
const metadata = { bundler: `Bun ${execFileSync("bun", ["--version"], { encoding: "utf8" }).trim()}`,
  target: "browser", format: "esm", minify: true, date: new Date().toISOString() };
writeFileSync("docs/bundle-results.json", JSON.stringify({ metadata, rows }, null, 2) + "\n");
const report = `# Browser bundle size\n\n${metadata.bundler}, browser ESM, minified, export-only fixtures imported through src/index.ts.\n\n` +
  "| Exports | JS bytes | gzip bytes |\n|---|---:|---:|\n" + rows.map(r => `| ${r.exports.join(", ")} | ${r.bytes} | ${r.gzipBytes} |`).join("\n") +
  "\n\nIncludes shared helpers; excludes TypeScript declarations. No runtime dependencies. Every generated artifact is imported and its exports checked before measuring; sort and point-index bundles also receive smoke checks. These are incremental library artifacts, not a whole app; compressed contributions in a shared application bundle may differ. Bun bundling does not replace tsc type checking.\n";
writeFileSync("docs/bundle-results.md", report);
console.log(report);
