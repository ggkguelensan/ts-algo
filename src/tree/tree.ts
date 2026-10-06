import { entity, subset, type Source } from "../source.js";
import { sourceState } from "../internal/source-state.js";
import { treeState, type Tree } from "./state.js";
import { walk } from "./walk.js";
/** Snapshot external topology, retain live entities; nullish parents denote roots. */
export function tree<Ref extends NonNullable<unknown>, Entity, Context>(
  source: Source<Ref, Entity, Context>,
  parent: (entity: Entity, ref: Ref, context: Context) => Ref | null | undefined,
): Tree<Ref, Entity, Context> {
  const refs = Array.from(source), members = new Set(refs), roots: Ref[] = [];
  if (members.size !== refs.length) throw new RangeError("Duplicate reference");
  const parents = new Map<Ref, Ref>(), children = new Map<Ref, Ref[]>(), positions = new Map<Ref, number>();
  const context = source[sourceState].context;
  for (const ref of refs) {
    if (ref == null) throw new RangeError("Nullish reference");
    const p = parent(entity(source, ref), ref, context);
    let siblings: Ref[];
    if (p == null) siblings = roots;
    else {
      if (!members.has(p)) throw new RangeError("Missing parent");
      parents.set(ref, p);
      const existing = children.get(p);
      siblings = existing ?? [];
      if (!existing) children.set(p, siblings);
    }
    positions.set(ref, siblings.length); siblings.push(ref);
  }
  let visited = 0;
  for (const _ of walk(roots, children)) visited++;
  if (visited !== refs.length) throw new RangeError("Cycle");
  const order = { [Symbol.iterator]: () => walk(roots, children) };
  return { ...subset(source, order), size: refs.length, [treeState]: { roots, parents, children, positions } };
}
