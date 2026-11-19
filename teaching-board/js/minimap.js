import { backgroundOptions } from './background-options.js?v=20261119-perf009';
import { svgEl, union, bounds } from './scene.js?v=20261119-perf009';
import { pageRect } from './pages.js?v=20261119-perf009';
import { el, btn } from './ui.js?v=20261119-perf009';
import { RenderCache } from './render-cache.js?v=20261119-perf009';

export function centeredViewport(viewport, point, width, height) {
 return {zoom:viewport.zoom,x:width/2-point.x*viewport.zoom,y:height/2-point.y*viewport.zoom};
}

// Include the visible workspace even when all lesson content is off screen.
export function minimapFrame(items, viewport, width, height, pages=[]) {
 const view={x:-viewport.x/viewport.zoom,y:-viewport.y/viewport.zoom,w:Math.max(1,width)/viewport.zoom,h:Math.max(1,height)/viewport.zoom};
 const all=[...items,...pages];const content=all.length?union(all):view;
 const left=Math.min(content.x,view.x),top=Math.min(content.y,view.y);
 const right=Math.max(content.x+content.w,view.x+view.w),bottom=Math.max(content.y+content.h,view.y+view.h);
 const padding=Math.max(right-left,bottom-top)*.05;
 return {view,frame:{x:left-padding,y:top-padding,w:right-left+padding*2,h:bottom-top+padding*2}};
}

export function overviewPath(items){
 return items.map(item=>{const b=bounds(item);return `M${b.x} ${b.y}h${Math.max(1,b.w)}v${Math.max(1,b.h)}h${-Math.max(1,b.w)}Z`;}).join('');
}

