# Goal experiments

Non-public experiments for determining the scope of ts-algo. This directory
has its own package and lockfile: comparison dependencies are not library
runtime dependencies. No prototype is exported by the library.

The requested investigation is tracked below; checked items require links to
reproducible evidence, rather than a design intention.

## Completion evidence

- [x] Current state, packaging and hypotheses — [research](research.md), [package check](results/package.json)
- [ ] Competing source/context models and query implementations
- [ ] Temporal-only index and timeline comparison
- [ ] Catalogue scenario
- [ ] Scheduling/capacity scenario
- [ ] Dependency/tasks scenario
- [ ] Joined report scenario
- [ ] Synchronization scenario
- [ ] Spatial scenario
- [ ] Priority scenario
- [ ] Additional scope and competitor decisions
- [ ] Node/V8 and Bun/JSC raw performance results
- [ ] Allocation/retention and natural GC observations
- [ ] Two bundlers, executable outputs, gzip and Brotli
- [ ] Positive/negative inference and diagnostic examples
- [ ] Scaled consumer type-check cost
- [ ] Decision ledger, final purpose, target interface and implementation order

Until the evidence is complete, the investigation remains ongoing.

Current runnable commands and limitations are in [research.md](research.md).
The preliminary tables are generated from raw results by `summarize.mjs`.
