import { subset, type Source } from "../source.js";
import { dependencyState, requireNode, type Dependencies } from "./state.js";
import { reachable } from "./reachable.js";
export function ancestors<R, E, C>(graph: Dependencies<R, E, C>, ref: R): Source<R, E, C> {
  requireNode(graph, ref); return subset(graph, { [Symbol.iterator]: () => reachable(ref, graph[dependencyState].causes) });
}
