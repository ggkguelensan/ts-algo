import { subset, type Source } from "../source.js";
import { treeState, requireNode, type Tree } from "./state.js";
/** Immediate parent first; excludes the requested node. */
export function ancestors<R, E, C>(tree: Tree<R, E, C>, ref: R): Source<R, E, C> {
  requireNode(tree, ref);
  return subset(tree, { *[Symbol.iterator]() {
    const parents = tree[treeState].parents;
    let current = ref;
    while (parents.has(current)) { current = parents.get(current)!; yield current; }
  } });
}
