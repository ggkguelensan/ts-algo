import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
if(!process.env.GOAL_DATE_WORKER){
  const results=[];for(const runtime of ['node','bun'])for(const TZ of ['UTC','America/New_York']){
    const result=JSON.parse(execFileSync(runtime,['date-check.mjs'],{encoding:'utf8',env:{...process.env,TZ,GOAL_DATE_WORKER:'1'}}));results.push({runtime,TZ,...result});
  }writeFileSync('results/dates.json',JSON.stringify({date:new Date().toISOString(),results},null,2)+'\n');console.log('Saved results/dates.json');
}else{
  const {parseISO,addDays,addHours,getTime,isWithinInterval}=await import('date-fns');
  const {from}=await import('./source.ts'),{temporal,overlapping}=await import('./temporal.ts');
  const day=parseISO('2026-03-08T00:00:00'),next=addDays(day,1),hours=(getTime(next)-getTime(day))/3600000;
  assert.equal(hours,process.env.TZ==='America/New_York'?23:24);assert.equal((getTime(addHours(day,24))-getTime(day))/3600000,24);
  const boundary=new Date(getTime(day)+3600000),index=temporal(from([1]),()=>({start:day,end:boundary}));
  assert.deepEqual([...overlapping(index,{start:boundary,end:addHours(boundary,1)})],[]);
  assert.equal(isWithinInterval(boundary,{start:day,end:boundary}),true);
  console.log(JSON.stringify({calendarDayHours:hours,fixed24Hours:24,halfOpenBoundaryPassed:true,dateFnsClosedBoundary:true}));
}
