# Browser bundle size

Bun 1.3.14, browser ESM, minified, export-only fixtures imported through src/index.ts; denseArray through src/zod/index.ts (Zod 4.6.5).

| Exports | JS bytes | gzip bytes |
|---|---:|---:|
| sorted | 917 | 456 |
| isDenseArray | 166 | 158 |
| pointIndex | 2662 | 1289 |
| sorted, pointIndex | 3202 | 1504 |
| tree | 2435 | 1123 |
| timeline | 4162 | 1938 |
| queue | 387 | 280 |
| deque | 694 | 374 |
| linkedList | 901 | 496 |
| doublyLinkedList | 922 | 507 |
| sorted, pointIndex, tree, timeline, queue, deque, linkedList, doublyLinkedList | 10383 | 4267 |
| denseArray | 11118 | 4003 |

Includes shared helpers; excludes TypeScript declarations. Core imports have no runtime dependencies; the denseArray row includes its Zod Mini dependency but not a consumer-provided element schema. Every generated artifact is imported and its exports checked before measuring; every selected module also receives smoke checks. These are incremental library artifacts, not a whole app; compressed contributions in a shared application bundle may differ. Bun bundling does not replace tsc type checking.