export class Minimap {
 constructor(editor){
  this.editor=editor;this.cache=new RenderCache();
  this.itemNodes=new Map();this.initialized=false;this.dragPreviewDirty=false;
  this.root=el('div',null,'minimap');
  this.preview=svgEl('svg',{id:'board-minimap',role:'img','aria-label':'Lesson overview with current viewport'});
  this.toggle=btn('Minimap',()=>{this.open=!this.open;this.preview.style.display=this.open?'block':'none';this.toggle.setAttribute('aria-expanded',String(this.open));if(this.open)this.update();else this.resetOverview();});
  this.toggle.setAttribute('aria-controls','board-minimap');this.toggle.setAttribute('aria-expanded','false');
  this.preview.style.display='none';this.root.append(this.toggle,this.preview);
  this.content=svgEl('g',{'pointer-events':'none'});this.viewportNode=svgEl('rect',{'data-minimap-viewport':'true',fill:'#168fa51a',stroke:'#147d92','stroke-width':2,'vector-effect':'non-scaling-stroke'});
  this.preview.append(this.content,this.viewportNode);
  this.preview.style.pointerEvents='auto';this.preview.style.touchAction='none';this.preview.style.cursor='crosshair';
  this.preview.setAttribute('tabindex','0');
  this.preview.setAttribute('aria-label','Lesson overview: click to navigate, drag viewport, or use arrow keys');
  this.preview.onpointerdown=event=>{
   if(event.button!==0)return;
   event.preventDefault();event.stopPropagation();this.preview.focus();
   const matrix=this.preview.getScreenCTM();if(!matrix)return;
   const inverse=matrix.inverse(),point=new DOMPoint(event.clientX,event.clientY).matrixTransform(inverse);
   const e=this.editor,v=e.board.viewport;
   const inside=event.target.hasAttribute('data-minimap-viewport');
   this.drag={id:event.pointerId,inverse,start:point,viewport:{...v},frame:this.frame};
   this.preview.setPointerCapture(event.pointerId);
   if(!inside){e.board.viewport=centeredViewport(v,point,e.area.clientWidth,e.area.clientHeight);this.drag.viewport={...e.board.viewport};e.paint();}
  };
  this.preview.onpointermove=event=>{
   const d=this.drag;if(!d||d.id!==event.pointerId)return;
   const point=new DOMPoint(event.clientX,event.clientY).matrixTransform(d.inverse);
   this.editor.board.viewport={...d.viewport,x:d.viewport.x-(point.x-d.start.x)*d.viewport.zoom,y:d.viewport.y-(point.y-d.start.y)*d.viewport.zoom};
   this.editor.requestPaint();
  };
  const finish=event=>{if(this.drag?.id!==event.pointerId)return;this.drag=null;this.editor.save();this.editor.paint();};
  this.preview.onpointerup=finish;this.preview.onpointercancel=finish;this.preview.onlostpointercapture=finish;
  this.preview.onkeydown=event=>{
   const directions={ArrowLeft:[1,0],ArrowRight:[-1,0],ArrowUp:[0,1],ArrowDown:[0,-1]};
   const direction=directions[event.key];if(!direction)return;
   event.preventDefault();event.stopPropagation();const e=this.editor;
   e.board.viewport.x+=direction[0]*e.area.clientWidth*.2;e.board.viewport.y+=direction[1]*e.area.clientHeight*.2;e.paint();e.save();
  };
 }
 // Heavy overview drawing changes only for edits or layout changes.
 // A pan updates just the viewport rectangle; moves patch selected items.
 resetOverview(){
  this.cache.clear();this.itemNodes.clear();this.content.replaceChildren();
  this.initialized=false;this.dragPreviewDirty=false;this.stamp=null;
 }
 rebuildOverview(){
  const e=this.editor,items=e.board.items;
  this.stamp=e.history.current;this.pageCount=e.board.pageCount;
  this.layout=e.board.layout;
  const pages=e.board.layout==='a4'?
   Array.from({length:e.board.pageCount||1},(_,i)=>pageRect(i)):[];
  const content=[...items,...pages];
  this.overviewBounds=content.length?[union(content)]:[];
  this.content.replaceChildren();this.itemNodes.clear();
  const pageColor=backgroundOptions(e.board.background,e.board.backgroundOptions).color;
  for(const p of pages)this.content.append(svgEl('rect',{
   x:p.x,y:p.y,width:p.w,height:p.h,fill:pageColor,
   stroke:'#8b9bab','stroke-width':1,'vector-effect':'non-scaling-stroke'
  }));
  this.simplified=items.length>300;
  if(this.simplified){
   this.cache.clear();
   this.content.append(svgEl('path',{
    d:overviewPath(items),fill:'#63758a44',stroke:'#63758a',
    'stroke-width':.5,'vector-effect':'non-scaling-stroke',
    'data-simplified-overview':'true'
   }));
  }else{
   this.cache.retain(items);
   for(const item of items){
    const node=this.cache.draw(item);
    this.content.append(node);this.itemNodes.set(item.id,node);
   }
  }
  this.initialized=true;this.dragPreviewDirty=false;
 }
 updateDraggedItems(drag){
  // For boards with over 300 objects, keep the simplified overview fixed
  // until the gesture is committed, avoiding O(n) path rebuilds per frame.
  if(this.simplified||!['move','resize','rotate'].includes(drag.kind))return;
  const ids=new Set((drag.items||[]).map(item=>item.id));
  if(!ids.size)return;
  for(const item of this.editor.board.items){
   if(!ids.has(item.id))continue;
   const previous=this.itemNodes.get(item.id);
   if(!previous)continue;
   // RenderCache.draw updates transforms on the existing SVG group.
   const next=this.cache.draw(item);
   if(next!==previous){
    previous.replaceWith(next);
    this.itemNodes.set(item.id,next);
   }
  }
  // A cancelled gesture has no History commit: restore it exactly once
  // when editing ends, even if the document revision never changed.
  this.dragPreviewDirty=true;
 }
 update(){
  if(!this.open)return;
  const e=this.editor,drag=e.drag;
  const changed=!this.initialized||this.stamp!==e.history.current||
   this.pageCount!==e.board.pageCount||this.layout!==e.board.layout;
  if(changed||!drag&&this.dragPreviewDirty)this.rebuildOverview();
  else if(drag)this.updateDraggedItems(drag);
  const result=minimapFrame(this.overviewBounds||[],e.board.viewport,
   e.area.clientWidth,e.area.clientHeight);
  const view=result.view,frame=this.drag?.frame||result.frame;
  this.frame=frame;
  this.preview.setAttribute('viewBox',
   `${frame.x} ${frame.y} ${frame.w} ${frame.h}`);
  for(const [key,value] of Object.entries({
   x:view.x,y:view.y,width:view.w,height:view.h
  }))this.viewportNode.setAttribute(key,value);
 }
 dispose(){this.resetOverview();this.root.remove();}
}
