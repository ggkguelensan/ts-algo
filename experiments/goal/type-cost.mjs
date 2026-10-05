import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {resolve} from 'node:path';
const scratch=resolve('.generated-types');mkdirSync(scratch,{recursive:true});
const tsc=resolve('node_modules/typescript/bin/tsc'),base={target:'ES2023',module:'NodeNext',moduleResolution:'NodeNext',strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,types:['node'],skipLibCheck:false,noEmit:true};
// Emit the experiment library once: consumers then import declarations rather than rechecking source.
const libraryConfig={compilerOptions:{...base,rootDir:'..',noEmit:false,allowImportingTsExtensions:true,rewriteRelativeImportExtensions:true,declaration:true,emitDeclarationOnly:true,outDir:'./library'},files:['../source.ts','../query.ts','../operators.ts','../temporal.ts','../collect.ts']};
writeFileSync(resolve(scratch,'library.json'),JSON.stringify(libraryConfig));
const begin=performance.now(),libraryOutput=execFileSync('node',[tsc,'-p',resolve(scratch,'library.json'),'--extendedDiagnostics'],{encoding:'utf8'}),libraryWall=performance.now()-begin;
const fixtures={
  native:{imports:'',call:'values.filter(e=>e.active).map(e=>({id:e.id,total:e.amount*2})).slice(0,20)'},
  remeda:{imports:"import {pipe,filter,map,take} from 'remeda';",call:'pipe(values,filter(e=>e.active),map(e=>({id:e.id,total:e.amount*2})),take(20))'},
  ix:{imports:"import {from} from 'ix/iterable';import {filter,map,take} from 'ix/iterable/operators';",call:'Array.from(from(values).pipe(filter(e=>e.active),map(e=>({id:e.id,total:e.amount*2})),take(20)))'},
  fused:{imports:"import {from} from './library/source.js';import {query,queryInput,filtered,selected,take} from './library/query.js';",call:'query(queryInput(from(values)),filtered(e=>e.active),selected(e=>({id:e.id,total:e.amount*2})),take(20))'},
  lazy:{imports:"import {from} from './library/source.js';import {queryInput,lazyFiltered,lazySelected,lazyTake} from './library/query.js';",call:'Array.from(lazyTake(lazySelected(lazyFiltered(queryInput(from(values)),e=>e.active),e=>({id:e.id,total:e.amount*2})),20))'},
  restricted:{imports:"import {from} from './library/source.js';import {collect} from './library/collect.js';",call:'collect(from(values),{where:e=>e.active,select:e=>({id:e.id,total:e.amount*2}),limit:20})'},
};
const rows=[];
try{
  for(const n of [100,1000,5000])for(const[name,fixture]of Object.entries(fixtures)){
    const source=`${fixture.imports}\ndeclare const values:readonly {id:string;active:boolean;amount:number}[];\n`+Array.from({length:n},(_,i)=>`export const result${i}:${'{id:string;total:number}[]'}=${fixture.call};`).join('\n');
    const file=resolve(scratch,`${name}-${n}.ts`),config=resolve(scratch,`${name}-${n}.json`);writeFileSync(file,source);writeFileSync(config,JSON.stringify({compilerOptions:base,files:[file]}));
    const samples=[];for(let i=0;i<3;i++){
      const start=performance.now(),output=execFileSync('node',[tsc,'-p',config,'--extendedDiagnostics'],{encoding:'utf8'}),wall=performance.now()-start;
      const field=(key)=>{const match=output.match(new RegExp(`^${key}:\\s+([^\\n]+)`,'m'));return match?.[1];};
      samples.push({wallMs:wall,memory:field('Memory used'),instantiations:field('Instantiations'),types:field('Types'),check:field('Check time'),total:field('Total time'),raw:output});
    }rows.push({variant:name,calls:n,samples});
  }
  // Real erroneous consumer examples, no @ts-expect-error suppressions in these files.
  const negative={entity:"query(queryInput(from(values)),selected(e=>e.missing));",projection:"query(queryInput(from(values)),selected(e=>e.amount),filtered(e=>e.active));",context:"query(withContext(from(values),{minimum:1}),filtered((e,id,ctx)=>ctx.userId));",reference:"query(queryInput(from(new Map<string,{amount:number}>())),selected((e,id)=>id.toFixed()));"};
  const diagnostics=[];
  for(const[name,expression]of Object.entries(negative)){
    const file=resolve(scratch,`bad-${name}.ts`),config=resolve(scratch,`bad-${name}.json`);
    writeFileSync(file,`import {from} from './library/source.js';import {query,queryInput,withContext,selected,filtered} from './library/query.js';declare const values:{active:boolean;amount:number}[];${expression}`);writeFileSync(config,JSON.stringify({compilerOptions:base,files:[file]}));
    try{execFileSync('node',[tsc,'-p',config,'--pretty','false'],{encoding:'utf8'});throw new Error(`Expected type failure: ${name}`);}catch(error){if(![1,2].includes(error.status)||!String(error.stdout).includes('error TS'))throw error;diagnostics.push({name,output:error.stdout});}
  }
  mkdirSync('results',{recursive:true});const manifest=JSON.parse(readFileSync('package.json','utf8'));
  writeFileSync('results/type-cost.json',JSON.stringify({date:new Date().toISOString(),typescript:manifest.devDependencies.typescript,node:process.version,config:base,library:{wallMs:libraryWall,raw:libraryOutput},notes:['Consumer declarations are emitted once before measurements. Third-party libraries carry their own declarations.','Three fresh compiler processes per case. skipLibCheck=false intentionally includes declaration checking; no editor-latency claim.','Fixtures repeat a representative query with independent call sites; this is not a deep heterogeneous-chain test.'],rows,diagnostics},null,2)+'\n');console.log('Saved results/type-cost.json');
}finally{rmSync(scratch,{recursive:true,force:true});}
