import {from,subset,entity,collect,sorted,timeline,overlapping,tree,roots,children,nextSibling,subtree,freeSlots,overloaded} from './target-interface.ts';

export function scheduleExample(){
  const events=new Map([
    ['a',{owner:'alice',units:2,title:'A'}],
    ['b',{owner:'alice',units:2,title:'B'}],
    ['c',{owner:'bob',units:1,title:'C'}],
  ]);
  // Events carry no time fields. The external binding validates missing metadata.
  const times=from(new Map([
    ['a',{start:0,end:10}],['b',{start:5,end:15}],['c',{start:20,end:25}],
  ]));
  const history=timeline(from(events),(_,id)=>entity(times,id));
  const window={start:0,end:25};
  const selection=overlapping(history,window);
  const reservations=collect(selection,{
    context:{owner:'alice'},
    where:(event,_,ctx)=>event.owner===ctx.owner,
    select:(event,id)=>({...entity(times,id),units:event.units}),
  });
  const refs=sorted(selection,event=>event.title,(a,b)=>b.localeCompare(a));
  const titles=collect(selection,{select:event=>event.title});
  return {refs,titles,free:freeSlots(reservations,window),overloaded:overloaded(reservations,window,3)};
}

export function catalogueExample(){
  const items=new Map([
    ['catalog',{title:'Каталог',visible:true}],
    ['phones',{title:'Телефоны',visible:true}],
    ['books',{title:'Книги',visible:true}],
    ['hidden',{title:'Архив',visible:false}],
    ['archive',{title:'Другой корень',visible:true}],
  ]);
  const parents=from(new Map<string,string|null>([
    ['catalog',null],['phones','catalog'],['books','catalog'],['hidden','catalog'],['archive',null],
  ]));
  const catalog=tree(from(items),(_,id)=>entity(parents,id));
  const selection=subtree(catalog,'catalog');
  const refs=sorted(selection,item=>item.title,(a,b)=>a.localeCompare(b));
  // Order all selected references first, then filter/project/limit. No hidden step reordering.
  const rows=collect(subset(selection,refs),{
    where:item=>item.visible,
    select:(item,id)=>({id,title:item.title}),limit:2,
  });
  return {roots:roots(catalog),children:children(catalog,'catalog'),next:nextSibling(catalog,'phones'),refs,rows};
}
