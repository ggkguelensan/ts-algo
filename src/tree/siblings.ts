import { treeState, type Tree } from "./state.js";
function sibling<R, E, C>(tree: Tree<R, E, C>, ref: R, offset: number): R | undefined {
  const data = tree[treeState], position = data.positions.get(ref);
  if (position === undefined) throw new RangeError("Missing node");
  const group = data.parents.has(ref) ? data.children.get(data.parents.get(ref)!)! : data.roots;
  return group[position + offset];
}
export function nextSibling<R, E, C>(tree: Tree<R, E, C>, ref: R): R | undefined { return sibling(tree, ref, 1); }
export function previousSibling<R, E, C>(tree: Tree<R, E, C>, ref: R): R | undefined { return sibling(tree, ref, -1); }
