// Compiled by tsc, not executed. Check inference and overload rejection.
import { sortedReferences, pointIndex } from "../src/index.js";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;
const numeric = (a: number, b: number) => a - b;

const map: ReadonlyMap<string, Readonly<{ age: number }>> = new Map();
const mapResult = sortedReferences(map, (entity, key) => {
  const id: string = key;
  void id;
  return entity.age;
}, numeric);
type MapResult = Assert<Equal<typeof mapResult, string[]>>;

const set: ReadonlySet<Readonly<{ age: number }>> = new Set();
const setResult = sortedReferences(set, entity => entity.age, numeric);
type SetResult = Assert<Equal<typeof setResult, Readonly<{ age: number }>[]>>;

const arrayResult = sortedReferences([3, 1, 2] as const, x => x, numeric);
type ArrayResult = Assert<Equal<typeof arrayResult, (1 | 2 | 3)[]>>;

function* numbers() { yield 3; yield 1; yield 2; }
const iterableResult = sortedReferences(numbers(), x => x, numeric);
type IterableResult = Assert<Equal<typeof iterableResult, (1 | 2 | 3)[]>>;

// Map must not accidentally select the generic iterable/entry-tuple overload.
// @ts-expect-error Map selectors receive entities, not [key, entity] tuples.
sortedReferences(map, ([key, entity]: [string, { age: number }]) => entity.age, numeric);

// @ts-expect-error The selected numeric values need a numeric comparator.
sortedReferences(map, entity => entity.age, (a: string, b: string) => a.localeCompare(b));

void mapResult; void setResult; void arrayResult; void iterableResult;

const positions: ReadonlyMap<string, { x: number; y: number }> = new Map();
const spatial = pointIndex(positions, { x: p => p.x, y: p => p.y });
type SpatialKeys = Assert<Equal<ReturnType<typeof spatial.within>, string[]>>;
const pointSet = new Set([{ x: 1, y: 2 }]);
const spatialSet = pointIndex(pointSet, { x: p => p.x, y: p => p.y });
type SpatialEntities = Assert<Equal<ReturnType<typeof spatialSet.within>, { x: number; y: number }[]>>;
// @ts-expect-error Map selects an entity, not an entry tuple.
pointIndex(positions, { x: ([key, p]: [string, { x: number }]) => p.x, y: () => 0 });
