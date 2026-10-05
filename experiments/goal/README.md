# Goal experiments

Non-public experiments for determining the scope of ts-algo. This directory
has its own package and lockfile: comparison dependencies are not library
runtime dependencies. No prototype is exported by the library.

The requested investigation is tracked below; checked items require links to
reproducible evidence, rather than a design intention.

## Completion evidence

- [x] Current state, packaging and hypotheses — [research](research.md), [package check](results/package.json)
- [x] Competing source/context models and query implementations
- [x] Temporal-only index and timeline comparison
- [x] Catalogue scenario — [tests](scenarios.test.ts), [measurements](results/business.md)
- [x] Scheduling/capacity scenario — [range oracles](scenarios.test.ts), [measurements](results/business.md)
- [x] Dependency/tasks scenario — [native indexed baseline](scenario-tasks.ts), [measurements](results/business.md)
- [x] Joined report scenario — [alternatives](scenarios.ts), [retained TanStack query](tanstack.ts), [measurements](results/business.md)
- [x] Synchronization scenario — [duplicates/undefined](scenarios.test.ts), [measurements](results/business.md)
- [x] Spatial scenario — [six implementations plus native loop](scenario-spatial.ts), [measurements](results/business.md)
- [x] Priority scenario — [batch/partial processing](scenario-priority.ts), [measurements](results/business.md)
- [x] Additional scope and competitor decisions
- [x] Node/V8 and Bun/JSC raw performance results — [query/time/bundles](results/initial.md), [business/updates/spatial](results/business.md)
- [x] Allocation/retention and natural GC observations — [worker](memory-worker.mjs), [raw limitations](results/memory.json)
- [x] Two bundlers, executable outputs, gzip and Brotli — [56 executable outputs](results/bundles.json)
- [x] Positive/negative inference and diagnostic examples — [types](types.ts), [diagnostics](results/type-cost.json)
- [x] Scaled consumer type-check cost — [fresh compiler processes](type-cost.mjs), [raw](results/type-cost.json)
- [x] Decision ledger, final purpose, target interface and implementation order

The requirement-by-requirement research audit is [completion.md](completion.md);
[final verification](results/verification.json) records the command gates.
The candidate interface remains experimental; public migration is separate work.

Current runnable commands and limitations are in [research.md](research.md).
Tables are generated from raw results by the three `summarize*.mjs` scripts.
Final purpose, contracts and module decisions have one source: [design.md](../../docs/design.md).
