import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const here=dirname(fileURLToPath(import.meta.url));
const scratch=resolve(here,'.generated-public-types');mkdirSync(scratch,{recursive:true});
const tsc=resolve(here,'node_modules/typescript/bin/tsc');
const declarations=Object.fromEntries(['source','collect','sorted'].map(name=>[name,createHash('sha256').update(readFileSync(resolve(here,`../../dist/src/${name}.d.ts`))).digest('hex')]));
const base={target:'ES2023',module:'NodeNext',moduleResolution:'NodeNext',strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,types:['node'],skipLibCheck:false,noEmit:true};
const run=config=>execFileSync('node',[tsc,'-p',config,'--pretty','false','--extendedDiagnostics'],{encoding:'utf8',cwd:here});
const make=(name,source,options={})=>{
  const file=resolve(scratch,`${name}.ts`),config=resolve(scratch,`${name}.json`);
  writeFileSync(file,source);writeFileSync(config,JSON.stringify({compilerOptions:{...base,...options},files:[file]}));return config;
};
const header='declare const values:readonly {id:string;active:boolean;amount:number}[];';
const core="import {from,collect,sorted,subset} from '../../../dist/src/index.js';";
const fixtures={
  native:{imports:'',call:'values.filter(e=>e.active).map(e=>({id:e.id,total:e.amount*2})).slice(0,20)'},
  remeda:{imports:"import {pipe,filter,map,take} from 'remeda';",call:'pipe(values,filter(e=>e.active),map(e=>({id:e.id,total:e.amount*2})),take(20))'},
  restricted:{imports:"import {from} from './library/source.js';import {collect} from './library/collect.js';",call:'collect(from(values),{where:e=>e.active,select:e=>({id:e.id,total:e.amount*2}),limit:20})'},
  publicCollect:{imports:core,call:'collect(from(values),{where:e=>e.active,select:e=>({id:e.id,total:e.amount*2}),limit:20})'},
  nativeSorted:{imports:'',call:'values.map(e=>({ref:e,value:e.amount})).sort((a,b)=>a.value-b.value).map(e=>e.ref)'},
  publicSorted:{imports:core,call:'sorted(values,e=>e.amount,(a,b)=>a-b)'},
};
try{
  const libraryConfig=resolve(scratch,'library.json');
  writeFileSync(libraryConfig,JSON.stringify({compilerOptions:{...base,rootDir:'..',noEmit:false,allowImportingTsExtensions:true,rewriteRelativeImportExtensions:true,declaration:true,emitDeclarationOnly:true,outDir:'./library'},files:['../source.ts','../collect.ts']}));
  const startLibrary=performance.now(),libraryRaw=run(libraryConfig),libraryWallMs=performance.now()-startLibrary;
  const rows=[];
  for(const calls of [100,1000,5000])for(const [variant,fixture] of Object.entries(fixtures)){
    const config=make(`${variant}-${calls}`,`${fixture.imports}\n${header}\n`+Array.from({length:calls},(_,i)=>`export const result${i}=${fixture.call};`).join('\n'));
    const samples=[];
    for(let i=0;i<3;i++){
      const start=performance.now(),raw=run(config),wallMs=performance.now()-start;
      const field=key=>raw.match(new RegExp(`^${key}:\\s+([^\\n]+)`,'m'))?.[1];
      samples.push({wallMs,memory:field('Memory used'),instantiations:field('Instantiations'),types:field('Types'),check:field('Check time'),total:field('Total time'),raw});
    }
    rows.push({variant,calls,samples});
    console.log(`${variant}: ${calls} calls checked`);
  }
  const displayed=make('inferred',`${core}
import {tree,subtree} from '../../../dist/src/tree/index.js';
import {timeline,overlapping} from '../../../dist/src/time/index.js';
import {dependencies,descendants} from '../../../dist/src/dependencies/index.js';
import {pointIndex,within} from '../../../dist/src/spatial/index.js';
import {doublyLinkedList,append} from '../../../dist/src/lists/index.js';
import {indexBy,diffBy} from '../../../dist/src/diff/index.js';
import type {Brand} from '../../../dist/src/index.js';
type Id=Brand<string,'Id'>;
declare const store:ReadonlyMap<Id,{active:boolean;amount:number}|undefined>;
export const refs=collect(from(store));
export const projected=collect(from(store),{where:(e):e is {active:boolean;amount:number}=>e!==undefined,select:(e,id)=>({id,total:e.amount*2})});
export const contextual=collect(from(store),{context:{minimum:2},where:(e,_,ctx)=>e!==undefined&&e.amount>=ctx.minimum});
const source=from(store),forest=tree(source,()=>null),history=timeline(source,e=>e?.amount??0),graph=dependencies(source,()=>[]),points=pointIndex(source,{x:e=>e?.amount??0,y:()=>0});
declare const id:Id;
export const treeRefs=collect(subtree(forest,id));
export const timeRows=collect(overlapping(history,{start:0,end:100}),{select:(e,id)=>({id,total:e?.amount??0})});
export const graphRefs=collect(descendants(graph,id));
export const pointRefs=collect(within(points,{minX:0,minY:0,maxX:100,maxY:100}));
export const node=append(doublyLinkedList(refs),id);
export const diff=diffBy(indexBy([{id:'x',n:1}] as const,e=>e.id),indexBy([{id:'x',n:2}] as const,e=>e.id),(a,b)=>Number(a.n)===Number(b.n));
`,{noEmit:false,declaration:true,emitDeclarationOnly:true});
  run(displayed);const inferred=readFileSync(resolve(scratch,'inferred.d.ts'),'utf8');assert(!/\bany\b/.test(inferred));
  const bad={
    entity:{expression:'collect(from(values),{select:e=>e.missing});',code:2339},
    reference:{expression:"collect(from(new Map<string,{amount:number}>()),{select:(e,id)=>id.toFixed()});",code:2551},
    missingContext:{expression:'collect(from(values),{where:(e,id,c:{minimum:number})=>e.amount>=c.minimum});',code:2769},
    wrongContext:{expression:'collect(from(values),{context:{minimum:1},where:(e,id,c)=>c.userId.length>0});',code:2339},
    referenceAsEntity:{expression:'sorted(from(new Map<string,{amount:number}>()),(id:string)=>id,(a,b)=>a.localeCompare(b));',code:2769},
    singleList:{imports:"import {linkedList,removeLast} from '../../../dist/src/lists/index.js';",expression:'removeLast(linkedList([1,2]));',code:2345},
  };
  const diagnostics=[];
  for(const [name,fixture] of Object.entries(bad)){
    const config=make(`bad-${name}`,`${core}\n${fixture.imports??''}\n${header}\n${fixture.expression}`);
    try{run(config);throw new Error(`Expected failure: ${name}`);}catch(error){
      if(![1,2].includes(error.status))throw error;
      const raw=String(error.stdout);assert(raw.includes(`error TS${fixture.code}:`),raw);diagnostics.push({name,expectedCode:fixture.code,raw});
    }
  }
  mkdirSync(resolve(here,'results'),{recursive:true});
  writeFileSync(resolve(here,'results/migration-type-cost.json'),JSON.stringify({checkedAt:new Date().toISOString(),node:process.version,typescript:JSON.parse(readFileSync(resolve(here,'node_modules/typescript/package.json'),'utf8')).version,config:base,declarations,library:{wallMs:libraryWallMs,raw:libraryRaw},notes:['Public consumers import built package declarations, not implementation source. Installed bare exports are checked separately by verify-package.mjs.','Three sequential fresh compiler processes per fixture; no IDE latency claim. Unannotated outputs test inference.','Native/prototype/Remeda comparison repeats 100/1000/5000 independent call sites. Sorted comparison is separate from filtered/projection comparison.','Declaration checking is included; skipLibCheck=false. No time or heap claim is derived from types count alone.'],rows,inferred,diagnostics},null,2)+'\n');
}finally{rmSync(scratch,{recursive:true,force:true});}
