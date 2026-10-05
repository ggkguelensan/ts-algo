import {createCollection,localOnlyCollectionOptions,createLiveQueryCollection,eq,and,sum,BTreeIndex} from '@tanstack/db';
export type Order={id:number;customer:number;amount:number;paid:boolean};
export type Customer={id:number;region:number;enabled:boolean};
export async function liveReport(orderRows:Order[],customerRows:Customer[],options:{filterIndex?:boolean}={}){
  const orders=createCollection(localOnlyCollectionOptions({getKey:(e:Order)=>e.id,initialData:orderRows}));
  const customers=createCollection(localOnlyCollectionOptions({getKey:(e:Customer)=>e.id,initialData:customerRows}));
  orders.createIndex(e=>e.customer,{indexType:BTreeIndex});
  if(options.filterIndex)orders.createIndex(e=>e.paid,{indexType:BTreeIndex});
  customers.createIndex(e=>e.id,{indexType:BTreeIndex});
  const stats=createLiveQueryCollection(q=>q.from({order:orders})
    .join({customer:customers},({order,customer})=>eq(order.customer,customer.id),'inner')
    .where(({order,customer})=>and(eq(order.paid,true),eq(customer.enabled,true)))
    .groupBy(({customer})=>customer.region)
    .select(({order,customer})=>({region:customer.region,total:sum(order.amount)})));
  stats.createIndex(e=>e.total,{indexType:BTreeIndex});
  const top=createLiveQueryCollection(q=>q.from({stats}).orderBy(({stats})=>stats.total,'desc').orderBy(({stats})=>stats.region,'asc').limit(2).select(({stats})=>({region:stats.region,total:stats.total})));
  await top.preload();
  return {orders,customers,read:()=>top.toArray.map(e=>({region:e.region,total:e.total})),cleanup:async()=>{await top.cleanup();await stats.cleanup();await orders.cleanup();await customers.cleanup();}};
}
