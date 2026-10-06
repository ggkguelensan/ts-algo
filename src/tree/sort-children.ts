import { entity, subset } from "../source.js";
import { sorted } from "../sorted.js";
import type { Compare } from "../compare.js";
import { treeState, type Tree } from "./state.js";
import { walk } from "./walk.js";
export function sortChildren<R, E, S, V>(tree: Tree<R, E, S>, select: (entity: E, ref: R) => V, compare: Compare<V>): Tree<R, E, S>;
export function sortChildren<R, E, S, V, C>(tree: Tree<R, E, S>, select: (entity: E, ref: R, context: C) => V, compare: Compare<V>, options: { context: C }): Tree<R, E, S>;
/** New topology view; stable sibling groups, live entities and shared parents. */
export function sortChildren<R, E, S, V, C>(tree: Tree<R, E, S>, select: (entity: E, ref: R, context: C) => V, compare: Compare<V>, options?: { context: C }): Tree<R, E, S> {
  const data = tree[treeState], context = options?.context as C; // Context required by the three-argument overload.
  const positions = new Map<R, number>();
  const order = (refs: readonly R[]) => {
    const result = refs.length < 2 ? refs : sorted(refs, ref => select(entity(tree, ref), ref, context), compare);
    for (let i = 0; i < result.length; i++) positions.set(result[i]!, i);
    return result;
  };
  const roots = order(data.roots), children = new Map<R, readonly R[]>();
  data.children.forEach((refs, ref) => children.set(ref, order(refs)));
  const iteration = { [Symbol.iterator]: () => walk(roots, children) };
  return { ...subset(tree, iteration), size: tree.size, [treeState]: { roots, children, parents: data.parents, positions } };
}
