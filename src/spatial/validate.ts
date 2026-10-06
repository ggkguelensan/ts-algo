import type { Bounds } from "./state.js";
export function finite(value: number): void {
  if (!Number.isFinite(value)) throw new RangeError("Coordinates must be finite");
}
export function validateBounds(bounds: Bounds): void {
  if (typeof bounds !== "object" || bounds === null) throw new RangeError("Invalid bounds");
  finite(bounds.minX); finite(bounds.minY); finite(bounds.maxX); finite(bounds.maxY);
  if (bounds.minX > bounds.maxX || bounds.minY > bounds.maxY) {
    throw new RangeError("Bounds must be ordered");
  }
}
