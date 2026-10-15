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
export function normalizeGraphLinks(items){const counts=new Map();for(const i of items)if(i.type==='graph'&&i.graphLinkId)counts.set(i.graphLinkId,(counts.get(i.graphLinkId)||0)+1);for(const i of items)if(i.graphLinkId&&(counts.get(i.graphLinkId)||0)<2)delete i.graphLinkId;return items;}
export function unlinkGraphs(items,selected,isLocked=i=>!!i.locked){const chosen=items.filter(i=>selected.has(i.id)&&i.type==='graph'&&i.graphLinkId);if(!chosen.length)return false;const affected=linkedGraphs(items,new Set(chosen.map(i=>i.id)));if(affected.some(isLocked))throw new Error('Unlock all graphs in the affected sets before unlinking.');for(const i of chosen)delete i.graphLinkId;normalizeGraphLinks(items);return true;}
