import { subset, type Source } from "../source.js";
import { treeState, requireNode, type Tree } from "./state.js";
import { walk } from "./walk.js";
/** Repeatable lazy preorder including the requested node. */
export function subtree<R, E, C>(tree: Tree<R, E, C>, ref: R): Source<R, E, C> {
  requireNode(tree, ref);
  return subset(tree, { [Symbol.iterator]: () => walk([ref], tree[treeState].children) });
}
