import assert from 'node:assert/strict';
import {build,transform} from 'esbuild';
import {rollup} from 'rollup';
import {minify} from 'terser';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import {gzipSync,brotliCompressSync,constants} from 'node:zlib';
const scratch=mkdtempSync(resolve('.generated-core-bundles-')),rows=[];
const cases={
  sorted:{code:`import {sorted} from '../../../dist/src/index.js';export const run=()=>sorted([3,1,2],x=>x,(a,b)=>a-b);`,expected:[1,2,3]},
  collect:{code:`import {from,collect} from '../../../dist/src/index.js';export const run=()=>collect(from([1,2,3,4]),{where:x=>x%2===0,select:x=>x*3,limit:2});`,expected:[6,12]},
  boundSort:{code:`import {from,sorted} from '../../../dist/src/index.js';export const run=()=>sorted(from(new Map([['b',{rank:2}],['a',{rank:1}]])),e=>e.rank,(a,b)=>a-b);`,expected:['a','b']},
  boundPage:{code:`import {from,subset,collect,sorted} from '../../../dist/src/index.js';export const run=()=>{const source=from(new Map([['b',{rank:2}],['a',{rank:1}]]));return collect(subset(source,sorted(source,e=>e.rank,(a,b)=>a-b)),{select:(e,id)=>({id,rank:e.rank}),limit:1});};`,expected:[{id:'a',rank:1}]},
};
try{
  for(const [name,fixture] of Object.entries(cases)){
    const input=resolve(scratch,`${name}.ts`);writeFileSync(input,fixture.code);
    for(const bundler of ['esbuild','rollup']){
      let code,modules;
      if(bundler==='esbuild'){
        const result=await build({entryPoints:[input],bundle:true,minify:true,format:'esm',platform:'browser',target:'es2023',write:false,metafile:true});code=result.outputFiles[0].text;
        modules=Object.entries(Object.values(result.metafile.outputs)[0].inputs).filter(([,info])=>info.bytesInOutput>0).map(([path,info])=>({path,bytes:info.bytesInOutput}));
      }else{
        const bundle=await rollup({input,plugins:[{name:'erase-types',async transform(code,id){if(id.endsWith('.ts'))return (await transform(code,{loader:'ts',target:'es2023',format:'esm'})).code;}}]});
        const chunk=(await bundle.generate({format:'esm'})).output.find(x=>x.type==='chunk');code=(await minify(chunk.code,{module:true,ecma:2023})).code;
        modules=Object.entries(chunk.modules).filter(([,info])=>info.renderedLength>0).map(([path,info])=>({path:relative(process.cwd(),path),bytes:info.renderedLength}));await bundle.close();
      }
      const output=resolve(scratch,`${name}-${bundler}.mjs`);writeFileSync(output,code);
      assert.deepEqual(await (await import(pathToFileURL(output).href)).run(),fixture.expected);
      const paths=modules.map(m=>m.path).join('\n');assert(!/\/src\/(tree|timeline|point-index|queue|deque|linked-list|doubly-linked-list)|node_modules\/(zod|date-fns)|\/src\/zod\//.test(paths),'Core consumer leaked domain/optional runtime');
      rows.push({name,bundler,bytes:Buffer.byteLength(code),gzip:gzipSync(code,{level:9}).length,brotli:brotliCompressSync(Buffer.from(code),{params:{[constants.BROTLI_PARAM_QUALITY]:11}}).length,modules,smoke:'passed'});
    }
  }
  const dependencies=JSON.parse(readFileSync('package.json','utf8')).devDependencies;
  writeFileSync('results/migration-core-bundles.json',JSON.stringify({date:new Date().toISOString(),target:'ES2023/browser/ESM',dependencies,notes:'Intermediate public core source consumer. Final Goal additionally requires installed archive consumers for all domain entries. Module attribution differs between bundlers.',results:rows},null,2)+'\n');console.table(rows.map(({name,bundler,bytes,gzip,brotli})=>({name,bundler,bytes,gzip,brotli})));
}finally{rmSync(scratch,{recursive:true,force:true});}
