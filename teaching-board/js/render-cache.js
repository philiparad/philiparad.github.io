import { drawItem } from './scene.js?v=20261006-snippets';

// Editor-only cache: exports always render the complete model independently.
// Comparing serialized visual data also detects in-place curve/crop edits and
// restored history snapshots. Raw input samples are not part of the drawing.
export class RenderCache {
 constructor(render=drawItem){this.entries=new Map();this.render=render;}
 draw(item){
  const {id,x,y,rotation,opacity,locked,rawPoints,rawPressures,source,...visual}=item;
  const key=JSON.stringify(visual);
  let entry=this.entries.get(id);
  if(!entry||entry.key!==key){entry={key,node:this.render(item)};this.entries.set(id,entry);}
  const w=item.w||1,h=item.h||1;
  entry.node.setAttribute('transform',`translate(${x} ${y}) rotate(${rotation||0} ${w/2} ${h/2})`);
  entry.node.setAttribute('opacity',opacity??1);
  return entry.node;
 }
 retain(items){
  const ids=new Set(items.map(item=>item.id));
  for(const id of this.entries.keys())if(!ids.has(id))this.entries.delete(id);
 }
 clear(){this.entries.clear();}
}
