// Official installed date-fns declaration compatibility, without a library type peer.
import type { Interval } from 'date-fns';
import {from,collect} from '../../src/index.js';
import {timeline,overlapping,startsBetween,type TimeWindow} from '../../src/time/index.js';
declare const window:Readonly<Interval<Date|number,Date|number>>;
const index=timeline(from(new Map([['a',{title:'A'}]])),()=>new Date(0));
const structural:TimeWindow=window;
const refs:string[]=collect(overlapping(index,window));
startsBetween(index,structural);
declare const broad:Interval;
// @ts-expect-error broader date-fns DateArg may contain strings; normalize them first.
overlapping(index,broad);
void refs;
