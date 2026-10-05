/** Sequential final gates; benchmark correctness is checked by each benchmark itself. */
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'../..');
const checks=[];
for(const [cwd,command,args] of [
  [root,'npm',['run','check']],[root,'npm',['test']],[root,'npm',['run','test:bun']],
  [here,'npm',['run','check']],[here,'npm',['test']],[here,'npm',['run','test:bun']],
  [here,'node',['node_modules/typescript/bin/tsc','--noEmit','-p','tsconfig.tanstack.json']],
  [here,'node',['verify-package.mjs']],[here,'node',['type-display.mjs']],
  [here,'node',['summarize.mjs']],[here,'node',['summarize-business.mjs']],[here,'node',['summarize-costs.mjs']],
  [root,'git',['diff','--check']],
]){
  const start=Date.now(),result=spawnSync(command,args,{cwd,encoding:'utf8',maxBuffer:16*1024*1024});
  assert.equal(result.status,0,result.stdout+result.stderr);
  checks.push({cwd:cwd===root?'root':'experiments/goal',command:[command,...args].join(' '),exit:result.status,elapsedMs:Date.now()-start,stdout:result.stdout,stderr:result.stderr});
  console.log(`Passed ${checks.at(-1).cwd}: ${checks.at(-1).command}`);
}
const artifacts=[];
for(const family of ['query','temporal','temporal-candidates','business','spatial','updates','tanstack','costs','sequences'])for(const runtime of ['node','bun']){
  const name=`${family}-${runtime}.json`,raw=readFileSync(resolve(here,'results',name),'utf8'),report=JSON.parse(raw);
  assert.equal(report.runtime,runtime);assert(report.data.length>0);
  if(family!=='tanstack')for(const row of report.data)for(const measure of Object.values(row.timings??row.builds)){
    assert.equal(measure.samples.length,9);assert.equal(measure.measuredSamples.length,9);
    assert(measure.samples.every(Number.isFinite));assert(measure.iterations>0);assert(measure.min<=measure.median&&measure.median<=measure.max);
  }
  artifacts.push({name,rows:report.data.length,date:report.date,sha256:createHash('sha256').update(raw).digest('hex')});
}
const bundles=JSON.parse(readFileSync(resolve(here,'results/bundles.json'),'utf8'));
assert.equal(bundles.results.length,56);assert(bundles.results.every(r=>r.smoke==='passed'));
assert.equal(new Set(bundles.results.map(r=>r.bundler)).size,2);
const memory=JSON.parse(readFileSync(resolve(here,'results/memory.json'),'utf8'));assert(memory.results.some(r=>r.runtime==='node'&&r.mode==='natural'));assert(memory.results.some(r=>r.runtime==='bun'&&r.mode==='retained'));
const types=JSON.parse(readFileSync(resolve(here,'results/type-cost.json'),'utf8'));assert.equal(types.rows.length,18);assert(types.rows.every(r=>r.samples.length===3));assert.equal(types.diagnostics.length,4);
const packed=JSON.parse(readFileSync(resolve(here,'results/package.json'),'utf8'));assert.equal(packed.installedDeclarationConsumer,'passed strict TypeScript without skipLibCheck');
writeFileSync(resolve(here,'results/verification.json'),JSON.stringify({checkedAt:new Date().toISOString(),node:process.version,checks,artifacts,bundles:{outputs:56,executableSmoke:'passed',granularityAssertions:'passed in bundles.mjs'},limitations:'Raw validation checks report shape and hashes. Semantic equivalence is asserted in benchmark scripts and independent scenario/differential tests; this verifier alone does not prove semantic coverage.'},null,2)+'\n');
console.log('Saved results/verification.json');
