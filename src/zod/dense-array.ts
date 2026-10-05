import * as z from "zod/mini";
import { isDenseArray } from "../is-dense-array.js";

/** Validate the original array's shape before Zod parses its elements. */
export function denseArray<Element extends z.ZodMiniType>(element: Element) {
  return z.pipe(
    z.custom<unknown[]>(isDenseArray, {
      error: "Expected an array with an own element at every index (no holes)",
    }),
    z.array(element),
  );
}
