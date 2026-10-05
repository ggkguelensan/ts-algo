import { build, transform } from 'esbuild';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { minify } from 'terser';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { gzipSync, brotliCompressSync, constants } from 'node:zlib';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve, dirname, relative } from 'node:path';
import assert from 'node:assert/strict';

const here=dirname(fileURLToPath(import.meta.url)),scratch=resolve(here,'.generated-bundles');
mkdirSync(scratch,{recursive:true});
const cases={
  native:{code:`export const run=()=>[1,2,3,4].filter(x=>x%2===0).map(x=>x*3).slice(0,2);`,expected:[6,12]},
  remeda:{code:`import {pipe,filter,map,take} from 'remeda';export const run=()=>pipe([1,2,3,4],filter(x=>x%2===0),map(x=>x*3),take(2));`,expected:[6,12]},
  ix:{code:`import {from} from 'ix/iterable';import {filter,map,take} from 'ix/iterable/operators';export const run=()=>Array.from(from([1,2,3,4]).pipe(filter(x=>x%2===0),map(x=>x*3),take(2)));`,expected:[6,12]},
  fused:{code:`import {from} from '../source.ts';import {query,queryInput,filtered,selected,take} from '../query.ts';export const run=()=>query(queryInput(from([1,2,3,4])),filtered(x=>x%2===0),selected(x=>x*3),take(2));`,expected:[6,12]},
  restricted:{code:`import {from} from '../source.ts';import {collect} from '../collect.ts';export const run=()=>collect(from([1,2,3,4]),{where:x=>x%2===0,select:x=>x*3,limit:2});`,expected:[6,12]},
  sorted:{code:`import {sorted} from '../../../dist/src/index.js';export const run=()=>sorted([3,1,2],x=>x,(a,b)=>a-b);`,expected:[1,2,3]},
  sortedBound:{code:`import {from} from '../source.ts';import {sorted} from '../sorted-source.ts';export const run=()=>sorted(from(new Map([[1,{n:2}],[2,{n:1}]])),e=>e.n,(a,b)=>a-b);`,expected:[2,1]},
  currentTime:{code:`import {timeline} from '../../../dist/src/index.js';export const run=()=>timeline(new Map([[1,{at:10}],[2,{at:20}]])).overlapping(0,15);`,expected:[1]},
  temporal:{code:`import {from} from '../source.ts';import {temporal,overlapping} from '../temporal.ts';export const run=()=>Array.from(overlapping(temporal(from(new Map([[1,{at:10}],[2,{at:20}]])),e=>e.at),{start:0,end:15}));`,expected:[1]},
  temporalQuery:{code:`import {from} from '../source.ts';import {temporal,overlapping} from '../temporal.ts';import {query,queryInput,selected} from '../query.ts';export const run=()=>query(queryInput(overlapping(temporal(from(new Map([[1,{at:10,title:'one'}],[2,{at:20,title:'two'}]])),e=>e.at),{start:0,end:15})),selected(e=>e.title));`,expected:['one']},
  temporalCollect:{code:`import {from} from '../source.ts';import {temporal,overlapping} from '../temporal.ts';import {collect} from '../collect.ts';export const run=()=>collect(overlapping(temporal(from(new Map([[1,{at:10,title:'one'}],[2,{at:20,title:'two'}]])),e=>e.at),{start:0,end:15}),{select:e=>e.title});`,expected:['one']},
  spatial:{code:`import {pointIndex} from '../../../dist/src/index.js';export const run=()=>pointIndex([{x:1,y:1},{x:10,y:10}],{x:e=>e.x,y:e=>e.y}).within({minX:0,minY:0,maxX:2,maxY:2}).map(e=>e.x);`,expected:[1]},
  kdbush:{code:`import KDBush from 'kdbush';export const run=()=>{const index=new KDBush(2);index.add(1,1);index.add(10,10);index.finish();return index.range(0,0,2,2);};`,expected:[0]},
  spatialCollect:{code:`import {pointIndex} from '../../../dist/src/index.js';import {from} from '../source.ts';import {collect} from '../collect.ts';export const run=()=>{const store=new Map([[1,{title:'one',enabled:true}],[2,{title:'two',enabled:false}]]),coords=new Map([[1,{x:1,y:1}],[2,{x:10,y:10}]]),index=pointIndex(store,{x:(_,id)=>coords.get(id).x,y:(_,id)=>coords.get(id).y}),refs=index.within({minX:0,minY:0,maxX:2,maxY:2});return collect(from(refs,{context:store,get:(id,ctx)=>ctx.get(id)}),{where:e=>e.enabled,select:(e,id)=>({id,title:e.title})});};`,expected:[{id:1,title:'one'}]},
  density:{code:`import {isDenseArray} from '../../../dist/src/index.js';export const run=()=>[isDenseArray([1,undefined]),isDenseArray(new Array(2))];`,expected:[true,false]},
  zodDensity:{code:`import {denseArray} from '../../../dist/src/zod/index.js';import * as z from '../../../node_modules/zod/mini/index.js';export const run=()=>{const schema=denseArray(z.optional(z.number()));return [schema.safeParse([1,undefined]).success,schema.safeParse(new Array(2)).success];};`,expected:[true,false]},
  brandTypeOnly:{code:`import type {Brand} from '../../../dist/src/index.js';type Id=Brand<string,'Id'>;export const run=()=>typeof 'reference';`,expected:'string'},
  startsOnly:{code:`import {from} from '../source.ts';import {temporal,startsBetween} from '../temporal.ts';export const run=()=>Array.from(startsBetween(temporal(from([1,2,3]),e=>e),{start:1,end:3}));`,expected:[1,2]},
  schedule:{code:`import {from,entity} from '../source.ts';import {temporal,overlapping} from '../temporal.ts';import {freeSlots,overloaded} from '../ranges.ts';export const run=()=>{const store=new Map([[1,{units:2}],[2,{units:2}]]),times=new Map([[1,{start:0,end:10}],[2,{start:5,end:15}]]),index=temporal(from(store),(_,id)=>times.get(id)),window={start:0,end:20},selection=overlapping(index,window),reservations=Array.from(selection,id=>({...times.get(id),units:entity(selection,id).units}));return {free:freeSlots(reservations,window),overloaded:overloaded(reservations,window,3)};};`,expected:{free:[{start:15,end:20}],overloaded:[{start:5,end:10}]}},
  rangesOnly:{code:`import {freeSlots,overloaded} from '../ranges.ts';export const run=()=>{const reservations=[{start:0,end:10,units:2},{start:5,end:15,units:2}],window={start:0,end:20};return {free:freeSlots(reservations,window),overloaded:overloaded(reservations,window,3)};};`,expected:{free:[{start:15,end:20}],overloaded:[{start:5,end:10}]}},
  nativeReport:{code:`export const run=()=>{const customers=new Map([[1,{region:2,enabled:true}]]),orders=[{customer:1,amount:3,paid:true},{customer:2,amount:10,paid:true}],totals=new Map();for(const order of orders){const c=customers.get(order.customer);if(order.paid&&c?.enabled)totals.set(c.region,(totals.get(c.region)??0)+order.amount);}return [...totals].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,2).map(([region,total])=>({region,total}));};`,expected:[{region:2,total:3}]},
  helperReport:{code:`import {from} from '../source.ts';import {queryInput} from '../query.ts';import {leftJoin,aggregateBy} from '../operators.ts';export const run=()=>{const customers=new Map([[1,{region:2,enabled:true}]]),orders=[{customer:1,amount:3,paid:true},{customer:2,amount:10,paid:true}],joined=leftJoin(queryInput(from(orders)),customers,e=>e.customer,(order,c)=>({order,customer:c.found?c.value:undefined})),rows=joined.filter(row=>row.order.paid&&row.customer?.enabled),totals=aggregateBy(queryInput(from(rows)),row=>row.customer.region,()=>0,(sum,row)=>sum+row.order.amount);return [...totals].sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,2).map(([region,total])=>({region,total}));};`,expected:[{region:2,total:3}]},
  remedaReport:{code:`import {pipe,filter,map,groupBy,sumBy} from 'remeda';export const run=()=>{const customers=new Map([[1,{region:2,enabled:true}]]),orders=[{customer:1,amount:3,paid:true},{customer:2,amount:10,paid:true}],rows=pipe(orders,filter(e=>e.paid),map(order=>({order,customer:customers.get(order.customer)})),filter(row=>row.customer?.enabled===true)),groups=groupBy(rows,row=>String(row.customer.region));return Object.entries(groups).map(([region,rows])=>({region:Number(region),total:sumBy(rows,row=>row.order.amount)})).sort((a,b)=>b.total-a.total||a.region-b.region).slice(0,2);};`,expected:[{region:2,total:3}]},
  tanstackReport:{code:`import {liveReport} from '../tanstack.ts';export const run=async()=>{const live=await liveReport([{id:1,customer:1,amount:3,paid:true},{id:2,customer:2,amount:10,paid:true}],[{id:1,region:2,enabled:true}]);try{return live.read();}finally{await live.cleanup();}};`,expected:[{region:2,total:3}]},
  graphOnly:{code:`import {from} from '../source.ts';import {dependencies,descendants} from '../dependencies.ts';export const run=()=>descendants(dependencies(from(['a','b','c']),(_,id)=>id==='a'?[]:['a']),'a');`,expected:['b','c']},
  graphology:{code:`import {DirectedGraph} from 'graphology';import {topologicalSort} from 'graphology-dag';export const run=()=>{const g=new DirectedGraph();g.addNode('a');g.addNode('b');g.addDirectedEdge('a','b');return topologicalSort(g);};`,expected:['a','b']},
  hierarchy:{code:`import {from} from '../source.ts';import {hierarchy,subtree} from '../hierarchy.ts';export const run=()=>Array.from(subtree(hierarchy(from(new Map([[1,{title:'root'}],[2,{title:'child'}]])),(_,id)=>id===1?null:1),1));`,expected:[1,2]},
  diff:{code:`import {diffBy} from '../diff.ts';export const run=()=>diffBy(new Map([[1,1],[2,2]]),new Map([[2,3],[3,3]]),(a,b)=>a===b);`,expected:{added:[3],removed:[1],changed:[2]}},
};
const results=[];
const normalize=p=>relative(here,p).replaceAll('\\','/');
try {
  for(const [name,example] of Object.entries(cases)) {
    const entry=resolve(scratch,`${name}.ts`);writeFileSync(entry,example.code);
    for(const bundler of ['esbuild','rollup']) {
      let code,modules;
      if(bundler==='esbuild') {
        const result=await build({entryPoints:[entry],bundle:true,minify:true,format:'esm',platform:'browser',target:'es2023',write:false,metafile:true});
        code=result.outputFiles[0].text;
        modules=Object.entries(Object.values(result.metafile.outputs)[0].inputs).map(([path,info])=>({path:normalize(resolve(path)),bytes:info.bytesInOutput}));
      } else {
        const result=await rollup({input:entry,plugins:[nodeResolve({browser:true,preferBuiltins:false}),commonjs(),{name:'erase-types',async transform(code,id){if(id.endsWith('.ts'))return (await transform(code,{loader:'ts',target:'es2023',format:'esm'})).code;}}]});
        const output=await result.generate({format:'esm'}),chunk=output.output.find(x=>x.type==='chunk');
        const compressed=await minify(chunk.code,{module:true,ecma:2023});code=compressed.code;
        modules=Object.entries(chunk.modules).filter(([,info])=>info.renderedLength>0).map(([path,info])=>({path:normalize(path),bytes:info.renderedLength,renderedExports:info.renderedExports,removedExports:info.removedExports}));
        await result.close();
      }
      const output=resolve(scratch,`${name}-${bundler}.mjs`);writeFileSync(output,code);
      const module=await import(pathToFileURL(output).href);
      assert.deepEqual(await module.run(),example.expected,`${name}/${bundler}`);
      const bytes=Buffer.from(code);
      results.push({name,bundler,bytes:bytes.length,gzip:gzipSync(bytes,{level:9}).length,brotli:brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).length,modules,smoke:'passed'});
      const liveModules=modules.filter(m=>m.bytes>0).map(m=>m.path).join('\n');
      assert(!/^import\s.*(?:['"](?:node:)?events['"])/m.test(code),'Browser output leaked Node events import');
      if(['temporal','temporalCollect','startsOnly','schedule'].includes(name))assert(!/dependencies\.ts|graphology|src\/timeline/.test(liveModules),'Time import leaked causal algorithms');
      if(name==='sorted')assert(!/src\/(tree|timeline|point-index|queue|deque)/.test(liveModules),'Sorted import leaked structures');
      if(name==='temporal')assert(!/node_modules\/date-fns/.test(liveModules),'Type-only date-fns became runtime dependency');
      if(name!=='zodDensity')assert(!/node_modules\/zod|src\/zod/.test(liveModules),'Core import leaked optional Zod');
      if(name==='brandTypeOnly')assert(!/dist\/src/.test(liveModules),'Type-only Brand became runtime dependency');
      if(name==='startsOnly'&&bundler==='rollup')assert(modules.some(m=>m.path==='temporal.ts'&&m.removedExports.includes('overlapping')),'Starts-only consumer retained unused overlapping export');
    }
  }
  mkdirSync(resolve(here,'results'),{recursive:true});
  const manifest=JSON.parse(readFileSync(resolve(here,'package.json'),'utf8'));
  writeFileSync(resolve(here,'results/bundles.json'),JSON.stringify({date:new Date().toISOString(),target:'ES2023, browser, ESM',dependencies:manifest.devDependencies,notes:['Minifiers differ: esbuild built-in vs terser. Module bytes are bundler-specific attribution, not directly comparable.','Smoke fixtures ensure imports execute; their literal code also contributes bytes. Temporal date-fns dependency is type-only.'],results},null,2)+'\n');
  console.table(results.map(({name,bundler,bytes,gzip,brotli})=>({name,bundler,bytes,gzip,brotli})));
} finally {rmSync(scratch,{recursive:true,force:true});}
