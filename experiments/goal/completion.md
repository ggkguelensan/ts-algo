# Completion audit

This is the requirement-to-evidence map for the user-provided 15-part Goal.
The authoritative purpose, survival ledger, contracts, limits and next implementation
order are in [design.md](../../docs/design.md). This document assesses the research
scope; it does not declare that the candidate interface has shipped.

The command gates and current artifact hashes are recorded by
[verify-final.mjs](verify-final.mjs) in [verification.json](results/verification.json).
Benchmark correctness assertions execute before measurements. Report-shape checks
are additional integrity checks, not substitutes for those assertions or the
independent tests below.

## Requirement-by-requirement evidence

| Objective section | Inspected evidence | Finding |
|---|---|---|
| 1. Actual state | Root src/index.ts, sorted.ts, tree.ts, timeline.ts, point-index.ts, package.json; research.md actual-state section; README and historical audit | Public methods, tree entity snapshot, timeline live resolver plus cached graph/time and missing prior tarball targets were distinguished from intentions. Packaging was repaired; prototypes remain non-public. |
| 2. Five competing purposes | research.md hypothesis table; query/time/business experiments and design.md opening decision | General utilities, reference indices, time/ranges, adapters and a narrow combination have users, baselines, risks and falsifiers. Evidence selects the narrow combination, not a general collection or database engine. |
| 3. Competition | scenarios.ts, scenario-tasks.ts, scenario-spatial.ts, scenario-priority.ts, tanstack.ts; query.ts/collect.ts; pinned package-lock; primary-source links in research.md | Native loops and indexed baselines, current library, different own prototypes and relevant competitors are tested. Drizzle is assessed as database scope, not forced into an in-memory microbenchmark. XState/decimal/Dinero and LINQ are explicitly qualitative scope/interface comparisons. Module dispositions are in the design ledger. |
| 4. Data model | source.ts/source.test.ts, hierarchy.ts, temporal.ts/temporal.test.ts, target-examples.ts, memory-worker.mjs | Entity/ref/store/metadata/source context/query context are separate. Live Map replacement, valid undefined versus missing key, multiple bindings, one-shot iteration, closing and source retention are checked. No mandatory row wrapper. Static metadata and live entity policies are explicit. |
| 5. Query | query.ts/query.test.ts, collect.ts/collect.test.ts, operators.ts, types.ts, bench-query.ts, bench-costs.ts, type-cost.mjs | Native/functions/pipe/lazy/fused/restricted alternatives are compared. Projection, type guards, contexts, early stop, take/drop ordering, cached sort, duplicates, undefined, search, groups, aggregates, distinct and joins are exercised. A valid literal-ref/take failure and four-step ceiling disqualify the general plan; arbitrary conditional heterogeneous plans are not claimed. Restricted collect with conditional options survives. |
| 6. Timeline | temporal.ts/temporal.test.ts, dependencies.ts, ranges.ts; bench-temporal.ts, bench-temporal-candidates.ts, bench-updates.ts, date-check.mjs | Points, ties, zero-length, nested/long intervals, boundaries, invalid/reversed data and live entities with snapshot metadata are checked. 900 seeded differential windows. Linear/prefix/current/own/Mnemonist comparisons preserve equal semantics; raw closed candidates are separately labelled. Updates measure full rebuilding, not an incremental index. Date normalization and DST/calendar boundaries are tested; causal imports are independent. |
| 7. Seven scenarios | Detailed table below, scenarios.test.ts, target.test.ts and TanStack test; business/spatial/TanStack raw reports | All seven have executable inputs, checked results, native and appropriate alternative implementations. Warm query cost and cold construction are separated; end-to-end resolution/filter/projection is included where used. |
| 8. Additional scope | design.md additional-scope assessment; ranges/diff/indexBy/operators prototypes; research.md primary sources | Ranges and reconciliation have concrete uses. Dedup/join/batch/window/rules/history directions are assessed without implementing a universal engine. State/reactivity/decimal/money favour existing tools; Brand<number> is not precision. |
| 9. Runtime and memory | measure.ts; query/time/costs/sequences/business/spatial/updates/TanStack JSON for Node and Bun; memory-worker/bench-memory | Reports preserve versions, CPU, sizes, deterministic generators, warmup, calibration, samples and spread. Construction, execution, repeated use, lookup/materialization, caching, update/rebuild and retention are separated. Natural-GC workload and Node allocation sampling complement post-GC snapshots. Engine differences and profiler limitations are explicit. |
| 10. Bundle | bundles.mjs and results/bundles.json; verify-package.mjs/package.json | 28 consumers × esbuild/Rollup, browser ES2023, minified/gzip/Brotli and module attribution; all 56 execute expected outputs. Core sort excludes structures/Zod, time excludes causal algorithms, date-fns/Brand remain type-only. starts-only Rollup excludes overlapping. Current methods still prevent promised per-operation spatial granularity; no false claim of migration. Archive, declarations and bundle costs are separate. |
| 11. Types | types.ts, type-display.mjs/type-display.json, type-cost.mjs/type-cost.json, TanStack diagnostics/config, installed archive consumer | Strict/noUnchecked/exactOptional compile with positive/negative ref/entity/context/guard/projection/group/join cases. Nine unannotated output declarations plus target-example returns are inspected. 100/1000/5000 call sites × six candidates × three fresh compiler processes; declaration emission separate. Four unsuppressed bad consumer diagnostics retained. TanStack's declaration failure is recorded, not hidden. |
| 12. Interface | target-interface.ts/target-examples.ts/target.test.ts, design.md contracts and profiles; scenario comparison below | Candidate is executable, contexts and names consistent, native methods remain available. Shared resolver/index/selection cuts repeated lookup glue; fixed collect order and static metadata reduce concepts at the price of flexibility. Mutations are not disguised as queries; result snapshots are not blanket immutable-runtime promises. |
| 13. Overall selection | design.md survival ledger and candidate profiles; initial.md/business.md/costs.md | Correctness, inference/check cost, footprint, execution, memory and support complexity are compared without invented composite scores. Native wins are preserved. No universal performance superiority or detached-result guarantee. |
| 14. Saved artifacts and packaging | research.md commands, experiment package/lock, results JSON/Markdown, types and tests, design/completion; verify-package.mjs | Research isolated from public exports/runtime deps. Final purpose and choices have one authoritative source. Tarball has all export targets, excludes research/tests/bench sources, installs under independent package scope and passes Node/Bun plus strict declaration consumer. No npm publication. |
| 15. Finish | All preceding evidence, design.md audience/exclusions/order/uncertainties and verification.json | Research delivers a concrete purpose and tested direction. Public migration is next work, not misrepresented as done. Remaining measurement uncertainties limit promises and do not support adding more speculative modules. |

