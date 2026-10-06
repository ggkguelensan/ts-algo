import type { Source } from "../source.js";
export interface Bounds { readonly minX: number; readonly minY: number; readonly maxX: number; readonly maxY: number; }
export interface Nearest<Ref> { readonly reference: Ref; readonly distance: number; }
export interface Node extends Bounds { start: number; end: number; children: Node[] | undefined; }
export const spatialState = Symbol("pointIndex");
export interface PointIndex<Ref, Entity, Context = undefined> extends Source<Ref, Entity, Context> {
  readonly size: number;
  readonly [spatialState]: {
    readonly references: readonly Ref[];
    readonly xs: readonly number[];
    readonly ys: readonly number[];
    readonly order: readonly number[];
    readonly root: Node | undefined;
  };
}
