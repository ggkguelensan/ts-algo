# Память публичных модулей

Дата: 2026-10-06T01:23:41.254Z; Apple M5; v25.8.1. 50 000 сущностей, три свежих процесса на каждый retained-case/runtime.

| Вариант | Runtime | Map жив в трёх случаях | Median heap Δ, MiB | External Δ, MiB | Array buffers Δ, MiB |
|---|---|---|---:|---:|---:|
| publicSource | node | да/да/да | 15.86 | 0.00 | 0.00 |
| publicTree | node | да/да/да | 22.02 | 0.00 | 0.00 |
| publicTime | node | да/да/да | 16.29 | 0.76 | 0.76 |
| unboundPublicTime | node | да/да/да | 16.65 | 0.76 | 0.76 |
| publicGraph | node | да/да/да | 23.95 | 0.00 | 0.00 |
| publicPoints | node | да/да/да | 18.40 | 0.00 | 0.00 |
| unboundPublicPoints | node | нет/нет/нет | 2.92 | 0.00 | 0.00 |
| publicProjected | node | нет/нет/нет | 0.39 | 0.00 | 0.00 |
| publicQueue | node | нет/нет/нет | 14.49 | 0.00 | 0.00 |
| publicSingle | node | нет/нет/нет | 16.41 | 0.00 | 0.00 |
| publicDouble | node | нет/нет/нет | 16.80 | 0.00 | 0.00 |
| tree | node | нет/нет/нет | 22.21 | 0.00 | 0.00 |
| currentTime | node | да/да/да | 18.81 | 0.00 | 0.00 |
| temporal | node | да/да/да | 16.27 | 0.38 | 0.38 |
| points | node | нет/нет/нет | 2.49 | 0.00 | 0.00 |
| boundPoints | node | да/да/да | 18.36 | 0.00 | 0.00 |
| kdbush | node | нет/нет/нет | 0.07 | 0.86 | 0.86 |
| restricted | node | нет/нет/нет | 0.39 | 0.00 | 0.00 |
| projectedNative | node | нет/нет/нет | 0.38 | 0.00 | 0.00 |
| publicSource | bun | да/да/да | 23.76 | 12.46 | 0.00 |
| publicTree | bun | да/да/да | 36.40 | 12.52 | 0.00 |
| publicTime | bun | да/да/да | 25.36 | 13.27 | 0.38 |
| unboundPublicTime | bun | да/да/да | 25.76 | 13.28 | 0.38 |
| publicGraph | bun | да/да/да | 36.79 | 12.51 | 0.00 |
| publicPoints | bun | да/да/да | 25.42 | 12.51 | 0.00 |
| unboundPublicPoints | bun | нет/нет/нет | 2.55 | 0.09 | 0.00 |
| publicProjected | bun | нет/нет/нет | 0.55 | 0.05 | 0.00 |
| publicQueue | bun | да/да/нет | 23.79 | 12.47 | 0.00 |
| publicSingle | bun | нет/нет/нет | 22.42 | 12.48 | 0.00 |
| publicDouble | bun | нет/нет/нет | 22.07 | 12.48 | 0.00 |
| tree | bun | нет/нет/нет | 37.36 | 12.50 | 0.00 |
| currentTime | bun | да/да/да | 29.04 | 12.55 | 0.00 |
| temporal | bun | да/да/да | 25.75 | 13.65 | 0.38 |
| points | bun | нет/нет/нет | 2.11 | 0.09 | 0.00 |
| boundPoints | bun | да/да/да | 25.36 | 12.52 | 0.00 |
| kdbush | bun | нет/нет/нет | 1.03 | 0.97 | 0.86 |
| restricted | bun | нет/нет/нет | 0.54 | 0.05 | 0.00 |
| projectedNative | bun | нет/нет/нет | 0.88 | 0.04 | 0.00 |

Heap и external/arrayBuffers нельзя складывать механически: области могут перекрываться и по-разному учитываются движками. Очередь и списки удерживают сами сущности, даже если исходный Map недоступен. Bound Source и индексы намеренно сохраняют resolver и хранилище.

У публичного unbound timeline Bun сохраняет исходный Map в этом fixture; у Node — нет. Queue также показывает разное удержание Map между движками. Механизм без retainer graph не установлен; форма результата не гарантирует освобождения источника. Numeric projection в обоих движках не удерживает Map в проверенных случаях.

| Natural workload | Runtime | Итерации | Sampled allocation, MiB | Observed heap maximum, MiB | GC events |
|---|---|---:|---:|---:|---:|
| public | node | 30 | 103.57 | 34.44 | 8 |
| restricted | node | 30 | 103.37 | 35.49 | 8 |
| remeda | node | 30 | 368.22 | 60.37 | 13 |
| native | node | 30 | 52.19 | 24.45 | 4 |
| sortCached | node | 30 | 45.91 | 22.40 | 7 |
| sortDecorated | node | 30 | 92.29 | 36.55 | 4 |
| public | bun | 30 | недоступно | 3.17 | 0 |
| restricted | bun | 30 | недоступно | 2.69 | 0 |
| remeda | bun | 30 | недоступно | 8.86 | 0 |
| native | bun | 30 | недоступно | 2.87 | 0 |
| sortCached | bun | 30 | недоступно | 2.42 | 0 |
| sortDecorated | bun | 30 | недоступно | 2.40 | 0 |

Natural cases сверяются с нативным оракулом до профилирования. Cached sort сравнивается только с decorated sort; остальные cases выполняют одинаковые filter/projection. Public case создаёт Source на вызов, restricted prototype переиспользует привязку.

Node Inspector sampling включает объекты, собранные minor/major GC; это оценка, не точный объём. Профилирование влияет на время, поэтому эти timings не ранжируют throughput. Bun не предоставляет здесь эквивалентных Inspector/GC данных; ноль событий означает отсутствие наблюдателя, а не отсутствие GC. Observed maximum после итераций не равен истинному peak.

[Сырые результаты](migration-memory.json). Воспроизведение из experiments/goal: `node bench-public-memory.mjs` после root build.
