import { performance } from 'node:perf_hooks';
import { cpus, platform, arch } from 'node:os';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

export const settings = {warmups:3, samples:9, gcBeforeSample:false,minimumSampleMs:10,maxIterations:4096};
let sink=0;
export function measure(variants: Record<string,()=>number>) {
  const entries=Object.entries(variants), raw=Object.fromEntries(entries.map(([name])=>[name,[] as number[]]));
  const iterations:Record<string,number>={};
  for(const [name,run] of entries) {
    let count=1;
    while(true) {
      const start=performance.now();for(let i=0;i<count;i++)sink+=run();
      if(performance.now()-start>=settings.minimumSampleMs||count>=settings.maxIterations)break;
      count*=2;
    }
    iterations[name]=count;
  }
  for(let round=-settings.warmups;round<settings.samples;round++) {
    for(let offset=0;offset<entries.length;offset++) {
      const [name,run]=entries[(round+settings.warmups+offset)%entries.length]!;
      const begin=performance.now();for(let i=0;i<iterations[name]!;i++)sink+=run();const elapsed=performance.now()-begin;
      if(round>=0) raw[name]!.push(elapsed);
    }
  }
  return Object.fromEntries(Object.entries(raw).map(([name,samples])=>{
    const normalized=samples.map(ms=>ms/iterations[name]!),ordered=[...normalized].sort((a,b)=>a-b);
    return [name,{iterations:iterations[name],measuredSamples:samples,samples:normalized,median:ordered[Math.floor(ordered.length/2)],min:ordered[0],max:ordered.at(-1)}];
  }));
}
export function save(name:string, data:unknown) {
  mkdirSync(new URL('./results/',import.meta.url),{recursive:true});
  const manifest=JSON.parse(readFileSync(new URL('./package.json',import.meta.url),'utf8'));
  const runtime=typeof (globalThis as {Bun?:unknown}).Bun==='undefined'?'node':'bun';
  const report={date:new Date().toISOString(),runtime,node:process.version,v8:process.versions.v8,bun:process.versions.bun,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,dependencies:manifest.devDependencies,settings,sink,data};
  writeFileSync(new URL(`./results/${name}-${runtime}.json`,import.meta.url),JSON.stringify(report,null,2)+'\n');
  console.log(`Saved results/${name}-${runtime}.json`);
}
export function random(seed=123) {
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
}
