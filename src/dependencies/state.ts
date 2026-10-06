import type { Source } from "../source.js";
export const dependencyState = Symbol("dependencies");
export interface Dependencies<R, E, C = undefined> extends Source<R, E, C> {
  readonly size: number;
  readonly [dependencyState]: {
    readonly causes: ReadonlyMap<R, readonly R[]>;
    readonly effects: ReadonlyMap<R, readonly R[]>;
    readonly order: readonly R[];
  };
}
export const empty: readonly never[] = [];
export function requireNode<R, E, C>(graph: Dependencies<R, E, C>, ref: R): void {
  if (!graph[dependencyState].causes.has(ref)) throw new RangeError("Missing node");
}
