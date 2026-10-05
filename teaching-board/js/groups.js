// Flat, non-destructive groups keep each object's geometry and drawing order.
export function expandGroups(items,selected){
 const groups=new Set(items.filter(i=>selected.has(i.id)&&i.groupId).map(i=>i.groupId));
 return new Set(items.filter(i=>selected.has(i.id)||i.groupId&&groups.has(i.groupId)).map(i=>i.id));
}
export function groupLocked(items,item){return !!item.locked||!!item.groupId&&items.some(i=>i.groupId===item.groupId&&i.locked);}
export function copiedItems(items){
 const groups=new Map();return structuredClone(items).map(i=>{
  if(i.groupId){if(!groups.has(i.groupId))groups.set(i.groupId,crypto.randomUUID());i.groupId=groups.get(i.groupId);}
  return {...i,id:crypto.randomUUID(),x:i.x+30,y:i.y+30,locked:false};
 });
}
