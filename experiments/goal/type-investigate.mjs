import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {resolve} from 'node:path';
const scratch=resolve('.generated-type-investigation'),tsc=resolve('node_modules/typescript/bin/tsc');mkdirSync(scratch,{recursive:true});
const options={target:'ES2023',module:'NodeNext',moduleResolution:'NodeNext',strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,types:['node'],skipLibCheck:false,noEmit:true};
const signatures={
  simple:'export declare function sorted<R,V>(refs:readonly R[],get:(ref:R)=>V,compare:(a:V,b:V)=>number):R[];',
  noInferCompare:'export declare function sorted<R,V>(refs:readonly R[],get:(ref:R)=>V,compare:(a:NoInfer<V>,b:NoInfer<V>)=>number):R[];',
};
const variants={
  publicInline:{imports:"import {sorted} from '../../../dist/src/index.js';",call:'sorted(values,e=>e.amount,(a,b)=>a-b)'},
  simpleInline:{imports:"import {sorted} from './simple.js';",call:'sorted(values,e=>e.amount,(a,b)=>a-b)'},
  noInferInline:{imports:"import {sorted} from './noInferCompare.js';",call:'sorted(values,e=>e.amount,(a,b)=>a-b)'},
  publicReused:{imports:"import {sorted} from '../../../dist/src/index.js';const get=(e:{amount:number})=>e.amount;const compare=(a:number,b:number)=>a-b;",call:'sorted(values,get,compare)'},
};
const rows=[];
try{
 for(const [name,signature]of Object.entries(signatures))writeFileSync(resolve(scratch,`${name}.d.ts`),signature);
 for(const [name,v]of Object.entries(variants)){
  const file=resolve(scratch,`${name}.ts`),config=resolve(scratch,`${name}.json`);
  writeFileSync(file,`${v.imports}\ndeclare const values:readonly {id:string;active:boolean;amount:number}[];\n`+Array.from({length:5000},(_,i)=>`export const result${i}=${v.call};`).join('\n'));
  writeFileSync(config,JSON.stringify({compilerOptions:options,files:[file]}));
  const samples=[];for(let i=0;i<3;i++){
   const start=performance.now(),raw=execFileSync('node',[tsc,'-p',config,'--extendedDiagnostics'],{encoding:'utf8'});samples.push({wallMs:performance.now()-start,raw});
  }rows.push({variant:name,calls:5000,samples});console.log(name,samples.map(x=>Math.round(x.wallMs)));
 }
 writeFileSync('results/migration-type-investigation.json',JSON.stringify({checkedAt:new Date().toISOString(),node:process.version,typescript:JSON.parse(readFileSync('node_modules/typescript/package.json','utf8')).version,options,signatures,variants,rows,notes:['Isolated compile-time hypotheses, not public changes. Three sequential fresh processes per candidate.','A smaller declaration has a different contract; speed alone does not justify replacing overloads.']},null,2)+'\n');
}finally{rmSync(scratch,{recursive:true,force:true});}
