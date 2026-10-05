/** Migration gate: public core versus the fixed pre-migration baseline/prototype. */
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import * as R from 'remeda';
import {from,collect,sorted} from '../../dist/src/index.js';
import {from as prototypeFrom} from './source.ts';
import {collect as prototypeCollect} from './collect.ts';
import {sorted as prototypeSorted} from './sorted-source.ts';
import {measure,save,random} from './measure.ts';

const baselineCommit='bd9a1606a427191151d5ff022550c1a9ee422634';
const root=resolve('../..'),scratch=mkdtempSync(resolve('.generated-core-'));
type Row={enabled:boolean;rank:number};
try{
  mkdirSync(resolve(scratch,'internal'));
  for(const file of ['sorted.ts','internal/collection.ts'])writeFileSync(resolve(scratch,file),execFileSync('git',['show',`${baselineCommit}:src/${file}`],{cwd:root,encoding:'utf8'}));
  // compare.ts is erased: the historical file's only reference is import type.
  const output=resolve(scratch,'baseline.mjs');
  await build({entryPoints:[resolve(scratch,'sorted.ts')],outfile:output,bundle:true,platform:'node',format:'esm',target:'es2023'});
  const legacySorted:(source:ReadonlyMap<number,Row>,select:(e:Row,id:number)=>number,compare:(a:number,b:number)=>number)=>number[]=(await import(pathToFileURL(output).href)).sorted;
  const rows=[];
  for(const n of [1000,20000,100000])for(const modulus of [2,100])for(const limit of [20,n]){
    const storage=new Map(Array.from({length:n},(_,id)=>[id,{enabled:id%modulus===0,rank:id*3}] as const));
    const variants={
      nativeLoop:()=>{const result:{id:number;rank:number}[]=[];for(const id of storage.keys()){const e=storage.get(id)!;if(e.enabled){result.push({id,rank:e.rank});if(result.length===limit)break;}}return result;},
      publicCollect:()=>collect(from(storage),{where:e=>e.enabled,select:(e,id)=>({id,rank:e.rank}),limit}),
      prototypeCollect:()=>prototypeCollect(prototypeFrom(storage),{where:e=>e.enabled,select:(e,id)=>({id,rank:e.rank}),limit}),
      remedaFreshKeys:()=>R.pipe([...storage.keys()],R.filter(id=>storage.get(id)!.enabled),R.map(id=>({id,rank:storage.get(id)!.rank})),R.take(limit)),
    };
    const expected=variants.nativeLoop();for(const run of Object.values(variants))assert.deepEqual(run(),expected);
    rows.push({kind:'Map filter/projection/limit including binding or fresh-key materialization',baselineCommit,n,modulus,limit,resultLength:expected.length,timings:measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>run().length])))});
  }
  for(const n of [1000,20000,100000]){
    const rand=random(789),storage=new Map(Array.from({length:n},(_,id)=>[id,{enabled:true,rank:Math.floor(rand()*1000)}] as const));
    const numeric=(a:number,b:number)=>a-b;
    const variants={
      baselineMap:()=>legacySorted(storage,e=>e.rank,numeric),
      publicMap:()=>sorted(storage,e=>e.rank,numeric),
      publicSource:()=>sorted(from(storage),e=>e.rank,numeric),
      prototypeSource:()=>prototypeSorted(prototypeFrom(storage),e=>e.rank,numeric),
      nativeCachedDecoration:()=>{const entries:{id:number;rank:number}[]=[];storage.forEach((e,id)=>entries.push({id,rank:e.rank}));return entries.sort((a,b)=>a.rank-b.rank).map(e=>e.id);},
    };
    const expected=variants.baselineMap();for(const run of Object.values(variants))assert.deepEqual(run(),expected);
    rows.push({kind:'stable full Map sorting including materialization, resolution and output',baselineCommit,n,timings:measure(Object.fromEntries(Object.entries(variants).map(([name,run])=>[name,()=>run().length])))});
  }
  save('migration-core',rows);
}finally{rmSync(scratch,{recursive:true,force:true});}
