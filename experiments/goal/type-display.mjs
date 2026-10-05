import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
const scratch=resolve('.generated-display');mkdirSync(scratch,{recursive:true});
try{
  const consumer=`import type {Brand} from '../../../dist/src/brand.js';
import {from,type Source} from '../source.ts';import {query,withContext,filtered,selected} from '../query.ts';
import {find,aggregateBy} from '../operators.ts';import {collect} from '../collect.ts';import {sorted} from '../sorted-source.ts';
type Id=Brand<string,'Id'>;type Entity={kind:'invoice';total:number}|{kind:'note';text:string};declare const store:ReadonlyMap<Id,Entity>;
const input=withContext(from(store),{minimum:10});
export const amounts=query(input,filtered((e):e is Extract<Entity,{kind:'invoice'}>=>e.kind==='invoice'),selected((e,id,ctx)=>({id,amount:e.total+ctx.minimum})));
export const found=find(input,e=>e.kind==='invoice');
export const totals=aggregateBy(input,e=>e.kind,()=>0,(sum,e)=>sum+(e.kind==='invoice'?e.total:0));
export const restricted=collect(from(store),{where:(e):e is Extract<Entity,{kind:'invoice'}>=>e.kind==='invoice',select:(e,id,ctx)=>({id,amount:e.total+ctx.minimum}),context:{minimum:10}});
function* literals():Generator<1|2>{yield 1;yield 2;}export const literalRefs=collect(from(literals()),{limit:1});
function titles<R,E,S>(source:Source<R,E,S>,select:(e:E,id:R)=>string):string[]{return collect(source,{select});}
export const genericResult=titles(from(store),(e,id)=>id+e.kind);
export const boundOrder=sorted(from(store),e=>e.kind,(a,b)=>a.localeCompare(b));
export const contextualOrder=sorted(from(store),(e,id,ctx)=>e.kind+ctx.suffix,(a,b)=>a.localeCompare(b),{context:{suffix:'!'}});
declare const set:ReadonlySet<Id>;export const setOrder=sorted(from(set),id=>id,(a,b)=>a.localeCompare(b));
`;
  writeFileSync(resolve(scratch,'consumer.ts'),consumer);
  const config={compilerOptions:{target:'ES2023',module:'NodeNext',moduleResolution:'NodeNext',strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,skipLibCheck:false,types:['node'],rootDir:'..',outDir:'declarations',allowImportingTsExtensions:true,rewriteRelativeImportExtensions:true,declaration:true,emitDeclarationOnly:true},files:['consumer.ts','../target-examples.ts']};
  writeFileSync(resolve(scratch,'tsconfig.json'),JSON.stringify(config));
  execFileSync('node',[resolve('node_modules/typescript/bin/tsc'),'-p',resolve(scratch,'tsconfig.json')],{encoding:'utf8'});
  const declarations={consumer:readFileSync(resolve(scratch,'declarations/.generated-display/consumer.d.ts'),'utf8'),examples:readFileSync(resolve(scratch,'declarations/target-examples.d.ts'),'utf8')};
  const diagnostics=[];
  const bad={
    entity:"collect(from(store),{select:e=>e.missing});",
    context:"collect(from(store),{context:{minimum:10},select:(e,id,ctx)=>ctx.owner});",
    missingContext:"collect(from(store),{where:(e,id,ctx:{minimum:number})=>ctx.minimum>0});",
    sortedContext:"sorted(from(store),(e,id,ctx:{direction:number})=>ctx.direction,(a,b)=>a-b);",
  };
  const prelude=consumer.slice(0,consumer.indexOf('const input='));
  for(const [name,expression] of Object.entries(bad)){
    writeFileSync(resolve(scratch,'bad.ts'),prelude+expression);
    writeFileSync(resolve(scratch,'bad.json'),JSON.stringify({compilerOptions:{...config.compilerOptions,noEmit:true,emitDeclarationOnly:false},files:['bad.ts']}));
    try{execFileSync('node',[resolve('node_modules/typescript/bin/tsc'),'-p',resolve(scratch,'bad.json'),'--pretty','false'],{encoding:'utf8'});throw new Error(`Expected failure ${name}`);}
    catch(error){if(![1,2].includes(error.status)||!String(error.stdout).includes('error TS'))throw error;diagnostics.push({name,expression,output:error.stdout});}
  }
  const typescript=JSON.parse(readFileSync('node_modules/typescript/package.json','utf8')).version;
  writeFileSync('results/type-display.json',JSON.stringify({date:new Date().toISOString(),typescript,notes:'Compiler-emitted declarations of unannotated result expressions and target-example returns; domain inputs are explicitly typed. Chosen collect/sorted diagnostics are included; query diagnostics are in type-cost.json. No IDE-rendering claim.',consumer,declarations,diagnostics},null,2)+'\n');console.log('Saved results/type-display.json');
}finally{rmSync(scratch,{recursive:true,force:true});}
