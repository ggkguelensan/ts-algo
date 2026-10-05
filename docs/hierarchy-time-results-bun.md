# Hierarchy and timeline: bun

1.3.14; JavaScriptCore; Apple M5; darwin/arm64.

Median ms, 7 samples, 3 warmups, rotated variants. Explicit GC before each variant (outside timing); automatic GC within a measured call is possible. Range/owner columns are batches of 64 queries; single columns one query.

Timeline builds all indexes, including owners and a causal chain. Native-sort builds chronological references only, not equivalent owner/causal indexes. Native queries use a preordered array and Map lookups; sorting that array is excluded from query time. Both variants return the same references in the same order, checked before timing. Equal-time queries return all points, exposing result allocation cost.

| n | shape | native-sort | timeline-build | range-native | range-index | range-build-query | owner-native | owner-index | single-native | single-build-query |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1000 | random | 0.287 | 0.607 | 0.853 | 0.050 | 0.718 | 0.510 | 0.039 | 0.018 | 0.426 |
| 1000 | sorted | 0.032 | 0.457 | 0.701 | 0.037 | 0.521 | 0.740 | 0.020 | 0.022 | 0.353 |
| 1000 | equal | 0.042 | 0.623 | 0.878 | 0.135 | 0.641 | 0.497 | 0.022 | 0.031 | 0.595 |
| 10000 | random | 3.946 | 5.565 | 5.947 | 0.045 | 5.225 | 5.618 | 0.047 | 0.259 | 5.472 |
| 10000 | sorted | 0.388 | 4.742 | 6.817 | 0.062 | 4.805 | 6.124 | 0.048 | 0.222 | 4.625 |
| 10000 | equal | 0.408 | 3.453 | 6.930 | 1.518 | 4.426 | 5.191 | 0.059 | 0.292 | 4.303 |
| 100000 | random | 49.456 | 66.249 | 95.649 | 0.274 | 60.690 | 81.770 | 0.096 | 3.406 | 70.562 |
| 100000 | sorted | 3.722 | 59.787 | 64.737 | 0.281 | 56.641 | 67.661 | 0.100 | 2.596 | 60.957 |
| 100000 | equal | 4.767 | 52.196 | 78.133 | 9.592 | 71.665 | 69.914 | 0.297 | 2.804 | 59.757 |

Additional native filter baseline with precomputed time/owner arrays, avoiding Map lookups. Preparation of these caches is excluded, just as index preparation is excluded from range-index/owner-index. This isolates indexed search from selector caching. Each column is 64 queries.

| n | shape | range-native-cached | range-index | owner-native-cached | owner-index |
|---|---|---:|---:|---:|---:|
| 1000 | random | 0.172 | 0.050 | 0.181 | 0.039 |
| 1000 | sorted | 0.223 | 0.037 | 0.168 | 0.020 |
| 1000 | equal | 0.450 | 0.135 | 0.353 | 0.022 |
| 10000 | random | 1.711 | 0.045 | 1.306 | 0.047 |
| 10000 | sorted | 2.132 | 0.062 | 2.123 | 0.048 |
| 10000 | equal | 2.700 | 1.518 | 2.597 | 0.059 |
| 100000 | random | 13.013 | 0.274 | 11.103 | 0.096 |
| 100000 | sorted | 12.209 | 0.281 | 14.426 | 0.100 |
| 100000 | equal | 23.105 | 9.592 | 20.584 | 0.297 |

Tree timings are costs, not speedups over an equivalent tree library. Wide is one root with n-1 children, deep is a chain. Sibling sorting uses cached native sort; deep chains have no nontrivial sibling groups.

| n | shape | build | iterate | sort-siblings |
|---|---|---:|---:|---:|
| 1000 | wide | 0.186 | 0.044 | 0.262 |
| 1000 | deep | 0.227 | 0.058 | 0.064 |
| 10000 | wide | 0.929 | 0.306 | 2.407 |
| 10000 | deep | 2.268 | 0.684 | 0.770 |
| 100000 | wide | 11.969 | 1.681 | 31.607 |
| 100000 | deep | 26.365 | 7.420 | 6.688 |

Static snapshots only. Browser performance, peak heap, edits and interval events are not measured. Causal traversal is checked but not separately timed. Automatic GC can occur; small differences need repeated runs. JSON also records min/max.
