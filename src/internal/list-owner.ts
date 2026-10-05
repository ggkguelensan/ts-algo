export const listOwner = Symbol("list owner");
export function requireOwned<Node extends { [listOwner]: object | undefined }>(node: object, owner: object): Node {
  const internal = node as Node;
  if (internal[listOwner] !== owner) throw new RangeError("Node is foreign or detached");
  return internal;
}
