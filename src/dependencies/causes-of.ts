import { dependencyState, type Dependencies } from "./state.js";
export function causesOf<R, E, C>(graph: Dependencies<R, E, C>, ref: R): readonly R[] {
  const causes = graph[dependencyState].causes.get(ref);
  if (causes === undefined) throw new RangeError("Missing node");
  return causes;
}
