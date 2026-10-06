import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {cpus} from 'node:os';
const baseline='bd9a160',scratch=resolve('.generated-type-baseline'),tsc=resolve('node_modules/typescript/bin/tsc');mkdirSync(scratch,{recursive:true});
const options={target:'ES2023',module:'NodeNext',moduleResolution:'NodeNext',strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,types:['node'],skipLibCheck:false,noEmit:true};
const original=execFileSync('git',['show',`${baseline}:src/sorted.ts`],{encoding:'utf8'});
const oldDeclaration=original.slice(0,original.indexOf('/**\n * Native stable sorting')).replace(/import \{ isMapLike \}[^\n]+\n/,'').replace(/import type \{ Compare \}[^\n]+\n/,'type Compare<T>=(a:T,b:T)=>number;\n').replaceAll('export function sorted','export declare function sorted');
writeFileSync(resolve(scratch,'before.d.ts'),oldDeclaration);
const definitions={
 publicCollect:{imports:"import {from,collect} from '../../../dist/src/index.js';",header:'declare const values:readonly {id:string;active:boolean;amount:number}[];',call:'collect(from(values),{where:e=>e.active,select:e=>({id:e.id,total:e.amount*2}),limit:20})'},
 prototypeCollect:{imports:"import {from} from './library/source.js';import {collect} from './library/collect.js';",header:'declare const values:readonly {id:string;active:boolean;amount:number}[];',call:'collect(from(values),{where:e=>e.active,select:e=>({id:e.id,total:e.amount*2}),limit:20})'},
 nativeCollect:{imports:'export {};',header:'declare const values:readonly {id:string;active:boolean;amount:number}[];',call:'values.filter(e=>e.active).map(e=>({id:e.id,total:e.amount*2})).slice(0,20)'},
 beforeArray:{imports:"import {sorted} from './before.js';",header:'declare const values:readonly {amount:number}[];',call:'sorted(values,e=>e.amount,(a,b)=>a-b)'},
 publicArray:{imports:"import {sorted} from '../../../dist/src/index.js';",header:'declare const values:readonly {amount:number}[];',call:'sorted(values,e=>e.amount,(a,b)=>a-b)'},
 nativeArray:{imports:'export {};',header:'declare const values:readonly {amount:number}[];',call:'values.map(e=>({ref:e,value:e.amount})).sort((a,b)=>a.value-b.value).map(e=>e.ref)'},
 beforeMap:{imports:"import {sorted} from './before.js';",header:'declare const values:ReadonlyMap<string,{amount:number}>;',call:'sorted(values,e=>e.amount,(a,b)=>a-b)'},
 publicMap:{imports:"import {sorted} from '../../../dist/src/index.js';",header:'declare const values:ReadonlyMap<string,{amount:number}>;',call:'sorted(values,e=>e.amount,(a,b)=>a-b)'},
 publicSource:{imports:"import {sorted,from} from '../../../dist/src/index.js';",header:'declare const store:ReadonlyMap<string,{amount:number}>;const values=from(store);',call:'sorted(values,e=>e.amount,(a,b)=>a-b)'},
};
const rows=[];
try{
 const libraryConfig=resolve(scratch,'library.json');writeFileSync(libraryConfig,JSON.stringify({compilerOptions:{...options,noEmit:false,allowImportingTsExtensions:true,rewriteRelativeImportExtensions:true,declaration:true,emitDeclarationOnly:true,rootDir:'..',outDir:'./library'},files:['../source.ts','../collect.ts']}));
 execFileSync('node',[tsc,'-p',libraryConfig],{encoding:'utf8'});
 const previous=process.argv.includes('--collect-only')?JSON.parse(readFileSync('results/migration-type-baseline.json','utf8')):undefined;
 if(previous)rows.push(...previous.rows.filter(x=>!x.variant.endsWith('Collect')));
 for(const [variant,v]of Object.entries(definitions).filter(([name])=>!previous||name.endsWith('Collect')))for(const modules of variant.endsWith('Array')?[1,50]:[50]){
  const files=[];
  for(let part=0;part<modules;part++){
   const file=resolve(scratch,`${variant}-${modules}-${part}.ts`);files.push(file);
   writeFileSync(file,`${v.imports}\n${v.header}\n`+Array.from({length:5000/modules},(_,i)=>`export const result${i}=${v.call};`).join('\n'));
  }
  const config=resolve(scratch,`${variant}-${modules}.json`);writeFileSync(config,JSON.stringify({compilerOptions:options,files}));
  const samples=[];for(let i=0;i<3;i++){
   const start=performance.now(),raw=execFileSync('node',[tsc,'-p',config,'--extendedDiagnostics'],{encoding:'utf8'});samples.push({wallMs:performance.now()-start,raw});
  }
  rows.push({variant,calls:5000,modules,callsPerModule:5000/modules,samples});console.log(variant,modules,samples.map(x=>Math.round(x.wallMs)));
 }
 writeFileSync('results/migration-type-baseline.json',JSON.stringify({checkedAt:new Date().toISOString(),baseline,baselineSourceHash:createHash('sha256').update(original).digest('hex'),publicDeclarationHash:createHash('sha256').update(readFileSync('../../dist/src/sorted.d.ts')).digest('hex'),cpu:cpus()[0]?.model,node:process.version,typescript:JSON.parse(readFileSync('node_modules/typescript/package.json','utf8')).version,options,definitions,oldDeclaration,rows,notes:['Before declaration is mechanically extracted from actual baseline source overloads; runtime is not executed.','Three fresh sequential compilers. Same 5000 independent unannotated calls, in one module or 50 modules.','Map and bound Source compare relevant application forms, not only plain-array sorting. Module split is a hypothesis; not an instruction to restructure applications.']},null,2)+'\n');
}finally{rmSync(scratch,{recursive:true,force:true});}
