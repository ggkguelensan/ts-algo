import { treeState, type Tree } from "./state.js";
/** Borrowed readonly topology view; no copy/freeze. */
export function roots<R, E, C>(tree: Tree<R, E, C>): readonly R[] { return tree[treeState].roots; }
