import type { Source } from "../source.js";
export const treeState = Symbol("tree");
export interface Tree<Ref, Entity, Context = undefined> extends Source<Ref, Entity, Context> {
  readonly size: number;
  readonly [treeState]: {
    readonly roots: readonly Ref[];
    readonly parents: ReadonlyMap<Ref, Ref>;
    readonly children: ReadonlyMap<Ref, readonly Ref[]>;
    readonly positions: ReadonlyMap<Ref, number>;
  };
}
export const empty: readonly never[] = [];
export function requireNode<Ref, Entity, Context>(tree: Tree<Ref, Entity, Context>, ref: Ref): void {
  if (!tree[treeState].positions.has(ref)) throw new RangeError("Missing node");
}
