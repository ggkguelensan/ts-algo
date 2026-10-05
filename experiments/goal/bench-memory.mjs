import {execFileSync} from 'node:child_process';
import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {cpus} from 'node:os';
const n=50000,results=[];
for(const runtime of ['node','bun']){
  for(const variant of ['source','tree','currentTime','temporal','unboundTemporal','points','boundPoints','kdbush','keys','projected','projectedInline','restricted','restrictedInline','projectedNative'])for(let sample=0;sample<3;sample++){
    const row=JSON.parse(execFileSync(runtime,['--expose-gc','memory-worker.mjs',variant,String(n)],{encoding:'utf8'}));results.push({runtime,sample,...row});
  }
  for(const variant of ['fused','restricted','remeda','native']){
    const row=JSON.parse(execFileSync(runtime,['--expose-gc','memory-worker.mjs',variant,String(n),'natural'],{encoding:'utf8'}));results.push({runtime,...row});
  }
}
mkdirSync(new URL('./results/',import.meta.url),{recursive:true});
const dependencies=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8')).devDependencies;
writeFileSync(new URL('./results/memory.json',import.meta.url),JSON.stringify({date:new Date().toISOString(),cpu:cpus()[0]?.model,node:process.version,dependencies,notes:['Fresh subprocess for every retained sample; GC outside snapshot phases. Heap/external/arrayBuffers accounting differs across runtimes.','Payload strings may be shared/ropes; this is this fixture retention, not a universal per-entity size.','Observed per-iteration heap maximum is not true peak. Node allocation sampling includes objects collected by both minor and major GC; estimates are not exact bytes.'],results},null,2)+'\n');
console.log('Saved results/memory.json');
