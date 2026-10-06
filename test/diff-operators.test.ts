import test from "node:test";
import assert from "node:assert/strict";
import {indexBy,diffBy} from "../src/diff/index.js";

test("reconciliation retains identity, stable key order, content comparison and undefined",()=>{
  const a=Object.freeze({id:"a",revision:1}),b=Object.freeze({id:"b",revision:1});
  const before=indexBy([a,b],e=>e.id),after=indexBy([Object.freeze({id:"b",revision:2}),Object.freeze({id:"c",revision:1})],e=>e.id);
  assert.equal(before.get("a"),a);
  assert.deepEqual(diffBy(before,after,(a,b)=>a.revision===b.revision),{added:["c"],removed:["a"],changed:["b"]});
  assert.deepEqual(diffBy(new Map([[1,undefined]]),new Map([[1,undefined],[2,undefined]]),(a,b)=>a===b),{added:[2],removed:[],changed:[]});
  assert.throws(()=>indexBy([a,a],e=>e.id),/Duplicate/);
  const keyed=indexBy([a,b],(e,ctx)=>ctx.prefix+e.id,{context:{prefix:"!"}});assert.deepEqual([...keyed.keys()],["!a","!b"]);
  assert.deepEqual(diffBy(before,after,(a,b,_,ctx)=>Math.abs(a.revision-b.revision)<=ctx.tolerance,{context:{tolerance:1}}),{added:["c"],removed:["a"],changed:[]});
});

test("indexBy closes iterator on duplicate or getter failure",()=>{
  let closed=false;function* values(){try{yield 1;yield 1;}finally{closed=true;}}
  assert.throws(()=>indexBy(values(),e=>e),/Duplicate/);assert.equal(closed,true);
  closed=false;assert.throws(()=>indexBy(values(),()=>{throw new Error("key");}),/key/);assert.equal(closed,true);
});
