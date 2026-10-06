# Стоимость типов публичного ядра

TypeScript 7.0.2, v25.8.1. Strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes, skipLibCheck=false. Три свежих последовательных процесса на fixture; декларации прототипа строятся один раз вне замеров.

| Calls | Variant | Median wall, ms | Median compiler memory | Instantiations |
|---:|---|---:|---|---|
| 100 | native | 302.4 | 140037K | 95849 |
| 100 | remeda | 544.6 | 272586K | 411439 |
| 100 | restricted | 315.9 | 140643K | 127483 |
| 100 | publicCollect | 308.0 | 140586K | 128029 |
| 100 | nativeSorted | 304.8 | 140733K | 98825 |
| 100 | publicSorted | 303.6 | 138874K | 94491 |
| 1000 | native | 313.5 | 162044K | 115649 |
| 1000 | remeda | 667.3 | 300351K | 460039 |
| 1000 | restricted | 456.5 | 164003K | 426283 |
| 1000 | publicCollect | 484.3 | 164002K | 434029 |
| 1000 | nativeSorted | 316.2 | 169919K | 145625 |
| 1000 | publicSorted | 487.2 | 145235K | 99891 |
| 5000 | native | 857.3 | 260696K | 203649 |
| 5000 | remeda | 6637.5 | 419284K | 676039 |
| 5000 | restricted | 3610.5 | 267503K | 1754283 |
| 5000 | publicCollect | 4387.1 | 267571K | 1794029 |
| 5000 | nativeSorted | 904.8 | 300658K | 353625 |
| 5000 | publicSorted | 6012.0 | 174951K | 123891 |

Public потребитель проверяет собранные d.ts. Bare exports установленного архива дополнительно проверяет verify-package.mjs. Fixtures — независимые вызовы, без аннотаций результата; это не проверка отзывчивости IDE или произвольных глубоких цепочек. Filter/projection и cached sort — разные группы сравнения.

Для 100 calls: publicCollect/prototype 0.97×; publicSorted/native decorated 1.00× по wall time.

Для 1000 calls: publicCollect/prototype 1.06×; publicSorted/native decorated 1.54× по wall time.

Для 5000 calls: publicCollect/prototype 1.22×; publicSorted/native decorated 6.64× по wall time.

## Контроль исходной версии и раскладки модулей

Те же 5000 независимых вызовов проверены в одном модуле и в 50 модулях по 100. Before-declaration механически извлечена из исходного sorted в bd9a160; исходный хеш сохранён.

| Variant | Modules | Median wall, ms |
|---|---:|---:|
| beforeArray | 1 | 4572.6 |
| beforeArray | 50 | 369.5 |
| publicArray | 1 | 6008.3 |
| publicArray | 50 | 392.8 |
| nativeArray | 1 | 919.8 |
| nativeArray | 50 | 426.7 |
| beforeMap | 50 | 354.9 |
| publicMap | 50 | 415.6 |
| publicSource | 50 | 364.3 |
| publicCollect | 50 | 534.7 |
| prototypeCollect | 50 | 500.5 |
| nativeCollect | 50 | 404.7 |

Большой одиночный модуль медленный уже до миграции. Public sorted дополнительно дороже исходной версии в этом случае; цена сохраняется как ограничение за Source/context overloads и безопасное исключение fallback. В раскладке 50×100 разница public/before array и public/prototype collect меньше 20%; Map и bound Source измерены отдельно. Это эксперимент о раскладке вызовов, не гарантия IDE и не инструкция пользователю переписывать приложение.

Array-first кандидат оказался хуже и отклонён; [изолированные гипотезы](migration-type-investigation.json) не обосновали потерю публичных контрактов. Простая сигнатура без Map/Source не равноценна API. Переиспользование callbacks не рекомендуется как доказанное ускорение.

Выведенные branded refs, narrowed projection, domain selection и double-node сохранены вместе с шестью несупрессированными отрицательными диагностиками в [сырых результатах](migration-type-cost.json). Выведенные типы семи установленных бизнес-примеров находятся в [отдельном отчёте](migration-business-types.json). Before/layout raw данные: [migration-type-baseline.json](migration-type-baseline.json).

Воспроизведение из experiments/goal: `node type-public.mjs`, затем `node type-migration-baseline.mjs` после root build.
