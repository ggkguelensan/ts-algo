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
node bench-temporal-candidates.ts
bun bench-temporal-candidates.ts
node bench-business.ts
bun bench-business.ts
node bench-spatial.ts
bun bench-spatial.ts
node bench-updates.ts
bun bench-updates.ts
node bench-tanstack.ts
bun bench-tanstack.ts
node date-check.mjs
node bench-memory.mjs
node type-cost.mjs
./node_modules/.bin/tsc -p tsconfig.tanstack.json --noEmit
node bundles.mjs
node summarize.mjs
node summarize-business.mjs
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

A third candidate, `collect.ts`, limits the operation to where/select/limit
with an explicit query context. It reads each visited entity once, preserves
references without select, and returns detached projection values with select
(the value itself can deliberately contain an entity/source reference).
It handles literal reference types and reused type-guard callbacks in types.ts.
It does not implement ordering, joins, grouping, arbitrary step order or a
reactive result. Its fixed ordering is where → select → limit; putting a limit
before a later sort is a separate operation and changes semantics.

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
included. `bench-temporal-candidates.ts` now separates adapted unordered
half-open IDs from raw closed candidates, and checks each against its own
oracle. The raw path has a different result contract and is not ranked as an
equivalent implementation. [Generated tables](results/business.md) show both.

`bench-updates.ts` measures full rebuild after each 20 metadata edits, followed
by one query, for five batches. Native scanning beats this rebuild policy in
the saved cases. This supports a static/read-mostly scope; it neither proves
that all dynamic indices lose nor implements one. `date-check.mjs` runs fresh
Node/Bun processes in UTC and America/New_York: calendar addDays crosses a
23-hour DST day while addHours(24) remains a duration. date-fns closed inclusion
and our half-open window deliberately differ at the end boundary.

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

Coverage now includes native/query/collect alternatives, sorted, current/time-
only lookup, time+query/collect, scheduling, spatial+collect, KDBush, hierarchy,
separate graph algorithms, Graphology, diff, density and complete joined reports
(native/helpers/Remeda/TanStack). Fifty outputs execute with expected results.
Browser resolution includes the events polyfill for Graphology in both
bundlers; leaving a Node external would understate its browser footprint.
Output execution uses Node, not a full browser integration test.

`temporalCollect` costs 2506–2516 minified bytes in its fixture, versus
3413–3442 for temporalQuery and 4158–4211 for the legacy timeline lookup.
Fixture code differs and contributes bytes; these numbers establish import
cost, not a normalized speed or functionality score. The module assertions
prove time-only/collect imports exclude causal algorithms and date-fns remains
type-only. The public sorted fixture excludes other structures.

## Business, memory and typing evidence

[business.md](results/business.md) is generated from raw data, with all seven
scenarios, temporal updates, spatial competitors, retained reports, memory
observations and scaled compiler costs. `scenarios.test.ts` checks fixed
expected results and independent randomized range oracles; temporal tests
add 900 differential windows. All 23 experiment tests pass on Node and Bun.
Main strict consumer checking passes. TanStack has a separate configuration
using skipLibCheck=true because its installed declarations fail the same strict
settings; the errors are preserved rather than suppressed from the record.

Catalogue and task scenarios now include fair native child/adjacency indices,
not just quadratic scans. Library traversals are close to these indexed native
baselines; large gains over scans are algorithm choice, not unique library
value. Scenario query timing excludes index construction, explicitly.

Report direct native aggregation wins over generic helpers in saved fixtures.
Restricted collect improves the abstraction cost especially on Bun, but does
not beat the direct loop. TanStack maintains joins/aggregates through committed
updates and shows different amortization behavior; its cold startup and larger
bundle must be evaluated against the number of future updates. The setup
includes join/total indices; optional paid-filter indexing remains untested.

Retention samples distinguish retaining the original store from retaining its
entities: legacy tree copies entries, releases the input Map, and still owns
entity references. Source-bound time/point selections deliberately retain
the source. Coordinates-only pointIndex and KDBush release the store in these
samples. Projected query arrays unexpectedly retain it in both tested Node
call-site configurations; the mechanism remains unresolved, so no universal detached-
result or leak claim is warranted. Restricted collect now has the same profile:
the input Map is released in all six Node and six Bun projected-value samples,
including inline callbacks. This verifies these cases, not arbitrary callback
captures. Its sampled Node allocation remains higher than native array
filter/map in this workload, despite avoiding an intermediate filtered array.

Node allocation sampling includes minor/major-GC collected objects and is an
estimate; the inspector changes timings. Bun lacks the same profiler here.
Neither after-GC deltas nor observed per-iteration heap maxima prove total
allocations or true peak usage.

