import type {Brand} from '../../dist/src/brand.js';
import {from} from './source.ts';
import {query,queryInput,withContext,filtered,selected,sorted,take} from './query.ts';

type Id=Brand<string,'Id'>;
type Entity={kind:'invoice';total:number}|{kind:'note';text:string};
declare const map:ReadonlyMap<Id,Entity>;
const source=withContext(from(map),{minimum:10});
const amounts=query(source,
  filtered((e):e is Extract<Entity,{kind:'invoice'}>=>e.kind==='invoice'),
  selected((e,id,ctx)=>({id,amount:e.total+ctx.minimum})),
  sorted(e=>e.amount,(a,b)=>a-b));
const expected:Array<{id:Id;amount:number}>=amounts;
const ids:Id[]=query(source,filtered(e=>e.kind==='invoice'));
const numbers:number[]=query(queryInput(from(new Set([1,2]))),selected(n=>n*2));
// @ts-expect-error wrong entity property
query(source,selected(e=>e.missing));
// @ts-expect-error incorrect query context
query(source,filtered((e,id,ctx)=>ctx.userId===id));
// @ts-expect-error projected result no longer has original entity properties
query(source,selected(e=>e.kind),filtered(e=>e.kind==='invoice'));
// @ts-expect-error selected comparator must accept numbers
query(queryInput(from([1,2])),sorted(n=>n,(a:string,b:string)=>a.localeCompare(b)));
// @ts-expect-error reference is a branded string, not an array index
query(source,selected((e,id)=>id.toFixed()));

// Known inference stress case: literal references become widened by a generic take step.
function* literals(){yield 1;yield 2;}
// @ts-expect-error experimental variadic interface currently rejects this valid query
query(queryInput(from(literals())),take(1));
void expected;void ids;void numbers;

// Standalone terminal helpers infer output and cardinality without a query plan.
import {find,groupBy,aggregateBy,leftJoin,innerJoinMany,distinctBy} from './operators.ts';
const grouped:Map<Entity['kind'],Id[]>=groupBy(source,e=>e.kind);
const totals:Map<Entity['kind'],number>=aggregateBy(source,e=>e.kind,()=>0,(sum,e)=>sum+(e.kind==='invoice'?e.total:0));
const found=find(source,e=>e.kind==='invoice');if(found.found){const id:Id=found.value;void id;}
const unique:Id[]=distinctBy(source,e=>e.kind);
const readonlyArray:readonly number[]=[1,2];const arrayResults:number[]=query(queryInput(from(readonlyArray)),selected(n=>n*2));
const external=from(['one'],{context:{records:new Map([['one',{amount:2}]])},get:(id,ctx)=>ctx.records.get(id)!});
const contextResult:number[]=query(withContext(external,{multiplier:3}),selected((e,id,ctx)=>e.amount*ctx.multiplier));
const joined:Array<{id:Id;value:number|undefined}>=leftJoin(source,new Map<Entity['kind'],number>(),e=>e.kind,(_,match,id)=>({id,value:match.found?match.value:undefined}));
const expanded:Array<{id:Id;text:string}>=innerJoinMany(source,new Map<Entity['kind'],readonly string[]>(),e=>e.kind,(_,text,id)=>({id,text}));
// @ts-expect-error a left join must handle an absent match before reading value
leftJoin(source,new Map<Entity['kind'],number>(),e=>e.kind,(_,match)=>match.value);
// @ts-expect-error query context cannot silently access source context
query(withContext(external,{multiplier:3}),selected((e,id,ctx)=>ctx.records));
// @ts-expect-error aggregate output is number, not string
const wrongGroups:Map<Entity['kind'],string>=totals;
const enabled=true;
const conditional:Id[]=query(source,filtered(e=>!enabled||e.kind==='invoice'));
void grouped;void totals;void unique;void arrayResults;void contextResult;void joined;void expanded;void conditional;

import {collect} from './collect.ts';
const restricted:Array<{id:Id;amount:number}>=collect(from(map),{
  where:(e):e is Extract<Entity,{kind:'invoice'}>=>e.kind==='invoice',
  select:(e,id,ctx)=>({id,amount:e.total+ctx.minimum}),context:{minimum:10},limit:20,
});
const literalRefs:Array<1|2>=collect(from(literals()),{limit:1});
// @ts-expect-error narrowed entity no longer has note's text
collect(from(map),{where:(e):e is Extract<Entity,{kind:'invoice'}>=>e.kind==='invoice',select:e=>e.text});
// @ts-expect-error wrong context property
collect(from(map),{context:{minimum:1},select:(e,id,ctx)=>ctx.maximum});
void restricted;void literalRefs;
// @ts-expect-error a callback requiring context must be supplied that context
collect(from(map),{select:(e,id,ctx:{minimum:number})=>ctx.minimum});

// Reused callbacks and conditional options, without erasing Ref/Entity/Context.
const invoice=(e:Entity):e is Extract<Entity,{kind:'invoice'}>=>e.kind==='invoice';
const selectInvoice=(e:Extract<Entity,{kind:'invoice'}>,id:Id,ctx:{minimum:number})=>({id,amount:e.total+ctx.minimum});
const reusable:Array<{id:Id;amount:number}>=collect(from(map),{where:invoice,select:selectInvoice,context:{minimum:10}});
const conditionalOptions={where:(e:Entity)=>!enabled||e.kind==='invoice',limit:enabled?20:Infinity};
const conditionalRefs:Id[]=collect(from(map),conditionalOptions);
function titles<R,E,S>(input:import('./source.ts').Source<R,E,S>,select:(e:E,id:R)=>string):string[]{return collect(input,{select});}
const genericResult:string[]=titles(from(map),(e,id)=>`${id}:${e.kind}`);
void reusable;void conditionalRefs;void genericResult;

import {sorted as boundSorted} from './sorted-source.ts';
const boundOrder:Id[]=boundSorted(from(map),e=>e.kind,(a,b)=>a.localeCompare(b));
const contextualOrder:Id[]=boundSorted(from(map),(e,id,ctx)=>e.kind+ctx.suffix,(a,b)=>a.localeCompare(b),{context:{suffix:'!'}});
// @ts-expect-error source context is not substituted for explicit query context
boundSorted(external,(e,id,ctx)=>ctx.records.size,(a,b)=>a-b,{context:{suffix:'!'}});
// @ts-expect-error a sorted callback requiring context needs explicit options
boundSorted(from(map),(e,id,ctx:{minimum:number})=>ctx.minimum,(a,b)=>a-b);
declare const readonlySet:ReadonlySet<Id>;
const setOrder:Id[]=boundSorted(from(readonlySet),id=>id,(a,b)=>a.localeCompare(b));
void boundOrder;void contextualOrder;void setOrder;
