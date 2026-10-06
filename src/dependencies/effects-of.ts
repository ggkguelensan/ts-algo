import { dependencyState, requireNode, empty, type Dependencies } from "./state.js";
export function effectsOf<R, E, C>(graph: Dependencies<R, E, C>, ref: R): readonly R[] {
  requireNode(graph, ref); return graph[dependencyState].effects.get(ref) ?? empty;
}
