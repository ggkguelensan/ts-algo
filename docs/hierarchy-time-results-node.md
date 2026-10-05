# Hierarchy and timeline: node

v25.8.1; V8 14.1.146.11-node.21; Apple M5; darwin/arm64.

Median ms, 7 samples, 3 warmups, rotated variants. Explicit GC before each variant (outside timing); automatic GC within a measured call is possible. Range/property columns are batches of 64 queries; single columns one query.

Timeline builds temporal/causal indexes, for points and a causal chain. Native-sort builds chronological references only, not equivalent causal indexes. Native queries use a preordered array and Map lookups; sorting that array is excluded from query time. Both variants return the same references in the same order, checked before timing. Equal-time queries return all points, exposing result allocation cost.

| n | shape | native-sort | timeline-build | range-native | range-index | range-build-query | property-native | property-filter | single-native | single-build-query |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1000 | random | 0.359 | 0.660 | 0.819 | 0.018 | 0.670 | 0.795 | 0.035 | 0.035 | 0.652 |
| 1000 | sorted | 0.042 | 0.396 | 0.838 | 0.020 | 0.407 | 0.866 | 0.033 | 0.035 | 0.421 |
| 1000 | equal | 0.041 | 0.393 | 1.073 | 0.235 | 0.623 | 0.907 | 0.752 | 0.041 | 0.426 |
| 10000 | random | 2.914 | 4.281 | 8.379 | 0.042 | 4.167 | 8.258 | 0.167 | 0.306 | 4.154 |
| 10000 | sorted | 0.337 | 2.966 | 7.166 | 0.041 | 2.970 | 7.148 | 0.160 | 0.272 | 2.977 |
| 10000 | equal | 0.338 | 3.003 | 9.737 | 2.052 | 5.019 | 8.288 | 7.307 | 0.322 | 2.948 |
| 100000 | random | 43.368 | 48.634 | 140.128 | 0.279 | 48.786 | 140.202 | 2.321 | 3.472 | 48.435 |
| 100000 | sorted | 3.186 | 33.353 | 112.427 | 0.283 | 33.785 | 112.318 | 1.831 | 2.403 | 33.329 |
| 100000 | equal | 3.181 | 34.219 | 148.005 | 32.052 | 74.735 | 119.375 | 122.790 | 3.079 | 35.624 |

Additional native filter baseline with precomputed time/owner arrays, avoiding Map lookups. Preparation of these caches is excluded, just as index preparation is excluded from range-index/property-filter. This isolates indexed search from selector caching. Each column is 64 queries.

| n | shape | range-native-cached | range-index | property-native-cached | property-filter |
|---|---|---:|---:|---:|---:|
| 1000 | random | 0.487 | 0.018 | 0.325 | 0.035 |
| 1000 | sorted | 0.487 | 0.020 | 0.322 | 0.033 |
| 1000 | equal | 0.707 | 0.235 | 0.370 | 0.752 |
| 10000 | random | 3.125 | 0.042 | 3.075 | 0.167 |
| 10000 | sorted | 3.151 | 0.041 | 3.123 | 0.160 |
| 10000 | equal | 4.467 | 2.052 | 3.801 | 7.307 |
| 100000 | random | 30.273 | 0.279 | 30.403 | 2.321 |
| 100000 | sorted | 30.275 | 0.283 | 30.263 | 1.831 |
| 100000 | equal | 56.448 | 32.052 | 36.666 | 122.790 |

Tree timings are costs, not speedups over an equivalent tree library. Wide is one root with n-1 children, deep is a chain. Sibling sorting uses cached native sort; deep chains have no nontrivial sibling groups.

| n | shape | build | iterate | sort-siblings | sibling-lookups |
|---|---|---:|---:|---:|---:|
| 1000 | wide | 0.190 | 0.024 | 0.299 | 0.043 |
| 1000 | deep | 0.205 | 0.031 | 0.092 | 0.050 |
| 10000 | wide | 1.688 | 0.168 | 2.770 | 0.451 |
| 10000 | deep | 2.144 | 0.274 | 0.913 | 0.469 |
| 100000 | wide | 13.374 | 2.336 | 29.773 | 5.239 |
| 100000 | deep | 18.050 | 4.049 | 7.251 | 6.261 |

Static time/causality indexes only. Browser performance, peak heap, edits and interval events are not measured. Causal traversal is checked but not separately timed. Automatic GC can occur; small differences need repeated runs. JSON also records min/max.
