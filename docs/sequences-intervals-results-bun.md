# Sequences and interval search: bun

1.3.14; JavaScriptCore; Apple M5; darwin/arm64.

Median ms, 7 samples, 3 warmups, rotated variants. Explicit GC outside each timed call; GC during the call is included. JSON contains min/max.

## fifo-build-drain

| n | array-shift | array-cursor | queue | deque | linkedList | doublyLinkedList |
|---|---:|---:|---:|---:|---:|---:|
| 1000 | 0.020 | 0.005 | 0.012 | 0.027 | 0.023 | 0.026 |
| 10000 | 0.152 | 0.011 | 0.044 | 0.111 | 0.098 | 0.107 |
| 50000 | 0.733 | 0.032 | 0.127 | 0.491 | 0.291 | 0.272 |

## alternate-ends-build-drain

| n | array | deque |
|---|---:|---:|
| 1000 | 0.010 | 0.016 |
| 10000 | 0.086 | 0.105 |
| 50000 | 0.413 | 0.270 |

## remove-even-build-edit

| n | array-indexOf-splice | array-filter-batch | list-handles |
|---|---:|---:|---:|
| 1000 | 0.063 | 0.008 | 0.041 |
| 10000 | 4.951 | 0.048 | 0.242 |
| 50000 | 230.945 | 0.183 | 0.764 |

Sequence timings include building/copying and draining/editing. FIFO cursor baseline releases references but does not compact its temporary array; queue also supports ongoing enqueue and compaction. Linked lists allocate nodes and check handles. Batch filter is a separate native solution for a known batch of deletions; it does not offer stable editable node handles. Checksums validated before timing; order/identity and mixed operations covered by tests.

## Interval queries

64 queries per column except build. Native filter uses preordered references and cached starts/ends; cache preparation is excluded. Index query excludes construction too. Both return identical chronological references, checked before timing. Points have zero duration; short durations are 0–19; long durations equal n; mixed alternates points and short intervals.

| n | shape | build | native-cached-filter | overlap-index | build-and-overlap |
|---|---|---:|---:|---:|---:|
| 1000 | points | 0.140 | 0.123 | 0.016 | 0.168 |
| 1000 | short | 0.177 | 0.151 | 0.031 | 0.208 |
| 1000 | long | 0.167 | 0.150 | 0.280 | 0.441 |
| 1000 | mixed | 0.166 | 0.122 | 0.022 | 0.180 |
| 10000 | points | 1.363 | 1.174 | 0.039 | 1.401 |
| 10000 | short | 1.416 | 1.188 | 0.057 | 1.500 |
| 10000 | long | 1.434 | 1.414 | 2.609 | 4.069 |
| 10000 | mixed | 1.416 | 1.159 | 0.043 | 1.448 |
| 100000 | points | 17.487 | 11.965 | 0.180 | 17.818 |
| 100000 | short | 19.412 | 12.775 | 0.229 | 20.780 |
| 100000 | long | 19.597 | 13.973 | 23.421 | 42.705 |
| 100000 | mixed | 19.379 | 21.545 | 0.227 | 19.271 |

Single machine/runtime versions only. No peak heap, browser measurements or dynamic interval updates. Large outputs cost O(k); overlapping many long events can favor linear native filtering. Build-and-query includes the complete index cost. These measurements do not establish a universally faster data structure.