## Seven scenario coverage and interface assessment

| Scenario | Executable code and expected-result checks | Cost coverage / DX trade-off |
|---|---|---|
| Catalogue | scenarios.ts catalogue, scenarios.test.ts fixed DTOs/multiple roots/live replacement/invalid forest; target.test.ts immutable order and bidirectional siblings | Native scan, indexed children, current and bound tree; cold constructor+one full query and warm selection. External parent lookup becomes a one-time topology getter; caller learns Source/tree/subtree and a selection operation. Flat sort and sibling order intentionally differ. |
| Schedule | scenarios.ts scheduling; target-examples.ts external event/time stores; independent sampled capacity/free-segment and all-pairs conflict oracles | Business selection+conflicts/free/capacity plus separate construction/lookup/distribution/rebuild costs. Time contract is explicit; caller still owns resource/owner filtering and reservations. Points occupy no interval capacity. |
| Tasks | scenario-tasks.ts and fixed ready/consequences assertions, topological edge-order checks; target.test.ts multiple distinct causes | Native indexed adjacency, current/own DAG and Graphology; cold build+query includes validation where supplied. Owner remains entity field; Source/DAG functions replace manual adjacency traversal but introduce membership/cycle rules. |
| Report | scenarios.ts report and small expected regional total; tanstack.test.ts retained join aggregate through updates | Direct native, helpers, Remeda, fused/restricted; TanStack cold/warm/20 committed updates with two index configs. Generic composition does not beat direct aggregation; reactive engine has a larger but useful different contract. Missing join result is discriminated when undefined can be real data. |
| Sync | scenarios.ts synchronization; expected removed/added IDs, duplicate rejection and valid undefined diff tests | Full materialization+diff, including improved native loop. indexBy/diffBy clarify uniqueness/comparison policy; they do not justify a new storage system or unique speed claim. |
| Spatial | scenario-spatial.ts; uniform/clustered/coincident bounds, nearest/radius/ties plus resolved/filter/projected DTO equality | Construction, eight queries, broad/selective ranges and nearest+business result; current/KDBush/Flatbush/RBush/D3/native. Getter keeps coordinates outside entities. Canonical sorting is adapter cost, nearest qualifying entity is a different unsupported operation. |
| Priority | scenario-priority.ts cancellation/versioned deadline update, tie order and no duplicate processed refs; n=0/1/100/1000 checks | Build/update/extract 20 or all, native sorted batch versus Mnemonist heap. Version/stale-entry policy belongs to processing scenario; no public own heap needed. |

FIFO, deque and singly/doubly linked ownership/handles additionally have the root
sequence tests and [sequence cost experiments](results/costs.md). The optimistic
Map-links draft excludes ownership checks and still does not earn a default.
Dense arrays, explicit undefined, own indices, transforms and asynchronous Zod
schemas have root tests; optional density integration has separate bundle and
installed-consumer checks.

## Limits accepted in the conclusion

- Node/Bun on one Apple M5 are evidence for these workloads, not browser or
  production-trace guarantees. Bundle outputs execute in Node, not a browser UI.
- Node sampled allocation is an estimate; Bun does not have the same profile here.
  Observed heap maximum is not true peak. Sort allocation has no isolated total rank.
- Fused projected results retain the source in tested Node cases; unbound temporal
  getter retention differs between engines. Retainer mechanism is unresolved.
  Consequently those results do not justify public release/detachment promises.
- Static rebuild is measured; incremental interval/spatial updates are not promised.
  Break-even tables are an explicit model, not an observed universal threshold.
- Compiler fixtures test many representative calls, not IDE responsiveness or every
  possible generic composition. The failed literal query is rejected evidence.
- date-fns is erased from experiment JS but referenced in declarations. Future time
  entry needs an explicit type-dependency policy; core must not inherit it silently.
- Readonly topology views are a caller contract, not frozen objects. Future public
  migration must retain or deliberately change it and repeat consumer checks.

These restrictions are part of the selected scope. They are not filled with
speculative implementations or claims that the current public package already
has the candidate interface.
