/** Graph memberships are independent of drawing groups. Linking sets merges them. */
export function linkedGraphs(items,selected){
 const groups=new Set(items.filter(i=>i.type==='graph'&&selected.has(i.id)&&i.graphLinkId).map(i=>i.graphLinkId));
 return items.filter(i=>i.type==='graph'&&(selected.has(i.id)||groups.has(i.graphLinkId)));
}
export function linkGraphs(items,selected,isLocked=i=>!!i.locked){
 const chosen=items.filter(i=>selected.has(i.id));
 if(chosen.length<2||chosen.some(i=>i.type!=='graph'))throw new Error('Select at least two graphs to link.');
 const members=linkedGraphs(items,selected);
 if(members.some(isLocked))throw new Error('Unlock all graphs in these sets before linking.');
 const ids=new Set(members.map(i=>i.graphLinkId));if(ids.size===1&&!ids.has(undefined))return false;
 const id=crypto.randomUUID();for(const item of members)item.graphLinkId=id;return true;
}
