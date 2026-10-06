# Public migration audit — in progress

This audit covers the migration objective, not the earlier research Goal.
Architecture and contracts are authoritative in [design.md](../../docs/design.md).
Rows distinguish implemented features from final acceptance. Historical research
completion does not prove public migration completion.

| Objective section | Current evidence | Acceptance state |
|---|---|---|
| 1. Actual state and migration map | Git main, source modules/exports, design migration table; legacy structures under references | Implemented; final repository/archive audit still required |
| 2. Minimal core | src/source.ts, collect.ts, sorted.ts; source runtime/type tests; migration-core measurements | Implemented; Source/live/context/missing-vs-undefined contracts checked |
| 3. Restricted selection | collect fixed order, lazy iterator closing/count tests, projection/narrowing type fixtures | Implemented; no public general query or mandatory result wrapper |
| 4. Time/ranges separation | time and ranges entry points, independent half-open interval oracles, public time types, migration-time report | Implemented; final evidence review must include ranges cost and date-fns policy |
| 5. Tree and causality | tree/dependencies modules and independent reachability/order tests; migration-structure report | Implemented; topology snapshots/live entities and stable sibling groups checked |
| 6. Spatial | data/within/nearest modules, differential/extreme-coordinate/tie tests, migration-spatial report | Implemented; eligible-nearest and incremental mutation explicitly excluded |
| 7. Other modules | queue/deque/lists/diff entries, ownership/differential tests, migration-sequences report | Implemented; no public quicksort/heap/reactive/decimal engine |
| 8. Contracts/Zod Mini | dense-array tests including holes/undefined/transforms/async; installed optional integration smoke | Passed current runtime and installed-consumer checks |
| 9. Public types | root *types.ts, installed strict consumer, unannotated business declarations, scaled type-cost and hypothesis experiments | Incomplete: scaled compiler regressions remain under investigation; array/Map/Set Source fallback hole repaired |
| 10. Seven public scenarios | examples/business.ts, shared examples/expected.json, root test; copied TS compiled against independently installed archive, then executed Node/Bun | Passed seven fixed fixtures; final audit must assess independent-oracle coverage beyond smoke cases |
| 11. Runtime/memory | migration core/time/structure/spatial/sequences raw+reports; 126 memory subprocess cases with natural-workload native assertions | Runtime/retention/allocation evidence saved; final cross-report regression acceptance is not complete |
| 12. Bundle/package | verify-package.mjs --migration, isolated package scope, strict types, esbuild/Rollup execution and excluded-module checks | Passed intermediate installed gate; repeat after final source/docs changes |
| 13. Documentation/save | README points to public comparisons; design remains SSOT; reproducible commands and raw results saved | In progress; final documentation/source/link review and Git preservation needed |
| 14. Completion | All preceding rows must withstand requirement-by-requirement review | Not achieved; Goal stays active |

## New evidence in this checkpoint

- All seven scenarios use public bare imports. Their TS is copied into the
  installed consumer without paths or skipLibCheck. Emitted declarations and
  Node/Bun outputs are saved independently of root self-reference.
- Root checks pass 82 tests in each runtime, including Source/native-container
  priority. Compile-time cases forbid fallback to native reference selection
  for Source intersections with arrays, maps and sets.
- Memory measurement contains 114 retained cases (19 variants × two runtimes ×
  three fresh processes) plus 12 natural workloads. Allocation sampling includes
  collected objects in Node; Bun has no equivalent profile in this harness.
- Bound indices intentionally keep their stores. Unbound timeline and queue
  exhibit runtime-dependent Map retention. Numeric projection releases the Map
  in the tested fixtures; that is not a universal detachment guarantee.
- Initial scaled tests show compiler regressions above the design thresholds.
  Array-first overload ordering was slower and rejected. Simplified signatures,
  NoInfer comparator and reused callbacks have isolated measurements, without
  promoting a smaller contract merely because it compiles faster.

## Remaining work before completion

Resolve or explicitly justify the scaled compiler cost using current declaration
measurements; do not quietly accept it from ordinary green type tests. Review
runtime and bundle regressions across all migrated domains, range validation
cost, and seven-scenario oracle coverage. Remove obsolete public recommendations,
check documentation links and archive contents, run the final relevant gates,
and save/push the finished changes. Only then mark the migration Goal complete.
