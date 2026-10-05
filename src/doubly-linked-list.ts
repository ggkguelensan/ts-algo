import { listOwner, requireOwned } from "./internal/list-owner.js";

export interface DoublyLinkedNode<Value> {
  readonly value: Value;
  readonly next: DoublyLinkedNode<Value> | undefined;
  readonly previous: DoublyLinkedNode<Value> | undefined;
}
export interface DoublyLinkedList<Value> extends Iterable<Value> {
  readonly size: number;
  readonly first: DoublyLinkedNode<Value> | undefined;
  readonly last: DoublyLinkedNode<Value> | undefined;
  append(value: Value): DoublyLinkedNode<Value>;
  prepend(value: Value): DoublyLinkedNode<Value>;
  insertAfter(node: DoublyLinkedNode<Value>, value: Value): DoublyLinkedNode<Value>;
  insertBefore(node: DoublyLinkedNode<Value>, value: Value): DoublyLinkedNode<Value>;
  remove(node: DoublyLinkedNode<Value>): Value;
  removeFirst(): Value | undefined;
  removeLast(): Value | undefined;
  clear(): void;
}
interface Node<Value> extends DoublyLinkedNode<Value> {
  next: Node<Value> | undefined;
  previous: Node<Value> | undefined;
  [listOwner]: object | undefined;
}

/** Constant-time insertion/removal by a stable node handle. One wrapper
 * per value. Links are readonly to callers. clear() unlinks every node, O(n).
 */
export function doublyLinkedList<Value>(source: Iterable<Value> = []): DoublyLinkedList<Value> {
  const owner = {};
  let head: Node<Value> | undefined, tail: Node<Value> | undefined, size = 0;
  const owned = (node: DoublyLinkedNode<Value>) => requireOwned<Node<Value>>(node, owner);
  function insert(value: Value, previous?: Node<Value>, next?: Node<Value>): Node<Value> {
    const node: Node<Value> = { value, previous, next, [listOwner]: owner };
    if (previous) previous.next = node; else head = node;
    if (next) next.previous = node; else tail = node;
    size++; return node;
  }
  function unlink(node: Node<Value>): Value {
    if (node.previous) node.previous.next = node.next; else head = node.next;
    if (node.next) node.next.previous = node.previous; else tail = node.previous;
    node.next = undefined; node.previous = undefined; node[listOwner] = undefined; size--;
    return node.value;
  }
  const result: DoublyLinkedList<Value> = {
    get size() { return size; }, get first() { return head; }, get last() { return tail; },
    append: value => insert(value, tail), prepend: value => insert(value, undefined, head),
    insertAfter(handle, value) { const previous = owned(handle); return insert(value, previous, previous.next); },
    insertBefore(handle, value) { const next = owned(handle); return insert(value, next.previous, next); },
    remove: handle => unlink(owned(handle)),
    removeFirst: () => head ? unlink(head) : undefined,
    removeLast: () => tail ? unlink(tail) : undefined,
    clear() { while (head) unlink(head); },
    *[Symbol.iterator]() { for (let node = head; node; node = node.next) yield node.value; },
  };
  for (const value of source) result.append(value);
  return result;
}
