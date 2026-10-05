// Compiled by tsc, not executed. Check inference and overload rejection.
import { sorted, pointIndex, tree, timeline, queue, deque, linkedList, doublyLinkedList } from "../src/index.js";
import type { Brand } from "../src/index.js";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
type Milliseconds = Brand<number, "Milliseconds">;
type Seconds = Brand<number, "Seconds">;
type BrandBase = Assert<Milliseconds extends number ? true : false>;
type BrandRejectsRaw = Assert<Equal<number extends Milliseconds ? true : false, false>>;
type BrandSeparatesUnits = Assert<Equal<Seconds extends Milliseconds ? true : false, false>>;
type MultipleBrands = Brand<Brand<string, "EntityId">, "UserId">;
type BrandComposition = Assert<MultipleBrands extends Brand<string, "EntityId" | "UserId"> ? true : false>;
function sortedBrandedKeys(storage: ReadonlyMap<Brand<string, "UserId">, { age: number }>) {
  const result = sorted(storage, entity => entity.age, (a, b) => a - b);
  type PreservedKeys = Assert<Equal<typeof result, Brand<string, "UserId">[]>>;
  return result;
}
const numeric = (a: number, b: number) => a - b;

const map: ReadonlyMap<string, Readonly<{ age: number }>> = new Map();
const mapResult = sorted(map, (entity, key) => {
  const id: string = key;
  void id;
  return entity.age;
}, numeric);
type MapResult = Assert<Equal<typeof mapResult, string[]>>;

const set: ReadonlySet<Readonly<{ age: number }>> = new Set();
const setResult = sorted(set, entity => entity.age, numeric);
type SetResult = Assert<Equal<typeof setResult, Readonly<{ age: number }>[]>>;

const arrayResult = sorted([3, 1, 2] as const, x => x, numeric);
type ArrayResult = Assert<Equal<typeof arrayResult, (1 | 2 | 3)[]>>;

function* numbers() { yield 3; yield 1; yield 2; }
const iterableResult = sorted(numbers(), x => x, numeric);
type IterableResult = Assert<Equal<typeof iterableResult, (1 | 2 | 3)[]>>;

// Map must not accidentally select the generic iterable/entry-tuple overload.
// @ts-expect-error Map selectors receive entities, not [key, entity] tuples.
sorted(map, ([key, entity]: [string, { age: number }]) => entity.age, numeric);

// @ts-expect-error The selected numeric values need a numeric comparator.
sorted(map, entity => entity.age, (a: string, b: string) => a.localeCompare(b));

void mapResult; void setResult; void arrayResult; void iterableResult;

const positions: ReadonlyMap<string, { x: number; y: number }> = new Map();
const spatial = pointIndex(positions, { x: p => p.x, y: p => p.y });
type SpatialKeys = Assert<Equal<ReturnType<typeof spatial.within>, string[]>>;
const pointSet = new Set([{ x: 1, y: 2 }]);
const spatialSet = pointIndex(pointSet, { x: p => p.x, y: p => p.y });
type SpatialEntities = Assert<Equal<ReturnType<typeof spatialSet.within>, { x: number; y: number }[]>>;
// @ts-expect-error Map selects an entity, not an entry tuple.
pointIndex(positions, { x: ([key, p]: [string, { x: number }]) => p.x, y: () => 0 });

const hierarchy = tree(new Map([["root", { parentId: null, rank: 1 }]]), { parent: e => e.parentId });
const treeOrder = sorted(hierarchy, e => e.rank, numeric);
type TreeKeys = Assert<Equal<typeof treeOrder, string[]>>;
const chronological = timeline(new Map([["event", { at: 0, owner: 42, causes: [] as string[] }]]));
type EventKeys = Assert<Equal<ReturnType<typeof chronological.between>, string[]>>;
chronological.filter(e => e.owner === 42);
const context = { load: (_id: string) => ({ label: "test" }), times: { start: 1, end: 2 } };
const external = timeline(["id"], {
  context,
  get: (id, ctx) => ctx.load(id),
  time: (_event, _id, ctx) => ctx.times,
});
type ExternalKeys = Assert<Equal<ReturnType<typeof external.filter>, string[]>>;
external.filter((event, id, ctx) => event.label === id && ctx.times.start > 0);
// @ts-expect-error chronology has no business-specific owner method.
chronological.forOwner(42);
// @ts-expect-error invalid context property is rejected.
external.filter((_event, _id, ctx) => ctx.absent);
// @ts-expect-error a Map selector receives an entity, not an entry tuple.
timeline(new Map([["id", { at: 1 }]]), { time: ([id, e]: [string, { at: number }]) => e.at });
const q = queue([{ rank: 1 }]);
const dq = deque([{ rank: 1 }]);
const single = linkedList([{ rank: 1 }]);
const double = doublyLinkedList([{ rank: 1 }]);
sorted(q, e => e.rank, numeric);
sorted(dq, e => e.rank, numeric);
sorted(single, e => e.rank, numeric);
sorted(double, e => e.rank, numeric);
// @ts-expect-error singly-linked nodes have no previous pointer.
single.first?.previous;
// @ts-expect-error node links are readonly to callers.
if (double.first) double.first.next = undefined;
// @ts-expect-error null is reserved for root parents, not a node key.
tree(new Map([[null, { parentId: null }]]), { parent: e => e.parentId });