Consumer compilation is separate from emitting prototype declarations.
`type-cost.mjs` compares 100/1000/5000 repeated call sites in fresh TS 7.0.2
processes. Restricted collect reduces check time in this fixture but increases
instantiations; native expressions remain cheaper. Reused callbacks, generic
wrappers and conditional options compile in types.ts. Arbitrary heterogeneous
conditional plans are not proven by this fixture or supported as a public API.

## Survival ledger — evidence-backed, pending final scope audit

| Direction | Current decision | Evidence and remaining cost |
|---|---|---|
| General fused query | Keep experimental; do not promote current plan | Literal take rejection, step limit, callback barriers, larger footprint than collect; joins/reports do not establish a speed win |
| Restricted collect + source binding | Candidate for the small selection module | Smaller bundle and lower compiler time than tested generic alternatives; fair native loop remains faster; verified projection retention cases, allocation still exceeds native fixture |
| Independent time/range operations | Keep as primary candidate, split causal graph | Bounds/DST/oracle tests, smaller imports, selective-query gains; full rebuild and large result sets can lose to scans |
| Hierarchy over external references | Simplify to topology data + functions | External parents, live replacement, multiple roots, cycle checks and native-indexed scenario; no special traversal speed advantage claimed |
| Narrow DAG helpers | Separate optional direction | Required tasks scenario and small graph import; broad graph needs use Graphology rather than recreate its features |
| Static point search | Keep competing implementation/optional adapters | Current point index competitive in these fixtures, KDBush compact retained representation; adapters have sorting/tie/resolver costs |
| Join/group helper family | Keep limited experiments | DX and absence/cardinality typing demonstrated; report direct aggregation faster and native is smaller; avoid claiming a SQL replacement |
| Diff/indexBy | Keep small candidate | Duplicate/undefined contracts and synchronization benchmark; compare optimized native loop before claiming unique speed value |
| Priority queue | Prefer established heap for partial processing; native sort for batches | Heap wins extracting 20, loses draining all; cancellation implemented as versioned stale entries, not indexed heap deletion |
| Queue/deque/lists | Preserve current public behavior pending focused comparison | Existing tests/contracts are not evidence that a custom Map-backed linked list beats handles/arrays/Mnemonist |
| QuickSort | Keep theoretical references | Native sort is public foundation; no new QS promotion |
| Dense-array validation / Brand | Keep narrow, optional validation module | Packaging/core import isolation and original density contracts; brands do not validate or provide numeric precision |
| Own reactive database | Exclude from core | TanStack retained report earns different capabilities; Drizzle belongs with a database engine |
| Generic Result/Optional/pipe family | Avoid mandatory wrappers | Found discriminant needed only to preserve valid undefined; no demonstrated need for an entire replacement functional framework |

These decisions concern candidate scope, not new public exports.

## Additional scope assessment

Ranges and reconciliation have concrete mandatory scenarios and are the first
additional candidates. Deduplication/joins are explicit helpers with native
alternatives, not a new collection hierarchy. Batch processing, rolling
windows, bounded history and rule evaluation need workload contracts before
new indices: the current experiments do not justify generic engines for them.

State/transition orchestration is outside the emerging synchronous index scope:
[XState actors](https://stately.ai/docs/actors) cover event-driven lifecycle and
[persistence](https://stately.ai/docs/persistence). A dependency DAG is not an
actor/statechart runtime. Exact decimal arithmetic should first use a selected
numeric model with explicit rounding, for example
[decimal.js](https://mikemcl.github.io/decimal.js/); a number Brand is insufficient.
[Dinero.js](https://github.com/dinerojs/dinero.js/) already separates pure monetary
operations and supports pluggable numeric calculators; do not build a money
engine merely to expand this library. No performance superiority against these
additional-scope libraries has been measured or claimed. LINQ remains an
interface comparison rather than a cross-language runtime ranking.

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

`source.test.ts` now directly verifies live Map membership/replacement,
snapshot selection references, valid undefined versus missing entities,
independent external bindings, one-shot consumption and iterator closure on
callback error. Reference-only collect does not resolve missing entities;
entity-aware callbacks do. Arrays/Set use their elements as identity references.

Before declaring completion: review what evidence supports queue/list and
optimized-native diff decisions;
write executable target-interface examples; reconcile docs/design.md with the
selected scope; audit every objective item and save the final purpose, limits
and implementation order. The current evidence supports a narrower direction,
not universal speed superiority or an already-completed public API migration.
