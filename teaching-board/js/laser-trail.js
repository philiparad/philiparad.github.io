import {svgEl} from './scene.js?v=20261017-trail';

export function trailSegments(points,now,duration=700){
 const segments=[];
 for(let i=0;i<points.length;i++){
  const end=points[i],opacity=Math.max(0,1-(now-end.time)/duration);
  if(opacity<=0)continue;
  const start=i&&!end.start?points[i-1]:end;
  segments.push({start,end,opacity:Math.min(1,opacity)});
 }
 return segments;
}

export class LaserTrail{
 constructor(editor){this.editor=editor;this.points=[];this.frame=null;this.disposed=false;}
 add(point,start=false){
  const now=performance.now();this.points.push({...point,time:now,start});
  this.points=this.points.filter(p=>now-p.time<700).slice(-512);
  this.render(now);this.schedule();
 }
 schedule(){if(this.frame!==null||this.disposed)return;this.frame=requestAnimationFrame(now=>{this.frame=null;this.render(now);if(this.points.length)this.schedule();});}
 render(now=performance.now()){
  if(this.disposed)return;
  this.points=this.points.filter(p=>now-p.time<700);
  this.layer?.remove();if(!this.points.length)return;
  const v=this.editor.board.viewport;
  this.layer=svgEl('g',{'pointer-events':'none','aria-hidden':'true','data-laser-trail':'true'});
  for(const {start,end,opacity}of trailSegments(this.points,now)){
   this.layer.append(svgEl('line',{x1:start.x*v.zoom+v.x,y1:start.y*v.zoom+v.y,x2:end.x*v.zoom+v.x,y2:end.y*v.zoom+v.y,stroke:'#f34c5e','stroke-width':5,'stroke-linecap':'round',opacity}));
  }
  this.editor.svg.append(this.layer);
 }
 dispose(){this.disposed=true;if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;this.points=[];this.layer?.remove();}
}
