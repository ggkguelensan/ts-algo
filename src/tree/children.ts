import { treeState, requireNode, empty, type Tree } from "./state.js";
export function children<R, E, C>(tree: Tree<R, E, C>, ref: R): readonly R[] {
  requireNode(tree, ref); return tree[treeState].children.get(ref) ?? empty;
}
