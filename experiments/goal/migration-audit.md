# Public migration requirement audit

This audit addresses the public migration objective, separately from the earlier
[research audit](completion.md). Architecture/contracts/trade-off decisions have
one authoritative source: [design.md](../../docs/design.md). Current command logs,
artifact hashes and package checks are in [migration-verification.json](results/migration-verification.json).

| Objective section | Authoritative evidence inspected | Result |
|---|---|---|
| 1. State/migration map | Git root/main/worktree/status; design migration table; public exports versus references/experiments | Core, time/ranges, hierarchy, DAG, spatial, sequences, reconciliation, contracts and excluded engines accounted for. Incompatible changes are explicit. |
| 2. Core | src/source.ts and sorted.ts; source/collections tests, source-types.ts; migration-core Node/Bun | Live keys/values, separate contexts, explicit snapshots/rebinding, present undefined versus missing, one-shot iteration and identity checked. Native Map forEach remains distinct from Source resolution. No mandatory per-row source wrapper. |
| 3. Selection | src/collect.ts, source tests/types, installed strict consumer | Fixed where→select→limit, refs without projection, projected values without provenance, guard narrowing, one resolution when needed, no resolution reference-only, limit=0, IteratorClose on early stop/error, callback ordering/count. No public general query/mandatory result wrapper. |
| 4. Time/ranges | physical modules; time tests with 900 linear queries and 100 segment/all-pair oracles; public-time-types.ts checked by experiment tsc; migration-time/ranges | Metadata snapshots/live entities, stable starts, points, half-open windows, invalid/reversed input, eager Date normalization. Lazy selections avoid mandatory refs copy and stop at limit. No DAG build/import in temporal search. Structural Date/number Interval has no date-fns import in JS/d.ts; strings normalize outside. Metadata changes rebuild. |
| 5. Tree/DAG | implementations/exports; tree-dependencies tests/types; migration-structure | External getters receive Source context. Multiple roots, invalid/nullish tree refs, missing links, duplicates/cycles. Flat versus sibling-group sorting, original topology preservation, live entities and borrowed groups. Symmetric DAG links/reachability and cached stable Kahn order are separate from timeline. |
| 6. Spatial | data/within/nearest modules; differential, coincident, extreme-coordinate, radius/tie tests/types; migration-spatial | Static finite metadata, live binding/context getters. Inclusive bounds/radius, source-occurrence ties and undefined refs. Repeatable lazy within; nearest geometry distinct from business-eligible nearest. Bundlers exclude unimported search. No dynamic geometry engine promised. |
| 7. Other modules | queue/deque/lists/diff exports/implementation; differential/ownership/diff tests/types; migration-sequences | Independent in-place operations, array/head FIFO, ring deque, single/double ownership/links/handles. No Map-list rewrite. indexBy rejects duplicates; diff preserves keys/order/present undefined with different before/after types and explicit contexts. Quicksort/legacy outside package. No own heap/reactive/decimal/money engine. |
| 8. Brand/Zod contracts | Brand/density; holes/own indices/undefined/transforms/async tests; installed Zod Mini smoke | Own type-only brands independent of Zod, no implicit validation/precision. Optional validator checks original array before conversion; core excludes Zod; hot operators do not repeat parsing. |
| 9. Types | root *types.ts; public-time-types; installed strict consumer; business declarations; 18 scaled cases × three processes, six unsuppressed diagnostics; before/layout/rejected candidates | Strict/noUnchecked/exactOptional, no skipLibCheck. Readonly/branded/ref/entity/context/guard/projection/literal/undefined/reused/conditional cases. Source intersections cannot escape to native sorted overloads. Monolithic cost explicitly accepted with before/layout evidence and limitation in design; no IDE-speed claim. |
| 10. Seven scenarios | examples/business.ts/expected.json; business-public/business-oracles tests; installed Node/Bun executions | Catalogue, schedule/capacity, tasks, multi-source report, sync, spatial selection, cancellation/deadline priority. Seven fixed results plus 60 seeded rounds each compare scans/path membership/all-pairs/unit cells/closure/edges/native stable ranking. Native grouping and priority policy retained. |
| 11. Measurements | six runtime families × Node/Bun; pre-timing equivalence assertions; memory/type reports | Relevant build/query/lookup/projection/sort/rebuild separated; sizes/distributions/raw samples/spread preserved. Range validation/materialization measured. Memory: 114 retained cases and 12 checked natural workloads. Runtime/footprint/type penalties explicitly accepted in design. |
| 12. Bundle/archive | verify-package/bundle-installed logs; 38 esbuild/Rollup outputs; installed JS/types/Zod/business; manifest/files | Minified/gzip/Brotli/module attribution. Core excludes domains/Zod/date-fns; time excludes DAG; promised per-op pruning. Export targets present; archive excludes tests/bench/experiments/references/examples and old helper. Archive/JS/d.ts sizes separate. Independent scope prevents self-reference. Private, no runtime deps, no npm publication. |
| 13. Docs/save | README actual imports/examples; design; contributing/research commands; raw/generated reports; links/diff; Git | Functional entries/contract docs match source. Historical research labelled. Legacy-only reference-map helper moved from src; clean build prevents stale delivery. All artifacts versioned; final commit/push is preservation, not a replacement for checks. |
| 14. Completion | Preceding evidence plus current verification | Public implementation and acceptance evidence cover migration scope; Git/remote checked after final preservation before Goal completion. |

## Accepted limitations

Decisions remain in design; this audit links evidence rather than duplicating architecture.

- Native loops often win. Functional sequences and Source-bound constructors have
  measured overhead; there is no universal runtime/bundle superiority.
- Thousands of generic calls in one module compile slower than native decoration;
  the before version already had this cost. Richer overloads add cost. The original
  unfavorable fixture remains alongside 50×100 cases; no IDE claim.
- Bound selections retain stores intentionally. Unbound timeline/queue Map retention
  differs by engine; no mechanism/universal release guarantee without retainer graph.
- Node allocation sampling is approximate and perturbs timing. Bun lacks the same
  profile here; observed heap maximum is not true peak.
- Node/Bun on one M5 and executed ES2023 bundles do not establish browser throughput,
  production latency or dynamic-index behavior.
- Borrowed readonly groups are not frozen; IEEE-754 capacity/coordinates are not exact
  arithmetic; changing static metadata rebuilds the index.

These limit promises of the implemented package; they are not missing speculative
features. The package is not published to npm.
