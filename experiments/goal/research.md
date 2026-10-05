# Scope investigation — ongoing

This is the evidence and decision record for the active goal. It does not
replace `docs/design.md` until the mandatory experiments have been completed.
The starting public implementation is commit `d6dd0bd`.

## Hypotheses to falsify

| Hypothesis | User/problem | Baseline | Potential additional value | Cost/risk | Falsifying experiment |
|---|---|---|---|---|---|
| General collection utilities | TS applications composing filtering, projection and reports | Native JS, Remeda, IxJS | Better inference or cheaper fused execution | Large utility surface and duplicated ecosystem | Same inputs/results, pipeline inference, two-bundler footprint and calibrated runtime |
| Reference-bound indices | Editors and applications whose entities live in separate stores | Map + manual key resolution, existing spatial/interval libraries | Independent metadata with composable entity-aware selections | Retained stores, resolver overhead and read-policy ambiguity | Timeline/spatial selection → filter → projection with external metadata and live entity replacement |
| Time/range business algorithms | Scheduling and capacity planning | Direct sweep/binary search, date-fns + interval library | Explicit half-open semantics and less repeated glue | Calendar semantics, dynamic update complexity | Conflicts, free intervals and capacity with a slow oracle |
| Adapter layer | Applications already using established libraries | Direct integration | Shared selection contracts | Additional bytes, lifetime and conversion overhead | Compare direct competitor use against adapter end-to-end |
| Narrow combination | Applications repeatedly selecting external entities by time/space/hierarchy | Bespoke application code | Small modules that compose without owning entities | Difficult generic transitions and competing lifetimes | All mandatory scenarios plus consumer type-check and retention measurements |

No hypothesis has yet been selected as the final purpose.

## Actual implementation versus intention

The root currently exports sorted, Brand, isDenseArray, pointIndex, tree,
timeline, queue/deque and linked lists. `/zod` is optional. Query, selection,
projections, joins and general aggregates are not public implementations.
Tree snapshots Map entries; Timeline resolves current entities while caching
time and causal metadata. PointIndex does not retain an entity resolver.
Collection constructors still install custom methods. Timeline still constructs
causal state even when there are no edges. Those observations are independent
of claims in the architecture document.

## Reproducibility

Run from this directory:

```sh
npm ci
npm --prefix ../.. run build
npm run check
npm test
npm run test:bun
node verify-package.mjs
node bench-query.ts
bun bench-query.ts
node bench-temporal.ts
bun bench-temporal.ts
node bundles.mjs
node summarize.mjs
```

Benchmarks must run sequentially without tests or other benchmarks in parallel.
`measure.ts` defines warmup, sample count, calibration and natural-GC policy.
Raw elapsed samples, loop counts and normalized batch costs are preserved in
`results/*.json`, with runtime, dependency versions, hardware and seeds in the
source. Different calibrated iteration counts measure steady workload cost,
not latency percentiles of isolated application requests.

## Competing query prototypes

`query.ts` contains two non-public implementations:

1. Typed sequential steps, a fused generator per segment, and a native cached
   sorting barrier. Entity resolution occurs once per element within a fused
   callback segment, but can occur again after a barrier.
2. Source-preserving lazy functions composed explicitly. Each callback can
   resolve the entity again. This simpler composition has independent operators.

Both preserve callback encounter order, close a consumed generator on early
termination, keep duplicates, and sort indices to avoid native undefined-value
special handling. `take(0)` does not iterate upstream. Sorting singleton/empty
sources does not invoke selectors, matching the existing sorted contract.

The step prototype is limited to four steps. It has not proved terminal
operations, joins, grouping, conditional plans or unlimited-step inference.
It has a known valid-query rejection with literal refs and generic take,
recorded as an expected compiler error in `types.ts`. That is negative evidence,
not an accepted public contract. The main Map/context/projection/type-guard
cases infer correctly, and wrong callbacks are compile-time failures.

