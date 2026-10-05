import { test } from "node:test";
import assert from "node:assert/strict";
import { queue, deque, linkedList, doublyLinkedList, sortedReferences, type LinkedList } from "../src/index.js";

test("queue FIFO, compaction, cleared references, undefined values and identity", () => {
  const values = Array.from({ length: 6000 }, (_, id) => Object.freeze({ id }));
  const q = queue(values);
  for (let i = 0; i < 4000; i++) assert.equal(q.dequeue(), values[i]);
  assert.equal(q.peek(), values[4000]);
  q.enqueue(values[0]!);
  assert.deepEqual([...q], [...values.slice(4000), values[0]]);
  assert.deepEqual(sortedReferences(q, v => v.id, (a, b) => a - b), [values[0], ...values.slice(4000)]);
  assert.equal(q.size, 2001);
  q.clear(); assert.equal(q.size, 0); assert.equal(q.dequeue(), undefined);
  const nullable = queue<undefined>(); nullable.enqueue(undefined);
  assert.equal(nullable.size, 1); assert.equal(nullable.dequeue(), undefined); assert.equal(nullable.size, 0);
  q.enqueue(values[1]!); assert.equal(q.dequeue(), values[1]); assert.equal(q.size, 0);
});

test("deque differential operations across wraps, growth, empty boundaries and clear", () => {
  const d = deque<number | undefined>(), expected: (number | undefined)[] = [];
  let seed = 31;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
  for (let i = 0; i < 10000; i++) {
    const action = random() % 6, value = i % 31 ? i : undefined;
    if (action === 0) { d.pushFront(value); expected.unshift(value); }
    else if (action < 3) { d.pushBack(value); expected.push(value); }
    else if (action === 3) assert.equal(d.popFront(), expected.shift());
    else if (action === 4) assert.equal(d.popBack(), expected.pop());
    else if (i % 101 === 0) { d.clear(); expected.length = 0; }
    assert.equal(d.size, expected.length);
    assert.equal(d.peekFront(), expected[0]); assert.equal(d.peekBack(), expected.at(-1));
    if (i % 37 === 0) assert.deepEqual([...d], expected);
  }
  assert.deepEqual([...d], expected);
  const entity = Object.freeze({ rank: 1 });
  const objects = deque([entity]); assert.equal(objects.popBack(), entity);
});

test("singly linked handles, insert/remove, invalid ownership and detached links", () => {
  const list = linkedList<number | undefined>();
  const first = list.append(1), third = list.append(3), second = list.insertAfter(first, 2);
  assert.equal(first.next, second); assert.equal(second.next, third);
  assert.deepEqual([...list], [1, 2, 3]);
  assert.equal(list.remove(second), 2); assert.equal(second.next, undefined);
  assert.throws(() => list.remove(second), RangeError);
  assert.throws(() => list.insertAfter(linkedList([9]).first!, 0), RangeError);
  assert.equal(list.removeAfter(first), 3); assert.equal(list.last, first);
  list.prepend(undefined); assert.equal(list.removeFirst(), undefined); assert.equal(list.size, 1);
  assert.equal(list.removeAfter(first), undefined);
  list.clear(); assert.equal(first.next, undefined); assert.equal(list.first, undefined);
  assert.equal(list.last, undefined); assert.equal(list.size, 0);
  assert.throws(() => list.insertAfter(first, 2), RangeError);
});

test("doubly linked handles remain stable through edits, backwards traversal and clear", () => {
  const a = Object.freeze({ rank: 3 }), b = Object.freeze({ rank: 1 }), c = Object.freeze({ rank: 2 });
  const list = doublyLinkedList<Readonly<{ rank: number }>>([a]);
  const first = list.first!, last = list.append(c), middle = list.insertBefore(last, b);
  assert.equal(first.next, middle); assert.equal(middle.previous, first); assert.equal(last.previous, middle);
  assert.deepEqual(sortedReferences(list, v => v.rank, (a, b) => a - b), [b, c, a]);
  const backwards = []; for (let n = list.last; n; n = n.previous) backwards.push(n.value);
  assert.deepEqual(backwards, [c, b, a]);
  assert.equal(list.remove(middle), b); assert.equal(first.next, last); assert.equal(last.previous, first);
  assert.equal(middle.next, undefined); assert.equal(middle.previous, undefined);
  assert.throws(() => list.remove(middle), RangeError);
  assert.throws(() => list.insertAfter(doublyLinkedList([a]).first!, b), RangeError);
  const before = list.prepend(b); list.insertAfter(before, c);
  assert.equal(list.removeFirst(), b); assert.equal(list.removeLast(), c);
  list.clear(); assert.equal(list.size, 0); assert.equal(first.next, undefined); assert.equal(last.previous, undefined);
  assert.equal(list.removeFirst(), undefined); assert.equal(list.removeLast(), undefined);
});

test("linked lists differential local edits preserve every retained handle and neighbour", () => {
  const lists: Omit<LinkedList<number>, "removeAfter">[] = [linkedList<number>(), doublyLinkedList<number>()];
  for (const list of lists) {
    const expected: ReturnType<typeof list.append>[] = [];
    let seed = 29;
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let step = 0; step < 1000; step++) {
      const index = expected.length ? random() % expected.length : 0;
      const action = random() % 4;
      if (!expected.length || action === 0) expected.push(list.append(step));
      else if (action === 1) expected.unshift(list.prepend(step));
      else if (action === 2) expected.splice(index + 1, 0, list.insertAfter(expected[index]!, step));
      else { const [removed] = expected.splice(index, 1); assert.equal(list.remove(removed!), removed!.value); assert.equal(removed!.next, undefined); }
      assert.equal(list.size, expected.length);
      assert.deepEqual([...list], expected.map(node => node.value));
      assert.equal(list.first, expected[0]); assert.equal(list.last, expected.at(-1));
      expected.forEach((node, i) => {
        assert.equal(node.next, expected[i + 1]);
        if ("previous" in node) assert.equal(node.previous, expected[i - 1]);
      });
    }
  }
});
