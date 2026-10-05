# Browser bundle size

Bun 1.3.14, browser ESM, minified, export-only fixtures imported through src/index.ts.

| Exports | JS bytes | gzip bytes |
|---|---:|---:|
| sortedReferences | 927 | 464 |
| pointIndex | 2662 | 1290 |
| sortedReferences, pointIndex | 3212 | 1507 |
| tree | 2435 | 1124 |
| timeline | 4162 | 1939 |
| queue | 387 | 280 |
| deque | 694 | 375 |
| linkedList | 901 | 497 |
| doublyLinkedList | 922 | 509 |
| sortedReferences, pointIndex, tree, timeline, queue, deque, linkedList, doublyLinkedList | 10393 | 4271 |

Includes shared helpers; excludes TypeScript declarations. No runtime dependencies. Every generated artifact is imported and its exports checked before measuring; every selected module also receives smoke checks. These are incremental library artifacts, not a whole app; compressed contributions in a shared application bundle may differ. Bun bundling does not replace tsc type checking.
