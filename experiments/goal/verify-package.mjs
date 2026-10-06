import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import {bundleInstalled} from './bundle-installed.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const scratch = mkdtempSync(resolve(here, '.pack-'));
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8' });
try {
  const output = run('npm', ['pack', '--json', '--pack-destination', scratch], root);
  const [packed] = JSON.parse(output.slice(output.indexOf('[\n')));
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const files = new Set(packed.files.map(file => file.path));
  for (const entry of Object.values(manifest.exports)) {
    for (const target of Object.values(entry)) assert(files.has(target.replace(/^\.\//, '')), target);
  }
  assert(![...files].some(path => /^(test|bench|references|experiments)\//.test(path)));
  const consumer = resolve(scratch, 'consumer');
  mkdirSync(consumer);
  writeFileSync(resolve(consumer, 'package.json'), JSON.stringify({ name: 'isolated-packed-consumer', private: true, type: 'module' }));
  // Its own package scope prevents ts-algo's parent self-reference hiding a broken tarball.
  run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', resolve(scratch, packed.filename), `zod@${manifest.devDependencies.zod.replace(/^\^/, '')}`], consumer);
  const smoke = `import assert from 'node:assert/strict';
import {sorted,from,subset,entity,collect} from 'ts-algo';
import {denseArray} from 'ts-algo/zod';
import * as z from 'zod/mini';
import {timeline,overlapping,startsBetween} from 'ts-algo/time';
import {freeSlots,overloaded,conflicts} from 'ts-algo/ranges';
import {tree,children,subtree,sortChildren,nextSibling} from 'ts-algo/tree';
import {dependencies,causesOf,descendants,causalOrder} from 'ts-algo/dependencies';
assert.deepEqual(sorted(new Map([['b', {n:2}], ['a', {n:1}]]), x=>x.n, (a,b)=>a-b), ['a','b']);
assert.deepEqual(denseArray(z.number()).parse([1,2]), [1,2]);
assert.equal(denseArray(z.number()).safeParse(new Array(2)).success, false);
const store=new Map([['a',{rank:2}],['b',{rank:1}]]),source=from(store);
assert.equal(from(source),source);
assert.deepEqual(sorted(source,e=>e.rank,(a,b)=>a-b),['b','a']);
assert.deepEqual(collect(subset(source,['b']),{context:{multiplier:3},select:(e,id,c)=>({id,total:e.rank*c.multiplier})}),[{id:'b',total:3}]);
store.set('b',{rank:4});assert.equal(entity(source,'b').rank,4);
const times=new Map([['a',{start:0,end:10}],['b',{start:5,end:15}]]);
const index=timeline(source,(_,id)=>times.get(id));
assert.deepEqual(collect(startsBetween(index,{start:5,end:6})),['b']);
const reservations=collect(overlapping(index,{start:0,end:20}),{select:(_,id)=>({...times.get(id),units:2})});
assert.deepEqual(conflicts(reservations),[[0,1]]);
assert.deepEqual(freeSlots(reservations,{start:0,end:20}),[{start:15,end:20}]);
assert.deepEqual(overloaded(reservations,{start:0,end:20},3),[{start:5,end:10}]);
assert(!('causesOf' in index));
const forest=tree(source,(_,id)=>id==='a'?null:'a');assert.deepEqual(children(forest,'a'),['b']);
assert.deepEqual(collect(subtree(forest,'a')),['a','b']);
assert.deepEqual(collect(sortChildren(forest,e=>e.rank,(a,b)=>a-b)),['a','b']);
assert.equal(nextSibling(forest,'b'),undefined);
const graph=dependencies(source,(_,id)=>id==='a'?[]:['a']);
assert.deepEqual(causesOf(graph,'b'),['a']);assert.deepEqual(collect(descendants(graph,'a')),['b']);
assert.deepEqual(collect(causalOrder(graph)),['a','b']);
`;
  writeFileSync(resolve(consumer, 'smoke.mjs'), smoke);
  run('node', ['smoke.mjs'], consumer);
  run('bun', ['smoke.mjs'], consumer);
  writeFileSync(resolve(consumer,'types.ts'),`import {sorted,from,subset,entity,collect,type Brand} from 'ts-algo';
import {denseArray} from 'ts-algo/zod';import * as z from 'zod/mini';
import {timeline,overlapping} from 'ts-algo/time';
import {tree,subtree} from 'ts-algo/tree';import {dependencies,descendants} from 'ts-algo/dependencies';
type Id=Brand<string,'Id'>;declare const store:ReadonlyMap<Id,{rank:number}>;
const refs:Id[]=sorted(store,e=>e.rank,(a,b)=>a-b);
const source=from(store);const ordered:Id[]=sorted(source,e=>e.rank,(a,b)=>a-b);
const rows:{id:Id;total:number}[]=collect(subset(source,ordered),{context:{multiplier:3},select:(e,id,c)=>({id,total:e.rank*c.multiplier})});
const value:number=entity(source,refs[0]!).rank;
const index=timeline(source,e=>({start:e.rank,end:e.rank+1}));
const timeRefs:Id[]=collect(overlapping(index,{start:new Date(0),end:100}));
const forest=tree(source,()=>null);const forestRefs:Id[]=collect(subtree(forest,refs[0]!));
const graph=dependencies(source,()=>[]);const graphRows:{id:Id;rank:number}[]=collect(descendants(graph,refs[0]!),{select:(e,id)=>({id,rank:e.rank})});
// @ts-expect-error removed root chronology must not remain public
import {timeline as oldTimeline} from 'ts-algo';
// @ts-expect-error removed root hierarchy must not remain public
import {tree as oldTree} from 'ts-algo';
// @ts-expect-error callback requires explicit operation context
collect(source,{where:(e,id,c:{minimum:number})=>e.rank>c.minimum});
// @ts-expect-error Source cannot fall back to selecting its reference as entity
sorted(source,(id:Id)=>id,(a,b)=>a.localeCompare(b));
const schema=denseArray(z.number());const values:number[]=schema.parse([1,2]);
// @ts-expect-error Map output preserves branded keys, not entities
const wrong:{rank:number}[]=refs;
void values;void wrong;
`);
  writeFileSync(resolve(consumer,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2023',module:'NodeNext',moduleResolution:'NodeNext',strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,noEmit:true,types:[],skipLibCheck:false},files:['types.ts']}));
  run('node',[resolve(here,'node_modules/typescript/bin/tsc'),'-p','tsconfig.json'],consumer);
  const bundles=process.argv.includes('--migration')?await bundleInstalled(consumer):undefined;
  const declarationBytes=packed.files.filter(file=>file.path.endsWith('.d.ts')).reduce((sum,file)=>sum+file.size,0);
  assert(![...files].some(path=>/legacy|dist\/src\/(timeline|tree)\./.test(path)), 'Stale historical structures entered package');
  for (const path of files) if(path.endsWith('.d.ts')) {
    const declaration=readFileSync(resolve(consumer,'node_modules/ts-algo',path),'utf8');
    assert(!/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']date-fns(?:\/[^"']*)?["']/.test(declaration), 'Unexpected declaration dependency on date-fns');
  }
  const runtimeJSBytes=packed.files.filter(file=>file.path.endsWith('.js')).reduce((sum,file)=>sum+file.size,0);
  const report = { checkedAt: new Date().toISOString(), node: process.version, bun:run('bun',['--version'],consumer).trim(),typescript:JSON.parse(readFileSync(resolve(here,'node_modules/typescript/package.json'),'utf8')).version,files: [...files], size: packed.size, unpackedSize: packed.unpackedSize, declarationBytes,runtimeJSBytes,coreAndZod: 'passed Node and Bun in isolated consumer',installedDeclarationConsumer:'passed strict TypeScript without skipLibCheck', excludedResearch: true, installedBundleOutputs:bundles?.length };
  mkdirSync(resolve(here, 'results'), {recursive:true});
  const reportName=process.argv.includes('--migration')?'migration-package.json':'package.json';
  writeFileSync(resolve(here, 'results',reportName), JSON.stringify(report, null, 2)+'\n');
  console.log(JSON.stringify({files:files.size, size:packed.size, unpackedSize:packed.unpackedSize, smoke:report.coreAndZod}));
} finally {
  rmSync(scratch, {recursive:true, force:true});
}
