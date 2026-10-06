// Historical method-based API; excluded from the package.
import { listOwner, requireOwned } from "../src/internal/list-owner.js";

export interface LinkedNode<Value> {
  readonly value: Value;
  readonly next: LinkedNode<Value> | undefined;
}
export interface LinkedList<Value> extends Iterable<Value> {
  readonly size: number;
  readonly first: LinkedNode<Value> | undefined;
  readonly last: LinkedNode<Value> | undefined;
  append(value: Value): LinkedNode<Value>;
  prepend(value: Value): LinkedNode<Value>;
  insertAfter(node: LinkedNode<Value>, value: Value): LinkedNode<Value>;
  removeAfter(node: LinkedNode<Value>): Value | undefined;
  removeFirst(): Value | undefined;
  /** O(n), since the previous node is not stored. */
  remove(node: LinkedNode<Value>): Value;
  clear(): void;
}
interface Node<Value> extends LinkedNode<Value> {
  next: Node<Value> | undefined;
  [listOwner]: object | undefined;
}

/** Single next pointer per node. Values retain identity. Do not edit node
 * links or mutate the list while iterating. Detached/foreign handles fail.
 */
export function linkedList<Value>(source: Iterable<Value> = []): LinkedList<Value> {
  const owner = {};
  let head: Node<Value> | undefined, tail: Node<Value> | undefined, size = 0;
  const owned = (node: LinkedNode<Value>) => requireOwned<Node<Value>>(node, owner);
  function unlink(node: Node<Value>, previous?: Node<Value>): Value {
    if (previous) previous.next = node.next; else head = node.next;
    if (tail === node) tail = previous;
    node.next = undefined; node[listOwner] = undefined; size--;
    return node.value;
  }
  const result: LinkedList<Value> = {
    get size() { return size; }, get first() { return head; }, get last() { return tail; },
    append(value) {
      const node: Node<Value> = { value, next: undefined, [listOwner]: owner };
      if (tail) tail.next = node; else head = node;
      tail = node; size++; return node;
    },
    prepend(value) {
      const node: Node<Value> = { value, next: head, [listOwner]: owner };
      head = node; if (!tail) tail = node; size++; return node;
    },
    insertAfter(handle, value) {
      const previous = owned(handle);
      const node: Node<Value> = { value, next: previous.next, [listOwner]: owner };
      previous.next = node; if (tail === previous) tail = node; size++; return node;
    },
    removeAfter(handle) { const previous = owned(handle); return previous.next ? unlink(previous.next, previous) : undefined; },
    removeFirst() { return head ? unlink(head) : undefined; },
    remove(handle) {
      const node = owned(handle);
      let previous: Node<Value> | undefined;
      for (let current = head; current !== node; current = current!.next) previous = current;
      return unlink(node, previous);
    },
    clear() { while (head) unlink(head); },
    *[Symbol.iterator]() { for (let node = head; node; node = node.next) yield node.value; },
  };
  for (const value of source) result.append(value);
  return result;
}
