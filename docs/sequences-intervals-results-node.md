# Sequences and interval search: node

v25.8.1; V8 14.1.146.11-node.21; Apple M5; darwin/arm64.

Median ms, 7 samples, 3 warmups, rotated variants. Explicit GC outside each timed call; GC during the call is included. JSON contains min/max.

## fifo-build-drain

| n | array-shift | array-cursor | queue | deque | linkedList | doublyLinkedList |
|---|---:|---:|---:|---:|---:|---:|
| 1000 | 0.017 | 0.002 | 0.040 | 0.059 | 0.101 | 0.113 |
| 10000 | 0.165 | 0.006 | 0.275 | 0.549 | 0.811 | 0.932 |
| 50000 | 131.736 | 0.059 | 0.886 | 1.796 | 1.532 | 1.676 |

## alternate-ends-build-drain

| n | array | deque |
|---|---:|---:|
| 1000 | 0.031 | 0.079 |
| 10000 | 0.093 | 0.458 |
| 50000 | 65.606 | 1.396 |

## remove-even-build-edit

| n | array-indexOf-splice | array-filter-batch | list-handles |
|---|---:|---:|---:|
| 1000 | 0.054 | 0.012 | 0.124 |
| 10000 | 3.367 | 0.086 | 0.953 |
| 50000 | 107.195 | 0.437 | 2.111 |

Sequence timings include building/copying and draining/editing. FIFO cursor baseline releases references but does not compact its temporary array; queue also supports ongoing enqueue and compaction. Linked lists allocate nodes and check handles. Batch filter is a separate native solution for a known batch of deletions; it does not offer stable editable node handles. Checksums validated before timing; order/identity and mixed operations covered by tests.

## Interval queries

64 queries per column except build. Native filter uses preordered references and cached starts/ends; cache preparation is excluded. Index query excludes construction too. Both return identical chronological references, checked before timing. Points have zero duration; short durations are 0–19; long durations equal n; mixed alternates points and short intervals.

| n | shape | build | native-cached-filter | overlap-index | build-and-overlap |
|---|---|---:|---:|---:|---:|
| 1000 | points | 0.390 | 0.585 | 0.019 | 0.396 |
| 1000 | short | 0.353 | 0.602 | 0.112 | 0.456 |
| 1000 | long | 0.334 | 0.623 | 0.800 | 1.059 |
| 1000 | mixed | 0.320 | 0.716 | 0.055 | 0.392 |
| 10000 | points | 2.168 | 3.431 | 0.040 | 2.213 |
| 10000 | short | 2.309 | 3.654 | 0.095 | 2.371 |
| 10000 | long | 2.313 | 4.110 | 3.456 | 5.778 |
| 10000 | mixed | 2.413 | 5.463 | 0.088 | 2.466 |
| 100000 | points | 26.042 | 32.478 | 0.271 | 26.307 |
| 100000 | short | 31.611 | 35.459 | 0.346 | 32.418 |
| 100000 | long | 29.104 | 42.192 | 30.530 | 60.486 |
| 100000 | mixed | 32.150 | 57.452 | 0.345 | 32.374 |

Single machine/runtime versions only. No peak heap, browser measurements or dynamic interval updates. Large outputs cost O(k); overlapping many long events can favor linear native filtering. Build-and-query includes the complete index cost. These measurements do not establish a universally faster data structure.
