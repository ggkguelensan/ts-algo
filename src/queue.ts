export interface Queue<Value> extends Iterable<Value> {
  readonly size: number;
  enqueue(value: Value): void;
  dequeue(): Value | undefined;
  peek(): Value | undefined;
  clear(): void;
}

/** FIFO using native push and a read offset; occasional compaction.
 * Removal is amortized O(1). Check size to distinguish stored undefined
 * from an empty queue. Do not mutate during iteration.
 */
export function queue<Value>(source: Iterable<Value> = []): Queue<Value> {
  let items: (Value | undefined)[] = Array.from(source);
  let head = 0;
  return {
    get size() { return items.length - head; },
    enqueue(value) { items.push(value); },
    dequeue() {
      if (head === items.length) return undefined;
      const value = items[head];
      items[head++] = undefined; // release the removed reference
      if (head === items.length) { items = []; head = 0; }
      else if (head >= 1024 && head * 2 >= items.length) { items = items.slice(head); head = 0; }
      return value;
    },
    peek() { return items[head]; },
    clear() { items = []; head = 0; },
    *[Symbol.iterator]() { for (let i = head; i < items.length; i++) yield items[i]!; },
  };
}
