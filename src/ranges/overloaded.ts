import { validSpan, type Span, type Reservation } from "./span.js";
/** Coalesced intervals where simultaneous units exceed capacity (strictly >). */
export function overloaded(items: readonly Reservation[], window: Span, capacity: number): Span[] {
  validSpan(window);
  if (!Number.isFinite(capacity) || capacity < 0) throw new RangeError("Invalid capacity");
  const deltas = new Map<number, number>();
  for (const item of items) {
    validSpan(item);
    if (!Number.isFinite(item.units) || item.units < 0) throw new RangeError("Invalid units");
    const a = Math.max(item.start, window.start), b = Math.min(item.end, window.end);
    if (a >= b) continue;
    const atStart = (deltas.get(a) ?? 0) + item.units;
    const atEnd = (deltas.get(b) ?? 0) - item.units;
    if (!Number.isFinite(atStart) || !Number.isFinite(atEnd)) throw new RangeError("Load overflow");
    deltas.set(a, atStart); deltas.set(b, atEnd);
  }
  const points = [...deltas.keys()].sort((a, b) => a - b), result: Span[] = [];
  let load = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!, b = points[i + 1]!;
    load += deltas.get(a)!;
    if (!Number.isFinite(load)) throw new RangeError("Load overflow");
    if (load > capacity) {
      const last = result.at(-1);
      if (last?.end === a) result[result.length - 1] = { start: last.start, end: b };
      else result.push({ start: a, end: b });
    }
  }
  return result;
}
