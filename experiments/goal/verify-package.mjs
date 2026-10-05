import { mkdtempSync, writeFileSync, rmSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

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
import {sorted} from 'ts-algo';
import {denseArray} from 'ts-algo/zod';
import * as z from 'zod/mini';
assert.deepEqual(sorted(new Map([['b', {n:2}], ['a', {n:1}]]), x=>x.n, (a,b)=>a-b), ['a','b']);
assert.deepEqual(denseArray(z.number()).parse([1,2]), [1,2]);
assert.equal(denseArray(z.number()).safeParse(new Array(2)).success, false);
`;
  writeFileSync(resolve(consumer, 'smoke.mjs'), smoke);
  run('node', ['smoke.mjs'], consumer);
  run('bun', ['smoke.mjs'], consumer);
  writeFileSync(resolve(consumer,'types.ts'),`import {sorted,type Brand} from 'ts-algo';
import {denseArray} from 'ts-algo/zod';import * as z from 'zod/mini';
type Id=Brand<string,'Id'>;declare const store:ReadonlyMap<Id,{rank:number}>;
const refs:Id[]=sorted(store,e=>e.rank,(a,b)=>a-b);
const schema=denseArray(z.number());const values:number[]=schema.parse([1,2]);
// @ts-expect-error Map output preserves branded keys, not entities
const wrong:{rank:number}[]=refs;
void values;void wrong;
`);
  writeFileSync(resolve(consumer,'tsconfig.json'),JSON.stringify({compilerOptions:{target:'ES2023',module:'NodeNext',moduleResolution:'NodeNext',strict:true,noUncheckedIndexedAccess:true,exactOptionalPropertyTypes:true,noEmit:true,types:[],skipLibCheck:false},files:['types.ts']}));
  run('node',[resolve(here,'node_modules/typescript/bin/tsc'),'-p','tsconfig.json'],consumer);
  const declarationBytes=packed.files.filter(file=>file.path.endsWith('.d.ts')).reduce((sum,file)=>sum+file.size,0);
  const runtimeJSBytes=packed.files.filter(file=>file.path.endsWith('.js')).reduce((sum,file)=>sum+file.size,0);
  const report = { checkedAt: new Date().toISOString(), node: process.version, bun:run('bun',['--version'],consumer).trim(),typescript:JSON.parse(readFileSync(resolve(here,'node_modules/typescript/package.json'),'utf8')).version,files: [...files], size: packed.size, unpackedSize: packed.unpackedSize, declarationBytes,runtimeJSBytes,coreAndZod: 'passed Node and Bun in isolated consumer',installedDeclarationConsumer:'passed strict TypeScript without skipLibCheck', excludedResearch: true };
  mkdirSync(resolve(here, 'results'), {recursive:true});
  writeFileSync(resolve(here, 'results/package.json'), JSON.stringify(report, null, 2)+'\n');
  console.log(JSON.stringify({files:files.size, size:packed.size, unpackedSize:packed.unpackedSize, smoke:report.coreAndZod}));
} finally {
  rmSync(scratch, {recursive:true, force:true});
}
