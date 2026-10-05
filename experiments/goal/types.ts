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
