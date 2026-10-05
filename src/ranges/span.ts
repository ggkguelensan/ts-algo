/** Numeric units chosen by the caller; these operations perform no calendar arithmetic. */
export interface Span { readonly start: number; readonly end: number; }
export interface Reservation extends Span { readonly units: number; }
export function validSpan(span: Span): void {
  if (typeof span !== "object" || span === null || !Number.isFinite(span.start)
    || !Number.isFinite(span.end) || span.start > span.end) throw new RangeError("Invalid interval");
}
