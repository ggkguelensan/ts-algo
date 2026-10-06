import { entity, type Source } from "../source.js";
import { sourceState } from "../internal/source-state.js";
import { dependencyState, type Dependencies } from "./state.js";
import { arraySource } from "../internal/array-source.js";
/** Snapshot acyclic edges/membership; entities remain live and independent of time. */
export function dependencies<R, E, C>(source: Source<R, E, C>, causes: (entity: E, ref: R, context: C) => Iterable<R>): Dependencies<R, E, C> {
  const refs = Array.from(source), members = new Set(refs), incoming = new Map<R, R[]>(), outgoing = new Map<R, R[]>();
  if (members.size !== refs.length) throw new RangeError("Duplicate reference");
  const context = source[sourceState].context;
  for (const ref of refs) {
    const parents = Array.from(new Set(causes(entity(source, ref), ref, context)));
    for (const cause of parents) {
      if (!members.has(cause)) throw new RangeError("Missing cause");
      const effects = outgoing.get(cause);
      if (effects) effects.push(ref); else outgoing.set(cause, [ref]);
    }
    incoming.set(ref, parents);
  }
  const pending = new Map<R, number>(), order: R[] = [];
  for (const ref of refs) { const n = incoming.get(ref)!.length; pending.set(ref, n); if (n === 0) order.push(ref); }
  for (let i = 0; i < order.length; i++) for (const ref of outgoing.get(order[i]!) ?? []) {
    const n = pending.get(ref)! - 1; pending.set(ref, n); if (n === 0) order.push(ref);
  }
  if (order.length !== refs.length) throw new RangeError("Cycle");
  return { ...arraySource(source, refs), size: refs.length, [dependencyState]: { causes: incoming, effects: outgoing, order } };
}
