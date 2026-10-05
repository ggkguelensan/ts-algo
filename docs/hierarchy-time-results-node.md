# Hierarchy and timeline: node

v25.8.1; V8 14.1.146.11-node.21; Apple M5; darwin/arm64.

Median ms, 7 samples, 3 warmups, rotated variants. Explicit GC before each variant (outside timing); automatic GC within a measured call is possible. Range/owner columns are batches of 64 queries; single columns one query.

Timeline builds all indexes, including owners and a causal chain. Native-sort builds chronological references only, not equivalent owner/causal indexes. Native queries use a preordered array and Map lookups; sorting that array is excluded from query time. Both variants return the same references in the same order, checked before timing. Equal-time queries return all points, exposing result allocation cost.

| n | shape | native-sort | timeline-build | range-native | range-index | range-build-query | owner-native | owner-index | single-native | single-build-query |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1000 | random | 0.565 | 1.203 | 1.366 | 0.033 | 0.908 | 1.643 | 0.017 | 0.057 | 1.168 |
| 1000 | sorted | 0.055 | 1.237 | 1.757 | 0.035 | 1.297 | 5.708 | 0.022 | 0.049 | 0.893 |
| 1000 | equal | 0.143 | 1.738 | 6.490 | 0.189 | 2.253 | 27.724 | 0.020 | 0.106 | 2.477 |
| 10000 | random | 5.836 | 11.430 | 17.392 | 0.055 | 8.922 | 21.263 | 0.026 | 0.631 | 7.276 |
| 10000 | sorted | 0.532 | 7.315 | 15.030 | 0.051 | 12.135 | 9.797 | 0.019 | 0.451 | 11.655 |
| 10000 | equal | 0.391 | 5.611 | 31.968 | 0.695 | 7.774 | 34.758 | 0.017 | 0.562 | 5.650 |
| 100000 | random | 45.625 | 55.880 | 147.500 | 0.123 | 55.945 | 147.618 | 0.063 | 4.112 | 55.864 |
| 100000 | sorted | 3.443 | 38.694 | 114.754 | 0.120 | 40.115 | 117.666 | 0.050 | 2.861 | 41.575 |
| 100000 | equal | 3.340 | 40.108 | 142.563 | 8.348 | 55.373 | 121.115 | 0.117 | 3.247 | 39.538 |

Additional native filter baseline with precomputed time/owner arrays, avoiding Map lookups. Preparation of these caches is excluded, just as index preparation is excluded from range-index/owner-index. This isolates indexed search from selector caching. Each column is 64 queries.

| n | shape | range-native-cached | range-index | owner-native-cached | owner-index |
|---|---|---:|---:|---:|---:|
| 1000 | random | 0.615 | 0.033 | 0.695 | 0.017 |
| 1000 | sorted | 1.347 | 0.035 | 0.888 | 0.022 |
| 1000 | equal | 6.935 | 0.189 | 3.324 | 0.020 |
| 10000 | random | 3.826 | 0.055 | 4.300 | 0.026 |
| 10000 | sorted | 3.745 | 0.051 | 4.069 | 0.019 |
| 10000 | equal | 8.370 | 0.695 | 6.934 | 0.017 |
| 100000 | random | 32.123 | 0.123 | 32.127 | 0.063 |
| 100000 | sorted | 30.925 | 0.120 | 31.402 | 0.050 |
| 100000 | equal | 55.257 | 8.348 | 36.518 | 0.117 |

Tree timings are costs, not speedups over an equivalent tree library. Wide is one root with n-1 children, deep is a chain. Sibling sorting uses cached native sort; deep chains have no nontrivial sibling groups.

| n | shape | build | iterate | sort-siblings |
|---|---|---:|---:|---:|
| 1000 | wide | 0.161 | 0.030 | 0.250 |
| 1000 | deep | 0.193 | 0.035 | 0.062 |
| 10000 | wide | 2.034 | 0.175 | 2.399 |
| 10000 | deep | 1.789 | 0.306 | 0.475 |
| 100000 | wide | 9.942 | 2.133 | 25.475 |
| 100000 | deep | 15.589 | 4.520 | 3.954 |

Static snapshots only. Browser performance, peak heap, edits and interval events are not measured. Causal traversal is checked but not separately timed. Automatic GC can occur; small differences need repeated runs. JSON also records min/max.
