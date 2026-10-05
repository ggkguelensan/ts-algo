# Spatial benchmark: bun

1.3.14; JavaScriptCore; Apple M5; darwin/arm64.

Median milliseconds; 7 samples after 3 warmups. Query columns contain batches of 64 queries. Native range uses Array.filter; nearest uses a linear loop. Both return original references. Build-query includes constructing the index. Every query is checked against the baseline before timing. Variants rotate; automatic GC may occur.

| n | shape | build | range-native | range-index | range-build-query | nearest-linear | nearest-index | nearest-build-query |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1000 | uniform | 0.026 | 0.377 | 0.013 | 0.039 | 0.333 | 0.039 | 0.067 |
| 1000 | clustered | 0.025 | 0.403 | 0.011 | 0.043 | 0.334 | 0.038 | 0.062 |
| 1000 | identical | 0.010 | 0.081 | 0.002 | 0.011 | 0.321 | 0.394 | 0.378 |
| 10000 | uniform | 0.267 | 1.963 | 0.024 | 0.313 | 3.089 | 0.051 | 0.297 |
| 10000 | clustered | 0.366 | 1.999 | 0.048 | 0.412 | 3.389 | 0.054 | 0.515 |
| 10000 | identical | 0.033 | 0.811 | 0.002 | 0.030 | 3.191 | 3.705 | 3.783 |
| 100000 | uniform | 7.019 | 19.178 | 0.216 | 6.654 | 31.470 | 0.118 | 6.709 |
| 100000 | clustered | 6.394 | 18.691 | 0.155 | 6.969 | 31.566 | 0.130 | 6.556 |
| 100000 | identical | 0.262 | 7.919 | 0.003 | 0.236 | 31.798 | 35.181 | 35.358 |

One narrow query (including build for the index) and one whole-domain query (prebuilt index):

| n | shape | single-range-native | single-range-build-query | wide-range-native | wide-range-index |
|---|---|---:|---:|---:|---:|
| 1000 | uniform | 0.006 | 0.030 | 0.010 | 0.009 |
| 1000 | clustered | 0.005 | 0.026 | 0.010 | 0.007 |
| 1000 | identical | 0.002 | 0.011 | 0.009 | 0.006 |
| 10000 | uniform | 0.050 | 0.281 | 0.070 | 0.065 |
| 10000 | clustered | 0.031 | 0.365 | 0.076 | 0.085 |
| 10000 | identical | 0.020 | 0.038 | 0.069 | 0.046 |
| 100000 | uniform | 0.211 | 6.657 | 0.610 | 0.979 |
| 100000 | clustered | 0.406 | 6.638 | 0.601 | 0.878 |
| 100000 | identical | 0.212 | 0.249 | 0.608 | 0.393 |

These are static point workloads, not rectangle collisions, geography, or continuously updated positions. Identical points expose the linear worst case for nearest queries. Broad ranges also approach a full scan. Heap usage and browser-engine performance are not measured. Small timing differences need repeated runs.
