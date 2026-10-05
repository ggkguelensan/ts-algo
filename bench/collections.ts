import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { performance } from "node:perf_hooks";
import { sorted } from "../src/index.js";

// Fixed baseline: array-only implementation from commit f91aab6.
// Kept here to measure overload dispatch and direct Map traversal against it.
function arrayBaseline<Ref>(
  references: readonly Ref[],
  getValue: (ref: Ref) => number,
  compare: (a: number, b: number) => number,
): Ref[] {
  const length = references.length;
  if (length <= 1) return references.slice();
  const values = new Array<number>(length);
  const order = new Array<number>(length);
  for (let i = 0; i < length; i++) {
    values[i] = getValue(references[i]!);
    order[i] = i;
  }
  order.sort((a, b) => compare(values[a]!, values[b]!));
  const result = new Array<Ref>(length);
  for (let i = 0; i < length; i++) result[i] = references[order[i]!]!;
  return result;
}

const sizes = [1000, 100000];
const samples = 9;
const warmups = 5;
const numeric = (a: number, b: number) => a - b;
const rows: {
  size: number; shape: string; collection: string; variant: string;
  medianMs: number; samplesMs: number[];
}[] = [];

for (const size of sizes) {
  for (const shape of ["random", "sorted", "few-distinct"]) {
    const refs = Array.from({ length: size }, (_, i) => i);
    const keys = refs.slice();
    let state = 0x12345678;
    const next = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state;
    };
    if (shape === "random") {
      for (let i = size - 1; i > 0; i--) {
        const j = next() % (i + 1);
        [keys[i], keys[j]] = [keys[j]!, keys[i]!];
      }
    } else if (shape === "few-distinct") {
      for (let i = 0; i < size; i++) keys[i] = (next() >>> 16) % 8;
    }
    const map = new Map(refs.map(ref => [ref, Object.freeze({ age: keys[ref]! })]));
    const set = new Set(refs);
    const expected = refs.slice().sort((a, b) => keys[a]! - keys[b]!);
    const cases = [
      { collection: "Array", variants: [
        { name: "before", run: () => arrayBaseline(refs, ref => keys[ref]!, numeric) },
        { name: "overload", run: () => sorted(refs, ref => keys[ref]!, numeric) },
      ] },
      { collection: "Map", variants: [
        { name: "before", run: () => arrayBaseline(Array.from(map.keys()), ref => map.get(ref)!.age, numeric) },
        { name: "overload", run: () => sorted(map, entity => entity.age, numeric) },
      ] },
      { collection: "Set", variants: [
        { name: "before", run: () => arrayBaseline(Array.from(set), ref => keys[ref]!, numeric) },
        { name: "overload", run: () => sorted(set, ref => keys[ref]!, numeric) },
      ] },
    ];

    for (const current of cases) {
      const times: number[][] = [[], []];
      for (let round = 0; round < warmups + samples; round++) {
        for (let offset = 0; offset < 2; offset++) {
          const index = (round + offset) % 2;
          const variant = current.variants[index]!;
          globalThis.gc?.();
          const start = performance.now();
          const result = variant.run();
          const elapsed = performance.now() - start;
          assert.deepEqual(result, expected);
          if (round >= warmups) times[index]!.push(elapsed);
        }
      }
      current.variants.forEach((variant, index) => {
        const samplesMs = times[index]!;
        const ordered = samplesMs.slice().sort(numeric);
        rows.push({ size, shape, collection: current.collection, variant: variant.name,
          medianMs: ordered[Math.floor(ordered.length / 2)]!, samplesMs,
        });
      });
      const pair = rows.slice(-2);
      console.log(`${size}/${shape}/${current.collection}: before=${pair[0]!.medianMs.toFixed(3)}ms overload=${pair[1]!.medianMs.toFixed(3)}ms`);
    }
  }
}

const metadata = {
  recordedAt: new Date().toISOString(), node: process.version, v8: process.versions.v8,
  platform: process.platform, arch: process.arch, cpu: cpus()[0]?.model,
  sizes, samples, warmups, baselineCommit: "f91aab6", seed: "0x12345678; LCG",
  gcBeforeEachRun: typeof globalThis.gc === "function",
};
mkdirSync("docs", { recursive: true });
writeFileSync("docs/collections-results.json", JSON.stringify({ metadata, rows }, null, 2) + "\n");
const lines = [
  "# Перегрузки коллекций: сравнение с прежним интерфейсом", "",
  "Генерируется `npm run bench:collections`. Исходные измерения: [collections-results.json](collections-results.json).", "",
  `Среда: Node ${metadata.node}, V8 ${metadata.v8}, ${metadata.platform}/${metadata.arch}, ${metadata.cpu}.`,
  `На вариант: ${warmups} прогрева и ${samples} измерений. В таблице медианы в миллисекундах.`, "",
  "| n | Вход | Коллекция | Прежний вызов | Перегрузка | Перегрузка / прежний |",
  "|---:|---|---|---:|---:|---:|",
];
for (let i = 0; i < rows.length; i += 2) {
  const before = rows[i]!;
  const after = rows[i + 1]!;
  lines.push(`| ${before.size} | ${before.shape} | ${before.collection} | ${before.medianMs.toFixed(3)} | ${after.medianMs.toFixed(3)} | ${(after.medianMs / before.medianMs).toFixed(2)}× |`);
}
lines.push("", "Прежний вариант — массивный алгоритм из коммита f91aab6: для Map с внешним Array.from(keys) и get на каждый ключ, для Set с внешним Array.from(set). Полное время включает материализацию, кеш, сортировку и результат. Обе версии устойчивы и сохраняют источник.", "",
  "Для массива библиотека выделяет три массива, для Map/Set — четыре, включая снимок ссылок; это те же количества, что у соответствующих прежних вызовов. Перегрузка Map получает сущности через forEach, без поиска по ключам и entry-пар. Внутренние буферы V8 добавляются в обоих случаях.", "",
  "Порядок запуска вариантов чередуется; явный GC вызывается до замера, автоматический GC внутри возможен. Каждый результат проверяется вне замера. Разница в несколько процентов может быть шумом. Пиковый heap в байтах не измеряется; результат одной среды не гарантирует ускорения на других данных.", "");
writeFileSync("docs/collections-results.md", lines.join("\n"));
