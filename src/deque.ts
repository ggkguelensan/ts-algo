export interface Deque<Value> extends Iterable<Value> {
  readonly size: number;
  pushFront(value: Value): void;
  pushBack(value: Value): void;
  popFront(): Value | undefined;
  popBack(): Value | undefined;
  peekFront(): Value | undefined;
  peekBack(): Value | undefined;
  clear(): void;
}

/** Double-ended queue in a growing circular array. End operations are
 * amortized O(1), with no wrapper node per value. Do not mutate while iterating.
 * Check size to distinguish stored undefined from an empty deque.
 */
export function deque<Value>(source: Iterable<Value> = []): Deque<Value> {
  let items = new Array<Value | undefined>(16);
  let head = 0, count = 0;
  function grow() {
    if (count < items.length) return;
    const next = new Array<Value | undefined>(items.length * 2);
    for (let i = 0; i < count; i++) next[i] = items[(head + i) % items.length];
    items = next; head = 0;
  }
  const result: Deque<Value> = {
    get size() { return count; },
    pushFront(value) { grow(); head = (head + items.length - 1) % items.length; items[head] = value; count++; },
    pushBack(value) { grow(); items[(head + count) % items.length] = value; count++; },
    popFront() {
      if (!count) return undefined;
      const value = items[head]; items[head] = undefined;
      head = (head + 1) % items.length; count--; return value;
    },
    popBack() {
      if (!count) return undefined;
      const index = (head + count - 1) % items.length;
      const value = items[index]; items[index] = undefined; count--; return value;
    },
    peekFront() { return count ? items[head] : undefined; },
    peekBack() { return count ? items[(head + count - 1) % items.length] : undefined; },
    clear() { items = new Array<Value | undefined>(16); head = 0; count = 0; },
    *[Symbol.iterator]() { for (let i = 0; i < count; i++) yield items[(head + i) % items.length]!; },
  };
  for (const value of source) result.pushBack(value);
  return result;
}
