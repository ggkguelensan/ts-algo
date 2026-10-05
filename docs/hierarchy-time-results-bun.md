# Hierarchy and timeline: bun

1.3.14; JavaScriptCore; Apple M5; darwin/arm64.

Median ms, 7 samples, 3 warmups, rotated variants. Explicit GC before each variant (outside timing); automatic GC within a measured call is possible. Range/property columns are batches of 64 queries; single columns one query.

Timeline builds temporal/causal indexes, for points and a causal chain. Native-sort builds chronological references only, not equivalent causal indexes. Native queries use a preordered array and Map lookups; sorting that array is excluded from query time. Both variants return the same references in the same order, checked before timing. Equal-time queries return all points, exposing result allocation cost.

| n | shape | native-sort | timeline-build | range-native | range-index | range-build-query | property-native | property-filter | single-native | single-build-query |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1000 | random | 0.167 | 0.282 | 0.185 | 0.018 | 0.292 | 0.176 | 0.028 | 0.006 | 0.281 |
| 1000 | sorted | 0.013 | 0.177 | 0.171 | 0.016 | 0.194 | 0.178 | 0.022 | 0.005 | 0.182 |
| 1000 | equal | 0.014 | 0.212 | 0.253 | 0.183 | 0.400 | 0.233 | 0.386 | 0.008 | 0.215 |
| 10000 | random | 2.136 | 2.802 | 2.946 | 0.040 | 2.705 | 2.811 | 0.076 | 0.055 | 3.268 |
| 10000 | sorted | 0.102 | 1.541 | 2.372 | 0.037 | 1.513 | 2.355 | 0.068 | 0.042 | 1.521 |
| 10000 | equal | 0.111 | 1.507 | 3.284 | 1.784 | 3.309 | 2.989 | 4.489 | 0.069 | 1.595 |
| 100000 | random | 32.253 | 35.386 | 43.524 | 0.238 | 35.524 | 43.325 | 1.255 | 0.892 | 35.462 |
| 100000 | sorted | 2.085 | 24.160 | 37.597 | 0.218 | 24.663 | 36.742 | 0.897 | 0.704 | 24.779 |
| 100000 | equal | 2.049 | 24.169 | 46.566 | 18.089 | 43.613 | 42.796 | 60.493 | 0.850 | 24.220 |

Additional native filter baseline with precomputed time/owner arrays, avoiding Map lookups. Preparation of these caches is excluded, just as index preparation is excluded from range-index/property-filter. This isolates indexed search from selector caching. Each column is 64 queries.

| n | shape | range-native-cached | range-index | property-native-cached | property-filter |
|---|---|---:|---:|---:|---:|
| 1000 | random | 0.091 | 0.018 | 0.086 | 0.028 |
| 1000 | sorted | 0.099 | 0.016 | 0.105 | 0.022 |
| 1000 | equal | 0.147 | 0.183 | 0.138 | 0.386 |
| 10000 | random | 0.811 | 0.040 | 0.821 | 0.076 |
| 10000 | sorted | 0.811 | 0.037 | 0.774 | 0.068 |
| 10000 | equal | 1.458 | 1.784 | 1.417 | 4.489 |
| 100000 | random | 8.021 | 0.238 | 7.993 | 1.255 |
| 100000 | sorted | 8.137 | 0.218 | 8.059 | 0.897 |
| 100000 | equal | 14.590 | 18.089 | 13.512 | 60.493 |

Tree timings are costs, not speedups over an equivalent tree library. Wide is one root with n-1 children, deep is a chain. Sibling sorting uses cached native sort; deep chains have no nontrivial sibling groups.

| n | shape | build | iterate | sort-siblings | sibling-lookups |
|---|---|---:|---:|---:|---:|
| 1000 | wide | 0.117 | 0.019 | 0.157 | 0.022 |
| 1000 | deep | 0.149 | 0.019 | 0.065 | 0.018 |
| 10000 | wide | 0.735 | 0.128 | 1.773 | 0.141 |
| 10000 | deep | 1.189 | 0.260 | 0.466 | 0.128 |
| 100000 | wide | 8.504 | 0.749 | 22.706 | 2.032 |
| 100000 | deep | 18.214 | 5.620 | 6.483 | 3.269 |

Static time/causality indexes only. Browser performance, peak heap, edits and interval events are not measured. Causal traversal is checked but not separately timed. Automatic GC can occur; small differences need repeated runs. JSON also records min/max.
