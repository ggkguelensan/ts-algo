import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { cpus } from "node:os";
import { createRequire } from "node:module";
import * as z from "zod/mini";
import { isDenseArray } from "../src/index.js";
import { denseArray } from "../src/zod/index.js";
import { measure, checksum } from "./measure.js";

const item = z.optional(z.number());
const elements = z.array(item);
const dense = denseArray(item);
const settings = { samples: 7, warmups: 3, gcBeforeSample: true };
const rows = [];
for (const size of [100, 10_000, 100_000]) {
  // Push builds an ordinary dense input; undefined is explicitly present.
  const input: (number | undefined)[] = [];
  for (let i = 0; i < size; i++) input.push(i % 10 === 0 ? undefined : i);
  assert.equal(isDenseArray(input), true);
  assert.deepEqual(dense.parse(input), input);
  const sparse = input.slice();
  delete sparse[Math.floor(size / 2)];
  assert.equal(dense.safeParse(sparse).success, false);
  assert.equal(elements.safeParse(sparse).success, true);
  const repetitions = Math.max(1, Math.floor(100_000 / size));
  const result = measure({
    shapeOnly: () => { let count = 0; for (let i = 0; i < repetitions; i++) count += Number(isDenseArray(input)); return count; },
    elementsOnly: () => { let count = 0; for (let i = 0; i < repetitions; i++) count += elements.parse(input).length; return count; },
    shapeAndElements: () => { let count = 0; for (let i = 0; i < repetitions; i++) count += dense.parse(input).length; return count; },
  }, settings);
  for (const [variant, timing] of Object.entries(result)) {
    rows.push({ size, variant, repetitions, medianMs: timing.median / repetitions,
      minMs: timing.min / repetitions, maxMs: timing.max / repetitions });
  }
}
const bun = (process.versions as Record<string, string | undefined>).bun;
const runtime = bun ? "bun" : "node";
const metadata = { recordedAt: new Date().toISOString(), node: process.version, bun,
  zod: createRequire(import.meta.url)("zod/package.json").version as string,
  v8: bun ? undefined : process.versions.v8, cpu: cpus()[0]?.model,
  platform: process.platform, arch: process.arch, settings, checksum };
const basename = `validation-results-${runtime}`;
writeFileSync(`docs/${basename}.json`, JSON.stringify({ metadata, rows }, null, 2) + "\n");
const lines = ["# Проверка плотных массивов", "",
  `Среда: ${bun ? `Bun ${bun} / JavaScriptCore` : `Node ${process.version} / V8 ${process.versions.v8}`}, Zod ${metadata.zod}, ${metadata.cpu}, ${metadata.platform}/${metadata.arch}.`, "",
  `Исходные данные: [${basename}.json](${basename}.json). ${settings.warmups} прогрева, ${settings.samples} образцов; порядок вариантов чередуется, GC перед образцом вне замера. Время одного вызова: медиана / min / max в миллисекундах.`, "",
  "| n | Операция | Медиана | min | max |", "|---:|---|---:|---:|---:|"];
for (const row of rows) lines.push(`| ${row.size} | ${row.variant} | ${row.medianMs.toFixed(4)} | ${row.minMs.toFixed(4)} | ${row.maxMs.toFixed(4)} |`);
lines.push("", "shapeOnly — isDenseArray: только наличие собственных индексов, без чтения значений и копирования. elementsOnly — нативная для Zod схема z.array(z.optional(z.number())): проверка элементов и создание нового массива; дырки не отклоняет. shapeAndElements — denseArray той же схемы элементов: оба контракта и новый массив. Это стоимость разных проверок, а не сравнение равнозначных алгоритмов.", "",
  "Схемы создаются до замера. Вход плотный, с явным undefined на каждом десятом месте. На малых входах несколько вызовов в образце; время делится на их количество. Пиковая память и браузеры не измерялись; автоматический GC внутри образца возможен. Проверка формы не гарантирует конкретный elements kind JS-движка.", "");
writeFileSync(`docs/${basename}.md`, lines.join("\n"));
console.log(lines.join("\n"));
