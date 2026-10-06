import { treeState, requireNode, type Tree } from "./state.js";
export function parent<R, E, C>(tree: Tree<R, E, C>, ref: R): R | undefined {
  requireNode(tree, ref); return tree[treeState].parents.get(ref);
}
