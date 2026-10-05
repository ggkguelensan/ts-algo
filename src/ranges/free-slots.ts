import { validSpan, type Span } from "./span.js";
/** Complement of the union of positive-duration spans, clipped to [start,end). */
export function freeSlots(items: readonly Span[], window: Span): Span[] {
  validSpan(window);
  for (const item of items) validSpan(item);
  if (window.start === window.end) return [];
  const spans = items.filter(i => i.start < i.end && i.start < window.end && i.end > window.start)
    .toSorted((a, b) => a.start - b.start);
  const result: Span[] = [];
  let cursor = window.start;
  for (const item of spans) {
    const start = Math.max(item.start, window.start);
    if (start > cursor) result.push({ start: cursor, end: start });
    cursor = Math.max(cursor, Math.min(item.end, window.end));
  }
  if (cursor < window.end) result.push({ start: cursor, end: window.end });
  return result;
}
