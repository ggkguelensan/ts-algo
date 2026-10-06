# Разработка

Проект использует ESM. Для сборки нужен TypeScript из devDependencies; для тестов
и Node-бенчмарков — современный Node.js с поддержкой ES2023. Для альтернативных
замеров и сборки browser-бандлов нужен Bun. Версии измеренных сред указаны в отчётах.

```sh
npm ci
npm run check
npm test
npm run test:bun
```

`package.json` — источник команд проекта; `tsconfig.json` — настроек компилятора.
Тесты проверяют runtime-поведение; compile-time fixtures в `test/*types.ts`
проверяют вывод и ограничения типов при компиляции. Учебные алгоритмы в `references` проверяются вместе с
библиотекой, но не входят в её публичные экспорты.

## Бенчмарки

```sh
npm run bench
npm run bench:collections
npm run bench:spatial
npm run bench:spatial:bun
npm run bench:hierarchy-time
npm run bench:hierarchy-time:bun
npm run bench:sequences-intervals
npm run bench:sequences-intervals:bun
npm run bench:bundle
npm run bench:validation
npm run bench:validation:bun
```

Скрипты пересобирают проект и перезаписывают соответствующие отчёты в docs.
Названия, настройки входов и переменные окружения находятся в исходниках bench;
методика, версии runtime и ограничения измерений — в сгенерированных отчётах.
Не запускайте измерения одновременно с другими тяжёлыми задачами.

## Проверки публичной миграции

Сначала выполните root build. Затем из `experiments/goal`:

```sh
npm ci
node verify-package.mjs --migration
node type-public.mjs
node type-migration-baseline.mjs
node bench-public-memory.mjs
node summarize-public-costs.mjs
node verify-migration.mjs
```

Проверка архива устанавливает пакет в отдельный consumer, компилирует примеры
без paths/skipLibCheck, выполняет их в Node/Bun и собирает минимальные приложения
esbuild/Rollup. `type-public.mjs` измеряет потребителей готовых деклараций;
выведенные типы и несупрессированные отрицательные диагностики сохраняются
рядом с raw measurements. Memory profiler не измеряет истинный peak.

Остальные сравнительные команды перечислены в
[исследовательском отчёте](../experiments/goal/research.md). Результаты миграции
имеют префикс migration; исходные исследовательские отчёты сохраняются отдельно.
