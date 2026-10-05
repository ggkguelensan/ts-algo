# Spatial benchmark: node

v25.8.1; V8 14.1.146.11-node.21; Apple M5; darwin/arm64.

Median milliseconds; 7 samples after 3 warmups. Query columns contain batches of 64 queries. Native range uses Array.filter; nearest uses a linear loop. Both return original references. Build-query includes constructing the index. Every query is checked against the baseline before timing. Variants rotate; automatic GC may occur.

| n | shape | build | range-native | range-index | range-build-query | nearest-linear | nearest-index | nearest-build-query |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1000 | uniform | 0.042 | 0.431 | 0.013 | 0.054 | 0.463 | 0.065 | 0.102 |
| 1000 | clustered | 0.040 | 0.450 | 0.005 | 0.044 | 0.481 | 0.029 | 0.067 |
| 1000 | identical | 0.019 | 0.309 | 0.001 | 0.020 | 0.449 | 0.481 | 0.481 |
| 10000 | uniform | 0.467 | 4.825 | 0.025 | 0.517 | 4.313 | 0.050 | 0.579 |
| 10000 | clustered | 0.445 | 4.642 | 0.019 | 0.492 | 4.181 | 0.043 | 0.521 |
| 10000 | identical | 0.047 | 3.148 | 0.001 | 0.049 | 4.311 | 4.598 | 4.711 |
| 100000 | uniform | 7.941 | 46.998 | 0.194 | 8.026 | 43.778 | 0.150 | 8.137 |
| 100000 | clustered | 7.977 | 46.259 | 0.166 | 7.978 | 43.520 | 0.145 | 8.053 |
| 100000 | identical | 0.700 | 32.167 | 0.002 | 0.687 | 43.405 | 47.401 | 47.937 |

One narrow query (including build for the index) and one whole-domain query (prebuilt index):

| n | shape | single-range-native | single-range-build-query | wide-range-native | wide-range-index |
|---|---|---:|---:|---:|---:|
| 1000 | uniform | 0.008 | 0.044 | 0.008 | 0.006 |
| 1000 | clustered | 0.006 | 0.039 | 0.008 | 0.004 |
| 1000 | identical | 0.005 | 0.019 | 0.007 | 0.003 |
| 10000 | uniform | 0.085 | 0.490 | 0.071 | 0.046 |
| 10000 | clustered | 0.061 | 0.457 | 0.071 | 0.044 |
| 10000 | identical | 0.049 | 0.046 | 0.071 | 0.028 |
| 100000 | uniform | 0.510 | 7.802 | 0.922 | 0.845 |
| 100000 | clustered | 0.721 | 7.878 | 0.889 | 0.882 |
| 100000 | identical | 0.492 | 0.703 | 0.886 | 0.428 |

These are static point workloads, not rectangle collisions, geography, or continuously updated positions. Identical points expose the linear worst case for nearest queries. Broad ranges also approach a full scan. Heap usage and browser-engine performance are not measured. Small timing differences need repeated runs.
