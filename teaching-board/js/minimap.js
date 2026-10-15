import { svgEl, union } from './scene.js?v=20261015-minimap';
import { el, btn } from './ui.js?v=20261015-minimap';
import { RenderCache } from './render-cache.js?v=20261015-minimap';

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
 }
 update(){
  if(!this.open)return;
  const e=this.editor,{view,frame}=minimapFrame(e.board.items,e.board.viewport,e.area.clientWidth,e.area.clientHeight);
  this.preview.setAttribute('viewBox',`${frame.x} ${frame.y} ${frame.w} ${frame.h}`);
  this.preview.replaceChildren();this.cache.retain(e.board.items);
  for(const item of e.board.items)this.preview.append(this.cache.draw(item));
  this.preview.append(svgEl('rect',{x:view.x,y:view.y,width:view.w,height:view.h,fill:'#168fa51a',stroke:'#147d92','stroke-width':2,'vector-effect':'non-scaling-stroke','data-minimap-viewport':'true'}));
 }
 dispose(){this.cache.clear();this.root.remove();}
}
