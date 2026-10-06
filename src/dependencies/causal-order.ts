import { type Source } from "../source.js";
import { dependencyState, type Dependencies } from "./state.js";
import { arraySource } from "../internal/array-source.js";
/** Cached stable Kahn order, bound to current entities; no copied result array. */
export function causalOrder<R, E, C>(graph: Dependencies<R, E, C>): Source<R, E, C> {
  return arraySource(graph, graph[dependencyState].order);
}
