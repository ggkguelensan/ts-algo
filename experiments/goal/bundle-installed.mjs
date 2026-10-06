import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {rollup} from 'rollup';
import {nodeResolve} from '@rollup/plugin-node-resolve';
import {minify} from 'terser';
import {writeFileSync,readFileSync,mkdirSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,brotliCompressSync,constants} from 'node:zlib';

/** Bare imports resolve only through the independently installed archive's exports. */
export async function bundleInstalled(consumer){
  const directory=resolve(consumer,'apps');mkdirSync(directory);
  const fixtures={
    sorted:{code:`import {sorted} from 'ts-algo';export const run=()=>sorted([3,1,2],e=>e,(a,b)=>a-b);`,expected:[1,2,3]},
    collect:{code:`import {from,collect} from 'ts-algo';export const run=()=>collect(from([1,2,3,4]),{where:e=>e%2===0,select:e=>e*3,limit:2});`,expected:[6,12]},
    startsOnly:{code:`import {from,collect} from 'ts-algo';import {timeline,startsBetween} from 'ts-algo/time';export const run=()=>collect(startsBetween(timeline(from([1,2,3]),e=>e),{start:1,end:3}));`,expected:[1,2]},
    overlapOnly:{code:`import {from,collect} from 'ts-algo';import {timeline,overlapping} from 'ts-algo/time';export const run=()=>collect(overlapping(timeline(from([1,2,3]),e=>({start:e,end:e+3})),{start:2,end:3}));`,expected:[1,2]},
    freeOnly:{code:`import {freeSlots} from 'ts-algo/ranges';export const run=()=>freeSlots([{start:1,end:3}],{start:0,end:5});`,expected:[{start:0,end:1},{start:3,end:5}]},
    schedule:{code:`import {from,collect} from 'ts-algo';import {timeline,overlapping} from 'ts-algo/time';import {freeSlots,overloaded} from 'ts-algo/ranges';export const run=()=>{const store=new Map([[1,{units:2}],[2,{units:2}]]),times=new Map([[1,{start:0,end:10}],[2,{start:5,end:15}]]),index=timeline(from(store),(_,id)=>times.get(id)),window={start:0,end:20},items=collect(overlapping(index,window),{select:(e,id)=>({...times.get(id),units:e.units})});return {free:freeSlots(items,window),overloaded:overloaded(items,window,3)};};`,expected:{free:[{start:15,end:20}],overloaded:[{start:5,end:10}]}},
    treeChildren:{code:`import {from} from 'ts-algo';import {tree,children} from 'ts-algo/tree';export const run=()=>children(tree(from(['root','a','b']),(_,id)=>id==='root'?null:'root'),'root');`,expected:['a','b']},
    treeSubtree:{code:`import {from,collect} from 'ts-algo';import {tree,subtree} from 'ts-algo/tree';export const run=()=>collect(subtree(tree(from(['root','a','b']),(_,id)=>id==='root'?null:'root'),'root'),{limit:2});`,expected:['root','a']},
    graphCauses:{code:`import {from} from 'ts-algo';import {dependencies,causesOf} from 'ts-algo/dependencies';export const run=()=>causesOf(dependencies(from(['a','b']),(_,id)=>id==='b'?['a']:[]),'b');`,expected:['a']},
    graphDescendants:{code:`import {from,collect} from 'ts-algo';import {dependencies,descendants} from 'ts-algo/dependencies';export const run=()=>collect(descendants(dependencies(from(['a','b','c']),(_,id)=>id==='a'?[]:['a']),'a'));`,expected:['b','c']},
    graphOrder:{code:`import {from,collect} from 'ts-algo';import {dependencies,causalOrder} from 'ts-algo/dependencies';export const run=()=>collect(causalOrder(dependencies(from(['b','a']),(_,id)=>id==='b'?['a']:[])));`,expected:['a','b']},
  };
  const rows=[];
  for(const [name,fixture] of Object.entries(fixtures)){
    const input=resolve(directory,`${name}.mjs`);writeFileSync(input,fixture.code);
    for(const bundler of ['esbuild','rollup']){
      let code,modules;
      if(bundler==='esbuild'){
        const result=await build({entryPoints:[input],bundle:true,minify:true,format:'esm',platform:'browser',target:'es2023',write:false,metafile:true});code=result.outputFiles[0].text;
        modules=Object.entries(Object.values(result.metafile.outputs)[0].inputs).filter(([,info])=>info.bytesInOutput>0).map(([path,info])=>({path:relative(consumer,resolve(path)),bytes:info.bytesInOutput}));
      }else{
        const bundle=await rollup({input,plugins:[nodeResolve({browser:true,preferBuiltins:false})]});
        const chunk=(await bundle.generate({format:'esm'})).output.find(x=>x.type==='chunk');code=(await minify(chunk.code,{module:true,ecma:2023})).code;
        modules=Object.entries(chunk.modules).filter(([,info])=>info.renderedLength>0).map(([path,info])=>({path:relative(consumer,path),bytes:info.renderedLength,removedExports:info.removedExports}));await bundle.close();
      }
      const output=resolve(directory,`${name}-${bundler}.mjs`);writeFileSync(output,code);
      assert.deepEqual(await (await import(pathToFileURL(output).href)).run(),fixture.expected,`${name}/${bundler}`);
      const paths=modules.map(m=>m.path).join('\n');
      assert(!/node_modules\/(zod|date-fns)|legacy|src\/(timeline\.js|point-index|queue|deque|linked-list|doubly-linked-list)/.test(paths),'Unneeded domain/dependency leaked');
      if(!name.startsWith('tree'))assert(!/src\/tree\//.test(paths),'Unneeded hierarchy leaked');
      if(!name.startsWith('graph'))assert(!/src\/dependencies\//.test(paths),'Unneeded graph leaked');
      if(['sorted','collect'].includes(name))assert(!/src\/(time|ranges)\//.test(paths),'Core leaked time/ranges');
      if(name==='startsOnly')assert(!/overlapping\.js/.test(paths),'Starts retained overlap algorithm');
      if(name==='overlapOnly')assert(!/starts-between\.js/.test(paths),'Overlap retained start-range algorithm');
      if(name==='freeOnly')assert(!/conflicts\.js|overloaded\.js/.test(paths),'Free-slots retained other range algorithms');
      if(name==='treeChildren')assert(!/sort-children\.js|siblings\.js|subtree\.js|ancestors\.js/.test(paths),'Children retained independent hierarchy operations');
      if(name==='graphCauses')assert(!/reachable\.js|descendants\.js|ancestors\.js|causal-order\.js/.test(paths),'Direct causes retained graph query operations');
      rows.push({name,bundler,bytes:Buffer.byteLength(code),gzip:gzipSync(code,{level:9}).length,brotli:brotliCompressSync(Buffer.from(code),{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).length,modules,smoke:'passed'});
    }
  }
  const dependencies=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')).devDependencies;
  writeFileSync(new URL('./results/migration-installed-bundles.json',import.meta.url),JSON.stringify({date:new Date().toISOString(),target:'ES2023/browser/ESM',dependencies,notes:'Bare public imports from independent installed tarball consumer; minifiers/module attribution differ; fixture code contributes bytes. All outputs execute expected results and assert module exclusion.',results:rows},null,2)+'\n');
  return rows;
}
