/** Every index below length must be an own property; undefined is a value. */
export function isDenseArray(value: unknown): value is unknown[] {
  if (!Array.isArray(value)) return false;
  for (let i = 0; i < value.length; i++) {
    if (!Object.hasOwn(value, i)) return false;
  }
  return true;
}
