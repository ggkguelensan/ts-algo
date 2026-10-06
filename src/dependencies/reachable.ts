export function* reachable<R>(ref: R, edges: ReadonlyMap<R, readonly R[]>): Generator<R> {
  const seen = new Set<R>([ref]), queue = [ref];
  for (let i = 0; i < queue.length; i++) for (const child of edges.get(queue[i]!) ?? []) {
    if (!seen.has(child)) { seen.add(child); queue.push(child); yield child; }
  }
}
