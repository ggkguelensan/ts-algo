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
Тесты проверяют runtime-поведение; `test/types.ts` проверяет вывод и ограничения
типов при компиляции. Учебные алгоритмы в `references` проверяются вместе с
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
