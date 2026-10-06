import { test } from "node:test";
import assert from "node:assert/strict";
import {from,entity,collect} from "../src/index.js";
import {pointIndex,within,nearest} from "../src/spatial/index.js";

const coordinates = { x: (p: { x: number }) => p.x, y: (p: { y: number }) => p.y };

test("Map selectors receive entities and keys, coordinates are cached, keys retain identity", () => {
  const key = Object.freeze({ id: 1 });
  const entity = Object.freeze({ x: 2, y: 3 });
  const map = new Map([[key, entity]]);
  let calls = 0;
  const index = pointIndex(from(map), {
    x: (p, id) => { assert.equal(id, key); calls++; return p.x; },
    y: p => { calls++; return p.y; },
  });
  assert.equal(index.size, 1);
  assert.deepEqual(collect(within(index,{ minX: 2, minY: 3, maxX: 2, maxY: 3 })), [key]);
  assert.deepEqual(nearest(index,2, 3, 0), { reference: key, distance: 0 });
  assert.equal(calls, 2);
  assert.equal(map.get(key), entity);
  map.clear();
  assert.equal(nearest(index,2, 3)?.reference, key);
});

test("empty, duplicates, tie order and undefined keys", () => {
  const empty = pointIndex(from([]), coordinates);
  assert.equal(nearest(empty,0, 0), undefined);
  assert.deepEqual(collect(within(empty,{ minX: 0, minY: 0, maxX: 1, maxY: 1 })), []);
  const duplicates = Array.from({ length: 1000 }, (_, id) => ({ x: 0, y: 0, id }));
  const index = pointIndex(from(new Set(duplicates)), coordinates);
  assert.equal(collect(within(index,{ minX: 0, minY: 0, maxX: 0, maxY: 0 })).length, 1000);
  assert.equal(nearest(index,0, 0)?.reference, duplicates[0]);
  const map = pointIndex(from(new Map([[undefined, { x: 1, y: 0 }]])), coordinates);
  assert.deepEqual(nearest(map,0, 0, 1), { reference: undefined, distance: 1 });
  assert.equal(nearest(map,0, 0, 0.9), undefined);
});

test("single-use iterable and static coordinate snapshot", () => {
  const point = { x: 1, y: 2 };
  let consumed = false;
  function* source() { yield point; consumed = true; }
  const index = pointIndex(from(source()), {
    x: p => { assert.ok(consumed); return p.x; }, y: p => p.y,
  });
  point.x = 999;
  assert.deepEqual(nearest(index,1, 2), { reference: point, distance: 0 });
});

test("differential range and nearest queries, clustered data and split boundaries", () => {
  let seed = 321;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (const shape of ["random", "clustered", "line"] as const) {
    const points = Array.from({ length: 2000 }, (_, id) => ({ id,
      x: shape === "line" ? 0 : Math.floor(random() * (shape === "clustered" ? 4 : 100)),
      y: Math.floor(random() * 100),
    }));
    const index = pointIndex(from(points), coordinates);
    for (let q = 0; q < 100; q++) {
      const x = random() * 110 - 5, y = random() * 110 - 5;
      const box = { minX: x, minY: y, maxX: x + 10, maxY: y + 10 };
      const expected = points.filter(p => p.x >= box.minX && p.x <= box.maxX && p.y >= box.minY && p.y <= box.maxY);
      assert.deepEqual(collect(within(index,box)).map(p => p.id).sort((a, b) => a - b), expected.map(p => p.id));
      const radius = q % 2 ? Infinity : 5;
      let best = radius, found: typeof points[number] | undefined;
      for (const p of points) {
        const distance = Math.hypot(p.x - x, p.y - y);
        if (distance <= best && (!found || distance < best)) { found = p; best = distance; }
      }
      assert.deepEqual(nearest(index,x, y, radius), found ? { reference: found, distance: best } : undefined);
    }
  }
});

test("finite coordinates, ordered bounds, valid radius, very large and tiny coordinates", () => {
  assert.throws(() => pointIndex(from([{ x: NaN, y: 0 }]), coordinates), RangeError);
  const index = pointIndex(from([{ x: 1e200, y: 1e200 }]), coordinates);
  assert.equal(nearest(index,0, 0)?.distance, Math.hypot(1e200, 1e200));
  assert.throws(() => nearest(index,Infinity, 0), RangeError);
  assert.throws(() => nearest(index,0, 0, -1), RangeError);
  assert.throws(() => nearest(index,0, 0, NaN), RangeError);
  assert.throws(() => collect(within(index,{ minX: 2, minY: 0, maxX: 1, maxY: 1 })), RangeError);
  const tiny = Array.from({ length: 100 }, (_, x) => ({ x: x * Number.MIN_VALUE, y: 0 }));
  assert.equal(nearest(pointIndex(from(tiny), coordinates),0,0)?.reference, tiny[0]);
});

test("external coordinates snapshot while entities stay live; lazy bounds snapshot and context",()=>{
  const store=new Map([["a",{title:"old",enabled:true}],["b",{title:"B",enabled:false}]]),coordinates=new Map([["a",{x:1,y:1}],["b",{x:10,y:10}]]);
  const context={store,coordinates};let calls=0;
  const source=from(store.keys(),{context,get:(id,ctx)=>{const e=ctx.store.get(id);if(!e)throw new RangeError("Missing entity");return e;}});
  const index=pointIndex(source,{x:(_,id,ctx)=>{calls++;return ctx.coordinates.get(id)?.x??0;},y:(_,id,ctx)=>{calls++;return ctx.coordinates.get(id)?.y??0;}});
  const bounds={minX:0,minY:0,maxX:2,maxY:2},selection=within(index,bounds);bounds.maxX=20;bounds.maxY=20;
  coordinates.set("a",{x:99,y:99});store.set("a",{title:"new",enabled:true});
  assert.deepEqual(collect(selection),["a"]);assert.deepEqual(collect(selection),["a"]);assert.equal(calls,4);
  assert.deepEqual(collect(selection,{context:{prefix:"!"},where:e=>e.enabled,select:(e,id,ctx)=>({id,title:ctx.prefix+e.title})}),[{id:"a",title:"!new"}]);
  assert.equal(entity(index,"a").title,"new");assert.equal(nearest(index,1,1)?.reference,"a");
  store.delete("a");assert.deepEqual(collect(selection),["a"]);assert.throws(()=>collect(selection,{select:e=>e.title}),/Missing entity/);
  assert.equal(index.size,2);
});

test("duplicate occurrences preserve input tie order and nearest-before-filter semantics",()=>{
  const source=from(["a","a","b"],{context:undefined,get:id=>({enabled:id==="b"})});
  const index=pointIndex(source,{x:(_,id)=>id==="a"?0:1,y:()=>0});
  assert.deepEqual(collect(index),["a","a","b"]);assert.equal(collect(within(index,{minX:0,minY:0,maxX:1,maxY:0})).length,3);
  const hit=nearest(index,0,0);assert.equal(hit?.reference,"a");
  assert.deepEqual(collect(from(hit?[hit.reference]:[],{context:source,get:(id,ctx)=>entity(ctx,id)}),{where:e=>e.enabled}),[]);
});
