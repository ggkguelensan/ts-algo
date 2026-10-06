import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const here=resolve(import.meta.dirname),root=resolve(here,'../..'),checks=[];
// Benchmarks were already executed sequentially with output oracles. This gate
// rechecks current semantics/package and fingerprints their saved measurements.
for(const [cwd,command,args]of [
 [root,'npm',['run','check']],[root,'npm',['test']],[root,'npm',['run','test:bun']],
 [here,'npm',['run','check']],[here,'npm',['test']],[here,'npm',['run','test:bun']],
 [here,'node',['summarize-public-ranges.mjs']],[here,'node',['summarize-public-costs.mjs']],
 [here,'node',['verify-package.mjs','--migration']],[root,'git',['diff','--check']],
]){
 const start=Date.now(),result=spawnSync(command,args,{cwd,encoding:'utf8',maxBuffer:16*1024*1024});
 assert.equal(result.status,0,result.stdout+result.stderr);
 checks.push({cwd:cwd===root?'root':'experiments/goal',command:[command,...args].join(' '),exit:result.status,elapsedMs:Date.now()-start,stdout:result.stdout,stderr:result.stderr});console.log(`Passed ${checks.at(-1).cwd}: ${checks.at(-1).command}`);
}
const hash=raw=>createHash('sha256').update(raw).digest('hex'),artifacts=[];
for(const family of ['core','time','ranges','structure','spatial','sequences'])for(const runtime of ['node','bun']){
 const name=`migration-${family}-${runtime}.json`,raw=readFileSync(resolve(here,'results',name),'utf8'),report=JSON.parse(raw);
 assert.equal(report.runtime,runtime);assert(report.data.length>0);
 for(const row of report.data)for(const measure of Object.values(row.timings)){
  assert.equal(measure.samples.length,9);assert.equal(measure.measuredSamples.length,9);assert(measure.samples.every(Number.isFinite));assert(measure.iterations>0);assert(measure.min<=measure.median&&measure.median<=measure.max);
 }
 artifacts.push({name,rows:report.data.length,date:report.date,sha256:hash(raw)});
}
const types=JSON.parse(readFileSync(resolve(here,'results/migration-type-cost.json'),'utf8'));
assert.equal(types.rows.length,18);assert(types.rows.every(x=>x.samples.length===3));assert.equal(types.diagnostics.length,6);
for(const[name,fingerprint]of Object.entries(types.declarations))assert.equal(hash(readFileSync(resolve(root,`dist/src/${name}.d.ts`))),fingerprint);
const baseline=JSON.parse(readFileSync(resolve(here,'results/migration-type-baseline.json'),'utf8'));assert.equal(baseline.rows.length,12);assert(baseline.rows.every(x=>x.samples.length===3));assert.equal(baseline.publicDeclarationHash,types.declarations.sorted);
const memory=JSON.parse(readFileSync(resolve(here,'results/migration-memory.json'),'utf8'));assert.equal(memory.results.length,126);assert.equal(memory.results.filter(x=>x.mode==='natural'&&x.correctness).length,12);
const bundles=JSON.parse(readFileSync(resolve(here,'results/migration-installed-bundles.json'),'utf8'));assert.equal(bundles.results.length,38);assert(bundles.results.every(x=>x.smoke==='passed'));assert.equal(new Set(bundles.results.map(x=>x.bundler)).size,2);
const packed=JSON.parse(readFileSync(resolve(here,'results/migration-package.json'),'utf8'));assert.equal(packed.businessScenarios.count,7);assert.equal(packed.businessOracles.rounds,60);assert.equal(packed.businessOracles.scenarios,7);
const manifest=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'));assert.equal(manifest.private,true);assert.equal(manifest.dependencies,undefined);
assert(!packed.files.some(x=>/^(?:dist\/)?(?:references|experiments|test|bench|examples)\//.test(x)));assert(!packed.files.includes('dist/src/internal/reference-map.js'));
for(const path of ['src/index.ts','src/source.ts','src/collect.ts','src/sorted.ts','docs/design.md','README.md','examples/business.ts','examples/expected.json','test/business-oracles.test.ts'])assert(existsSync(resolve(root,path)),path);
for(const path of ['README.md','docs/design.md','docs/contributing.md','experiments/goal/migration-audit.md',...readdirSync(resolve(here,'results')).filter(x=>/^migration-.*\.md$/.test(x)).map(x=>`experiments/goal/results/${x}`)]){
 const contents=readFileSync(resolve(root,path),'utf8');
 for(const match of contents.matchAll(/\]\(([^)]+)\)/g)){
  const target=match[1];if(/^(?:https?:|#)/.test(target))continue;
  assert(existsSync(resolve(root,path,'..',target.split('#')[0])),`Broken local link ${path}: ${target}`);
 }
}
for(const name of ['migration-type-cost.json','migration-type-baseline.json','migration-type-investigation.json','migration-memory.json','migration-installed-bundles.json','migration-package.json','migration-business-types.json'])artifacts.push({name,sha256:hash(readFileSync(resolve(here,'results',name)))});
writeFileSync(resolve(here,'results/migration-verification.json'),JSON.stringify({checkedAt:new Date().toISOString(),node:process.version,checks,artifacts,bundleOutputs:38,business:{scenarios:7,seededRounds:60,installedBothRuntimes:true},private:true,limitations:'Hashes/report-shape checks supplement output oracles and differential tests. This verifier does not by itself establish semantic coverage, causal retention mechanism, browser throughput, IDE responsiveness or accepted trade-offs; the requirement audit and canonical design decisions provide that assessment.'},null,2)+'\n');
console.log('Saved results/migration-verification.json');
