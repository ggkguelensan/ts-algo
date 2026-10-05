import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { performance } from "node:perf_hooks";
import { sortedReferences } from "../src/index.js";

type GetValue = (ref: number) => number;
type Compare = (a: number, b: number) => number;
type Algorithm = (refs: readonly number[], getValue: GetValue, compare: Compare) => number[];

// Same key cache, index representation, and result construction as our API.
// Native sort supplies stability itself, so it needs no index tie-breaker.
const nativeCached: Algorithm = (refs, getValue, compare) => {
  if (refs.length <= 1) return refs.slice();
  const values = new Array<number>(refs.length);
  const order = new Array<number>(refs.length);
  for (let i = 0; i < refs.length; i++) {
    values[i] = getValue(refs[i]!);
    order[i] = i;
  }
  order.sort((a, b) => compare(values[a]!, values[b]!));
  const result = new Array<number>(refs.length);
  for (let i = 0; i < refs.length; i++) result[i] = refs[order[i]!]!;
  return result;
};

const algorithms: Record<string, Algorithm> = {
  "qs-stable": (refs, getValue, compare) => sortedReferences(refs, getValue, compare),
  "v8-direct": (refs, getValue, compare) =>
    refs.slice().sort((a, b) => compare(getValue(a), getValue(b))),
  "v8-cached": nativeCached,
};
const names = Object.keys(algorithms);
const shapes = ["random", "sorted", "reverse", "almost-sorted", "equal", "few-distinct", "organ-pipe"];
const modes = ["array", "map", "expensive-map"];
const sizes = (process.env.BENCH_SIZES ?? "1000,10000,100000").split(",").map(Number);
const samples = Number(process.env.BENCH_SAMPLES ?? 7);
const warmups = Number(process.env.BENCH_WARMUPS ?? 3);
const adversarialMax = Number(process.env.BENCH_ADVERSARIAL_MAX ?? 10000);
assert(sizes.every(n => Number.isSafeInteger(n) && n >= 2));
assert(Number.isSafeInteger(samples) && samples >= 3);
assert(Number.isSafeInteger(warmups) && warmups >= 1);
assert(Number.isSafeInteger(adversarialMax) && adversarialMax >= 2);

function random(seed: number): () => number {
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}

function keysFor(shape: string, length: number): number[] {
  const keys = Array.from({ length }, (_, i) => i);
  const next = random(0x12345678 ^ length);
  if (shape === "random") {
    for (let i = length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [keys[i], keys[j]] = [keys[j]!, keys[i]!];
    }
  } else if (shape === "reverse") {
    keys.reverse();
  } else if (shape === "almost-sorted") {
    for (let i = 0; i < Math.max(1, Math.floor(length / 100)); i++) {
      const a = Math.floor(next() * length);
      const b = Math.floor(next() * length);
      [keys[a], keys[b]] = [keys[b]!, keys[a]!];
    }
  } else if (shape === "equal") {
    keys.fill(7);
  } else if (shape === "few-distinct") {
    for (let i = 0; i < length; i++) keys[i] = Math.floor(next() * 8);
  } else if (shape === "organ-pipe") {
    for (let i = 0; i < length; i++) keys[i] = Math.min(i, length - 1 - i);
  }
  return keys;
}

function expensiveProjection(value: number): number {
  let projected = value | 0;
  for (let i = 0; i < 32; i++) {
    projected = Math.imul(projected ^ (projected >>> 13), 0x5bd1e995) + i;
  }
  return projected >>> 0;
}

function quantile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.floor((sorted.length - 1) * fraction)]!;
}

interface Row {
  size: number;
  shape: string;
  mode: string;
  algorithm: string;
  medianMs: number;
  p10Ms: number;
  p90Ms: number;
  samplesMs: number[];
  getValueCalls: number;
  comparisons: number;
}
const rows: Row[] = [];

