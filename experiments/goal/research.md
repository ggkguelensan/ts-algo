# Scope investigation — evidence record

This is the reproducibility and evidence record. Final purpose, module choices
and implementation order have one authoritative source: [docs/design.md](../../docs/design.md).
The starting public implementation is commit `d6dd0bd`.

## Hypotheses to falsify

| Hypothesis | User/problem | Baseline | Potential additional value | Cost/risk | Falsifying experiment |
|---|---|---|---|---|---|
| General collection utilities | TS applications composing filtering, projection and reports | Native JS, Remeda, IxJS | Better inference or cheaper fused execution | Large utility surface and duplicated ecosystem | Same inputs/results, pipeline inference, two-bundler footprint and calibrated runtime |
| Reference-bound indices | Editors and applications whose entities live in separate stores | Map + manual key resolution, existing spatial/interval libraries | Independent metadata with composable entity-aware selections | Retained stores, resolver overhead and read-policy ambiguity | Timeline/spatial selection → filter → projection with external metadata and live entity replacement |
| Time/range business algorithms | Scheduling and capacity planning | Direct sweep/binary search, date-fns + interval library | Explicit half-open semantics and less repeated glue | Calendar semantics, dynamic update complexity | Conflicts, free intervals and capacity with a slow oracle |
| Adapter layer | Applications already using established libraries | Direct integration | Shared selection contracts | Additional bytes, lifetime and conversion overhead | Compare direct competitor use against adapter end-to-end |
| Narrow combination | Applications repeatedly selecting external entities by time/space/hierarchy | Bespoke application code | Small modules that compose without owning entities | Difficult generic transitions and competing lifetimes | All mandatory scenarios plus consumer type-check and retention measurements |

The narrow combination was selected; the other hypotheses were rejected as a
general purpose. See the final design for the evidence-backed survival decisions.

## Actual implementation versus intention

At the research baseline, the root exported sorted, Brand, isDenseArray,
pointIndex, tree, timeline, queue/deque and linked lists. The migration is tracked
in design.md; the old timeline is now a historical reference. `/zod` is optional. Query, selection,
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
node bench-costs.ts
bun bench-costs.ts
node bench-sequences.ts
bun bench-sequences.ts
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
node summarize-costs.mjs
node type-display.mjs
node verify-final.mjs
```

Benchmarks must run sequentially without tests or other benchmarks in parallel.
`measure.ts` defines warmup, sample count, calibration and natural-GC policy.
Raw elapsed samples, loop counts and normalized batch costs are preserved in
`results/*.json`, with runtime, dependency versions, hardware and seeds in the
source. Different calibrated iteration counts measure steady workload cost,
not latency percentiles of isolated application requests.

## Public migration gates

The active migration is authoritative in docs/design.md. Intermediate public
core/time evidence is kept separately from the original comparison results:

```sh
npm --prefix ../.. run check
npm --prefix ../.. test
npm --prefix ../.. run test:bun
npm run check
npm test
npm run test:bun
node bench-public-core.ts
bun bench-public-core.ts
node bundles-public-core.mjs
node bench-public-time.ts
bun bench-public-time.ts
node bench-public-structure.ts
bun bench-public-structure.ts
node verify-package.mjs --migration
node summarize-public-core.mjs
node summarize-public-time.mjs
node summarize-public-structure.mjs
```

Run benchmarks sequentially. The installed-package gate bundles bare imports
with both esbuild and Rollup and checks included modules/output. The public
time declarations use structural Date/number windows without a date-fns type
peer; official Interval compatibility is checked in public-time-types.ts.
Previous method-based chronology is retained in references/legacy-timeline.ts
for historical baselines and is excluded from the package.

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
(native/helpers/Remeda/TanStack). The saved outputs execute with expected results.
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
add 900 differential windows. All 29 experiment tests pass on Node and Bun.
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
includes join/total indices; both join-only and additional paid-filter-index configurations are measured.

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

## Final decisions

The survival ledger and profiles are authoritative in [design.md](../../docs/design.md).
The prototypes remain non-public; completing this investigation does not migrate
the released interface.

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

## Final verification coverage

Source mutation/one-shot/error contracts are in source.test.ts. Executable target
examples and Source sorting are in target-examples.ts / target.test.ts. The
unannotated return types are emitted by type-display.mjs; sorted operation
context is explicit and separate from source context.

bench-costs.ts isolates resolution/materialization and single/repeated queries,
then compares identical full Map sorting paths (including a forEach decoration
baseline). bench-sequences.ts compares cursor/current/Mnemonist FIFO, waves and
node-handle versus Map-link editing. Map-links is an optimistic unchecked draft,
not a public contender. bench-business.ts now includes native-loop diff and
cold build+query for hierarchy/tasks. Spatial nearest additionally resolves,
filters and projects the geometric result; it does not search for the nearest
qualifying entity. TanStack includes both paid-filter-index configurations.

Unbound temporal retention is runtime-dependent in the saved worker: Node
releases the store, Bun retains it. No store-release guarantee is accepted from
this experiment. Context/closure retainer mechanisms remain uncertain.

The requirement-by-requirement completion audit is [completion.md](completion.md).
