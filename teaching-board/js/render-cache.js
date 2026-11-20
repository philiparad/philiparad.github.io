import {imageSVGTransform} from './image-geometry.js?v=20261120-perf017';
import {drawItem, textObjectHeight} from './scene.js?v=20261120-perf017';

// PERF-002: compare only shallow visual properties on a repaint. Large ink paths,
// formatted text, and base64 image data must never be serialized per frame.
// Changes inside an existing array/object require invalidate(id) at the edit site.
const NON_VISUAL=new Set(['id','x','y','rotation','opacity','locked','rawPoints','rawPressures','source']);
function sameVisual(item,snapshot){
 if(!snapshot)return false;
 let count=0;
 for(const key of Object.keys(item)){
  if(NON_VISUAL.has(key))continue;
  if(!Object.hasOwn(snapshot,key)||!Object.is(snapshot[key],item[key]))return false;
  count++;
 }
 return count===Object.keys(snapshot).length;
}
function snapshotVisual(item){
 const snapshot=Object.create(null);
 for(const key of Object.keys(item))if(!NON_VISUAL.has(key))snapshot[key]=item[key];
 return snapshot;
}

// Export and print still build independent SVG from the complete board model.
export class RenderCache {
 constructor(render=drawItem){this.entries=new Map();this.render=render;}
 draw(item){
  const {id,x,y,rotation,opacity}=item;
  let entry=this.entries.get(id);
  if(!entry||!sameVisual(item,entry.visual)){
   entry={visual:snapshotVisual(item),node:this.render(item)};
   this.entries.set(id,entry);
  }
  const w=item.w||1,h=textObjectHeight(item);
  entry.node.setAttribute('transform',item.type==='image'?imageSVGTransform(item):`translate(${x} ${y}) rotate(${rotation||0} ${w/2} ${h/2})`);
  entry.node.setAttribute('opacity',opacity??1);
  return entry.node;
 }
 // In-place edits of nested visual data (points, pressures, rich text, crops)
 // have stable references; explicitly discard their rendered nodes.
 invalidate(id){this.entries.delete(id);}
 invalidateMany(ids){for(const id of ids)this.invalidate(id);}
 retain(items){
  const ids=new Set(items.map(item=>item.id));
  for(const id of this.entries.keys())if(!ids.has(id))this.entries.delete(id);
 }
 clear(){this.entries.clear();}
}
