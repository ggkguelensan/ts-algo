# Browser bundle size

Bun 1.3.14, browser ESM, minified, export-only fixtures imported through src/index.ts.

| Exports | JS bytes | gzip bytes |
|---|---:|---:|
| sortedReferences | 900 | 441 |
| pointIndex | 2635 | 1267 |
| sortedReferences, pointIndex | 3185 | 1486 |
| quickSortInPlace, sortedReferencesQuickSort | 610 | 395 |

Includes shared helpers; excludes TypeScript declarations. No runtime dependencies. Every generated artifact is imported and its exports checked before measuring; sort and point-index bundles also receive smoke checks. These are incremental library artifacts, not a whole app; compressed contributions in a shared application bundle may differ. Bun bundling does not replace tsc type checking.
