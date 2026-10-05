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
  sorted:{code:`import {sorted} from '../../../dist/src/index.js';export const run=()=>sorted([3,1,2],x=>x,(a,b)=>a-b);`,expected:[1,2,3]},
  currentTime:{code:`import {timeline} from '../../../dist/src/index.js';export const run=()=>timeline(new Map([[1,{at:10}],[2,{at:20}]])).overlapping(0,15);`,expected:[1]},
  temporal:{code:`import {from} from '../source.ts';import {temporal,overlapping} from '../temporal.ts';export const run=()=>Array.from(overlapping(temporal(from(new Map([[1,{at:10}],[2,{at:20}]])),e=>e.at),{start:0,end:15}));`,expected:[1]},
  temporalQuery:{code:`import {from} from '../source.ts';import {temporal,overlapping} from '../temporal.ts';import {query,queryInput,selected} from '../query.ts';export const run=()=>query(queryInput(overlapping(temporal(from(new Map([[1,{at:10,title:'one'}],[2,{at:20,title:'two'}]])),e=>e.at),{start:0,end:15})),selected(e=>e.title));`,expected:['one']},
  spatial:{code:`import {pointIndex} from '../../../dist/src/index.js';export const run=()=>pointIndex([{x:1,y:1},{x:10,y:10}],{x:e=>e.x,y:e=>e.y}).within({minX:0,minY:0,maxX:2,maxY:2}).map(e=>e.x);`,expected:[1]},
  kdbush:{code:`import KDBush from 'kdbush';export const run=()=>{const index=new KDBush(2);index.add(1,1);index.add(10,10);index.finish();return index.range(0,0,2,2);};`,expected:[0]},
  density:{code:`import {isDenseArray} from '../../../dist/src/index.js';export const run=()=>[isDenseArray([1,undefined]),isDenseArray(new Array(2))];`,expected:[true,false]},
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
        const result=await rollup({input:entry,plugins:[nodeResolve({browser:true}),commonjs(),{name:'erase-types',async transform(code,id){if(id.endsWith('.ts'))return (await transform(code,{loader:'ts',target:'es2023',format:'esm'})).code;}}]});
        const output=await result.generate({format:'esm'}),chunk=output.output.find(x=>x.type==='chunk');
        const compressed=await minify(chunk.code,{module:true,ecma:2023});code=compressed.code;
        modules=Object.entries(chunk.modules).filter(([,info])=>info.renderedLength>0).map(([path,info])=>({path:normalize(path),bytes:info.renderedLength}));
        await result.close();
      }
      const output=resolve(scratch,`${name}-${bundler}.mjs`);writeFileSync(output,code);
      const module=await import(pathToFileURL(output).href);
      assert.deepEqual(await module.run(),example.expected,`${name}/${bundler}`);
      const bytes=Buffer.from(code);
      results.push({name,bundler,bytes:bytes.length,gzip:gzipSync(bytes,{level:9}).length,brotli:brotliCompressSync(bytes,{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).length,modules,smoke:'passed'});
    }
  }
  mkdirSync(resolve(here,'results'),{recursive:true});
  const manifest=JSON.parse(readFileSync(resolve(here,'package.json'),'utf8'));
  writeFileSync(resolve(here,'results/bundles.json'),JSON.stringify({date:new Date().toISOString(),target:'ES2023, browser, ESM',dependencies:manifest.devDependencies,notes:['Minifiers differ: esbuild built-in vs terser. Module bytes are bundler-specific attribution, not directly comparable.','Smoke fixtures ensure imports execute; their literal code also contributes bytes. Temporal date-fns dependency is type-only.'],results},null,2)+'\n');
  console.table(results.map(({name,bundler,bytes,gzip,brotli})=>({name,bundler,bytes,gzip,brotli})));
} finally {rmSync(scratch,{recursive:true,force:true});}
