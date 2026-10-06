/** Preorder with O(depth) state; broad sibling groups are borrowed, not copied. */
export function* walk<Ref>(roots: readonly Ref[], children: ReadonlyMap<Ref, readonly Ref[]>): Generator<Ref> {
  const groups: (readonly Ref[])[] = [], positions: number[] = [];
  let group = roots, position = 0;
  while (true) {
    if (position >= group.length) {
      if (!groups.length) return;
      group = groups.pop()!; position = positions.pop()!;
      continue;
    }
    const ref = group[position++]!;
    yield ref;
    const next = children.get(ref);
    if (next?.length) {
      groups.push(group); positions.push(position);
      group = next; position = 0;
    }
  }
}