for (const size of sizes) {
  for (const shape of shapes) {
    // This input triggers quadratic work. Keep default runs bounded.
    if (shape === "organ-pipe" && size > adversarialMax) continue;
    const keys = keysFor(shape, size);
    const refs = Array.from({ length: size }, (_, i) => i);
    const storage = new Map(refs.map(ref => [ref, Object.freeze({ key: keys[ref]! })]));

    for (const mode of modes) {
      const getValue: GetValue = mode === "array"
        ? ref => keys[ref]!
        : mode === "map"
          ? ref => storage.get(ref)!.key
          : ref => expensiveProjection(storage.get(ref)!.key);
      const compare: Compare = (a, b) => a - b;
      // Build the stable oracle outside timing and without relying on our sort.
      const expected = refs.slice().sort((a, b) => compare(getValue(a), getValue(b)));
      const timings = new Map(names.map(name => [name, [] as number[]]));
      const counts = new Map<string, { getValueCalls: number; comparisons: number }>();

      for (const name of names) {
        let getValueCalls = 0;
        let comparisons = 0;
        const result = algorithms[name]!(refs, ref => {
          getValueCalls++;
          return getValue(ref);
        }, (a, b) => {
          comparisons++;
          return compare(a, b);
        });
        assert.deepEqual(result, expected, `${name}: ${size}/${shape}/${mode}`);
        assert.deepEqual(refs, Array.from({ length: size }, (_, i) => i));
        counts.set(name, { getValueCalls, comparisons });
      }

      // Warm-up and measured rounds rotate the algorithm order.
      // Counters, input generation, oracle and correctness checks are untimed.
      for (let round = 0; round < warmups + samples; round++) {
        for (let offset = 0; offset < names.length; offset++) {
          const name = names[(round + offset) % names.length]!;
          globalThis.gc?.();
          const start = performance.now();
          const result = algorithms[name]!(refs, getValue, compare);
          const elapsed = performance.now() - start;
          assert.deepEqual(result, expected);
          if (round >= warmups) timings.get(name)!.push(elapsed);
        }
      }

      for (const name of names) {
        const samplesMs = timings.get(name)!;
        const ordered = samplesMs.slice().sort((a, b) => a - b);
        rows.push({ size, shape, mode, algorithm: name,
          medianMs: quantile(ordered, 0.5), p10Ms: quantile(ordered, 0.1),
          p90Ms: quantile(ordered, 0.9), samplesMs, ...counts.get(name)!,
        });
      }
      console.log(`${size}/${shape}/${mode}: ${names.map(name =>
        `${name}=${rows.findLast(row => row.algorithm === name)!.medianMs.toFixed(3)}ms`).join(" ")}`);
    }
  }
}

const metadata = {
  recordedAt: new Date().toISOString(), node: process.version, v8: process.versions.v8,
  platform: process.platform, arch: process.arch, cpu: cpus()[0]?.model,
  sizes, samples, warmups, adversarialMax, seed: "0x12345678 XOR size; xorshift32",
  gcBeforeEachRun: typeof globalThis.gc === "function",
};
mkdirSync("docs", { recursive: true });
writeFileSync("docs/benchmark-results.json", JSON.stringify({ metadata, rows }, null, 2) + "\n");

const largest = Math.max(...sizes);
const lines = [
  "# Результат сравнения с V8", "",
  "Этот файл генерирует `npm run bench`; исходные измерения — [benchmark-results.json](benchmark-results.json).", "",
  `Среда: Node ${metadata.node}, V8 ${metadata.v8}, ${metadata.platform}/${metadata.arch}, ${metadata.cpu}.`,
  `На случай: ${warmups} прогрева и ${samples} измерений. Ниже медианы для наибольшего измеренного размера каждой формы, в миллисекундах. Основной размер — ${largest.toLocaleString("en-US")}; organ-pipe ограничен ${adversarialMax} из-за квадратичной работы QS.`, "",
  "| n | Доступ к значению | Вход | QS stable | V8 direct | V8 cached | QS / V8 cached |",
  "|---:|---|---|---:|---:|---:|---:|",
];
for (const mode of modes) {
  for (const shape of shapes) {
    const measuredSizes = rows.filter(row => row.mode === mode && row.shape === shape).map(row => row.size);
    if (measuredSizes.length === 0) continue;
    const measuredSize = Math.max(...measuredSizes);
    const values = names.map(name => rows.find(row =>
      row.size === measuredSize && row.mode === mode && row.shape === shape && row.algorithm === name)!.medianMs);
    lines.push(`| ${measuredSize} | ${mode} | ${shape} | ${values[0]!.toFixed(3)} | ${values[1]!.toFixed(3)} | ${values[2]!.toFixed(3)} | ${(values[0]! / values[2]!).toFixed(2)}× |`);
  }
}
lines.push("", "Коэффициент больше 1 означает, что наш QS медленнее V8 с тем же кешем. Все варианты сохраняют порядок равных ключей и исходный массив.", "",
  "Полное время включает получение значений, выделение вспомогательных массивов, сортировку и создание результата. Явный GC вызывается перед измерением, но автоматический GC внутри измерения возможен. Это микробенчмарк одной среды, не универсальная оценка.", "",
  "`array`: получение ключа по индексу. `map`: получение ключа сущности из Map. `expensive-map`: Map плюс детерминированная проекция из 32 целочисленных шагов; она меняет порядок ключей, поэтому sorted/reverse в этом режиме описывают исходные ключи, а не итоговую проекцию.", "",
  "Число сравнений и вызовов getValue измерено отдельным проходом без включения счётчиков в замер времени. Пиковый heap и объём выделений в байтах этим бенчмарком не измеряются.", "");
writeFileSync("docs/benchmark-results.md", lines.join("\n"));
