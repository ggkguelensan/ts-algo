import { test } from 'node:test';
import assert from 'node:assert/strict';
import { from, entity } from './source.ts';
import { temporal, overlapping, startsBetween } from './temporal.ts';
import { timeline } from '../../dist/references/legacy-timeline.js';

const intersects = (a: number, b: number, start: number, end: number) => start !== end && a < end && (a === b ? a >= start : b > start);
test('half-open intervals, points, nesting, ties and empty windows', () => {
  const times = new Map([[0,{start:0,end:10}],[1,{start:10,end:10}],[2,{start:10,end:20}],[3,{start:-100,end:100}],[4,{start:11,end:12}]]);
  const events = new Map([...times.keys()].map(id => [id,{title:`event-${id}`} ]));
  const source = from(events), next = temporal(source, (_,id)=>times.get(id)!);
  const old = timeline(events,{time:(_,id)=>times.get(id)!});
  for (const [start,end] of [[0,10],[10,11],[10,10],[-100,100],[11,12],[100,101]]) {
    const expected = [...times].filter(([,t])=>intersects(t.start,t.end,start!,end!)).map(([id])=>id).sort((a,b)=>times.get(a)!.start-times.get(b)!.start);
    assert.deepEqual([...overlapping(next,{start:start!,end:end!})],expected);
    assert.deepEqual(old.overlapping(start!,end!),expected);
  }
  assert.deepEqual([...startsBetween(next,{start:10,end:12})],[1,2,4]);
});
test('live entity reads, metadata snapshot and getter once per occurrence', () => {
  const records = new Map([[1,{at:0,title:'old'}]]);
  let calls=0;
  const index=temporal(from(records),(e)=>{calls++;return e.at;});
  records.set(1,{at:100,title:'new'});
  const selection=overlapping(index,{start:0,end:1});
  assert.equal(entity(selection,1).title,'new'); assert.equal(calls,1);
  assert.deepEqual([...selection],[1]);
  records.delete(1);
  assert.deepEqual([...selection],[1]); assert.throws(()=>entity(selection,1),/Missing entity/);
});
test('Date snapshot, invalid values, reverse, duplicate and external context', () => {
  const date = new Date(10), storage = new Map([[1,{title:'one'}]]);
  const source=from([1],{context:storage,get:(id,ctx)=>ctx.get(id)!});
  const index=temporal(source,()=>date); date.setTime(100);
  assert.deepEqual([...overlapping(index,{start:new Date(10),end:new Date(11)})],[1]);
  assert.throws(()=>temporal(from([1]),()=>new Date(NaN)),/Invalid/);
  assert.throws(()=>overlapping(index,{start:2,end:1}),/Reversed/);
  assert.throws(()=>temporal(from([1,1]),()=>0),/Duplicate/);
  assert.deepEqual([...overlapping(temporal(from([]),()=>0),{start:0,end:1})],[]);
  assert.equal(entity(from(new Map([[1,undefined]])),1),undefined);
});
test('seeded differential tests against a linear oracle', () => {
  let seed=123;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
  for(let round=0;round<30;round++) {
    const values=Array.from({length:100},(_,id)=>({id,start:Math.floor(random()*100),length:Math.floor(random()*20)}));
    const index=temporal(from(values),e=>({start:e.start,end:e.start+e.length}));
    for(let i=0;i<30;i++) {
      const start=Math.floor(random()*110),end=start+Math.floor(random()*20);
      const expected=values.filter(e=>intersects(e.start,e.start+e.length,start,end)).sort((a,b)=>a.start-b.start);
      assert.deepEqual([...overlapping(index,{start,end})],expected);
    }
  }
});
