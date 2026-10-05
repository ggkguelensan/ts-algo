import { performance } from "node:perf_hooks";

export let checksum = 0;
export function measure(
  variants: Record<string, () => number>, settings: { samples: number; warmups: number; gcBeforeSample?: boolean },
): Record<string, { median: number; min: number; max: number }> {
  if (settings.gcBeforeSample && typeof globalThis.gc !== "function") throw new Error("Run with --expose-gc");
  const entries = Object.entries(variants);
  const samples: Record<string, number[]> = Object.fromEntries(entries.map(([name]) => [name, []]));
  for (let round = -settings.warmups; round < settings.samples; round++) {
    for (let offset = 0; offset < entries.length; offset++) {
      const [name, run] = entries[(offset + round + settings.warmups) % entries.length]!;
      if (settings.gcBeforeSample) globalThis.gc!();
      const start = performance.now(); checksum += run(); const duration = performance.now() - start;
      if (round >= 0) samples[name]!.push(duration);
    }
  }
  return Object.fromEntries(Object.entries(samples).map(([name, values]) => {
    values.sort((a, b) => a - b);
    return [name, { median: values[Math.floor(values.length / 2)]!, min: values[0]!, max: values.at(-1)! }];
  }));
}
