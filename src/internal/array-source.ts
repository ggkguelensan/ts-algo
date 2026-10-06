import { sourceState } from "./source-state.js";
import type { Source } from "../source.js";
/** Only for dense reference arrays created/owned by index algorithms. Not public. */
export function arraySource<R, E, C>(source: Source<R, E, C>, references: readonly R[]): Source<R, E, C> {
  const data = source[sourceState], iterator = () => references[Symbol.iterator]();
  return { [sourceState]: { resolve: data.resolve, context: data.context, references, iterator }, [Symbol.iterator]: iterator };
}