Array benchmark baselines use the same array. Map cases include both repeated
key materialization and pre-existing key snapshots for Remeda; snapshot cost
is measured separately. Native direct loops and Ix consume keys without
materializing the full input. Do not attribute snapshot cost to the operator
engine alone.

## Temporal-only prototype

`temporal.ts` owns cached numeric metadata and a source binding, with no graph
or ReadonlyMap facade. Construction sorts source positions directly and stores
starts/ends/maxima in Float64Array. Point-only inputs omit maxima and share
start/end storage. Selectors run once per occurrence; repeated references are
rejected. Selection returns a bound source with a materialized refs array.
Converting that selection with Array.from adds a second refs allocation;
end-to-end query measurements include this when the consumer requests an array.

The date-fns dependency is type-only (`Interval<Instant, Instant>` constrains
both ends). Date values are normalized and snapshotted. This experiment only
accepts numeric time or Date; it does not claim calendar/DST support. Tests
cover invalid Date, mutation after construction, missing live entities,
boundaries, points, nesting, empty inputs/windows, context and 900 seeded
differential windows.

Temporal benchmark results preserve chronological stable order. Mnemonist
returns closed-overlap candidates; its adapted path filters to our half-open
contract and sorts by start/source position. That adaptation is explicitly
included. Unordered search and independent raw-candidate cost still need a
separate experiment before general claims about Mnemonist.

## Packaging decision — implemented

The published artifact previously omitted exports targets. Root package.json
now includes `dist/src` and builds during prepack. `verify-package.mjs` checks
all exported paths, excludes experiment/test/benchmark source, installs the
archive into its own package scope and executes core and Zod imports on both
Node and Bun. `results/package.json` is the authoritative result.

The package remains private; nothing was published. The baseline suite passed
45 tests in each runtime after the packaging change.

## Bundle experiment

`bundles.mjs` uses esbuild and Rollup with Terser at an ES2023 browser target.
Each output is imported and its exported run function is checked. Gzip level 9
and Brotli quality 11 are recorded alongside included modules. Attribution of
module bytes is bundler-specific. Fixture code contributes to totals.

The current coverage includes native/query alternatives, one sorted import,
current temporal lookup, temporal-only lookup, temporal+query, spatial lookup,
KDBush and density validation. It does not yet cover a complete joined report,
TanStack DB, graph separation or all mandatory end-to-end cases.

## Primary sources and inspection

Dependency versions are pinned in package-lock.json. Installed declarations
and implementations are authoritative for runnable experiments. Documentation:

- [Remeda](https://remedajs.com/docs/) — data-first/data-last functions and lazy pipelines.
- [IxJS](https://github.com/ReactiveX/IxJS) — pull-based sync/async iteration.
- [TanStack DB live queries](https://tanstack.com/db/latest/docs/guides/live-queries) — declarative and incremental collections, not sequential callback semantics.
- [Drizzle select](https://orm.drizzle.team/docs/select) — SQL executed through a database engine.
- [Mnemonist intervals](https://yomguithereal.github.io/mnemonist/static-interval-tree.html) — numeric static intervals, closed boundaries.
- [KDBush](https://github.com/mourner/kdbush) — static flat KD-tree and transferred buffers.
- [Flatbush](https://github.com/mourner/flatbush), [RBush](https://github.com/mourner/rbush), [D3 quadtree](https://github.com/d3/d3-quadtree) — distinct spatial representations.
- [Graphology](https://graphology.github.io/standard-library/) — graph and independent algorithm modules.
- [LINQ](https://learn.microsoft.com/en-us/dotnet/csharp/linq/) — language/ecosystem comparison only.

## Next evidence required

Complete the mandatory business scenarios, terminal/group/join alternatives,
spatial and priority competitors, updates, memory/GC observations, scaled
consumer type checks, diagnostics, full-scenario bundles and the final survival
ledger before selecting a purpose. No final superiority claim is supported yet.
