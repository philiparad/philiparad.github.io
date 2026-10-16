import { svgEl, union } from './scene.js?v=20261015-minimap';
import { el, btn } from './ui.js?v=20261015-minimap';
import { RenderCache } from './render-cache.js?v=20261015-minimap';

export function centeredViewport(viewport, point, width, height) {
 return {zoom:viewport.zoom,x:width/2-point.x*viewport.zoom,y:height/2-point.y*viewport.zoom};
}

// Include the visible workspace even when all lesson content is off screen.
export function minimapFrame(items, viewport, width, height) {
 const view={x:-viewport.x/viewport.zoom,y:-viewport.y/viewport.zoom,w:Math.max(1,width)/viewport.zoom,h:Math.max(1,height)/viewport.zoom};
 const content=items.length?union(items):view;
 const left=Math.min(content.x,view.x),top=Math.min(content.y,view.y);
 const right=Math.max(content.x+content.w,view.x+view.w),bottom=Math.max(content.y+content.h,view.y+view.h);
 const padding=Math.max(right-left,bottom-top)*.05;
 return {view,frame:{x:left-padding,y:top-padding,w:right-left+padding*2,h:bottom-top+padding*2}};
}

export class Minimap {
 constructor(editor){
  this.editor=editor;this.cache=new RenderCache();
  this.root=el('div',null,'minimap');
  this.preview=svgEl('svg',{id:'board-minimap',role:'img','aria-label':'Lesson overview with current viewport'});
  this.toggle=btn('Minimap',()=>{this.open=!this.open;this.preview.style.display=this.open?'block':'none';this.toggle.setAttribute('aria-expanded',String(this.open));if(this.open)this.update();else this.cache.clear();});
  this.toggle.setAttribute('aria-controls','board-minimap');this.toggle.setAttribute('aria-expanded','false');
  this.preview.style.display='none';this.root.append(this.toggle,this.preview);
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
 update(){
  if(!this.open)return;
  const e=this.editor,result=minimapFrame(e.board.items,e.board.viewport,e.area.clientWidth,e.area.clientHeight);
  const view=result.view,frame=this.drag?.frame||result.frame;this.frame=frame;
  this.preview.setAttribute('viewBox',`${frame.x} ${frame.y} ${frame.w} ${frame.h}`);
  this.preview.replaceChildren();this.cache.retain(e.board.items);
  for(const item of e.board.items)this.preview.append(this.cache.draw(item));
  this.preview.append(svgEl('rect',{x:view.x,y:view.y,width:view.w,height:view.h,fill:'#168fa51a',stroke:'#147d92','stroke-width':2,'vector-effect':'non-scaling-stroke','data-minimap-viewport':'true'}));
 }
 dispose(){this.cache.clear();this.root.remove();}
}
