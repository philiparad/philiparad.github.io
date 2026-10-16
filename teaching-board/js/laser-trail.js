import {svgEl} from './scene.js?v=20261017-history-metrics';

export function laserOptions(value={}){
 const o={color:'#f34c5e',width:5,duration:700,...value};
 if(!/^#[0-9a-f]{6}$/i.test(o.color)||!Number.isFinite(o.width)||o.width<1||o.width>24||!Number.isFinite(o.duration)||o.duration<100||o.duration>5000)throw new Error('Use thickness 1–24 and duration 0.1–5 seconds.');
 return {color:o.color,width:o.width,duration:o.duration};
}

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
 constructor(editor){this.editor=editor;this.points=[];this.frame=null;this.disposed=false;this.options=laserOptions();try{this.options=laserOptions(JSON.parse(localStorage.getItem('teaching-board-laser')||'{}'));}catch{}}
 configure(value){this.options=laserOptions(value);try{localStorage.setItem('teaching-board-laser',JSON.stringify(this.options));}catch{}this.render();}
 add(point,start=false){
  const now=performance.now();this.points.push({...point,time:now,start});
  this.points=this.points.filter(p=>now-p.time<this.options.duration).slice(-512);
  this.render(now);this.schedule();
 }
 schedule(){if(this.frame!==null||this.disposed)return;this.frame=requestAnimationFrame(now=>{this.frame=null;this.render(now);if(this.points.length)this.schedule();});}
 render(now=performance.now()){
  if(this.disposed)return;
  this.points=this.points.filter(p=>now-p.time<this.options.duration);
  this.layer?.remove();if(!this.points.length)return;
  const v=this.editor.board.viewport;
  this.layer=svgEl('g',{'pointer-events':'none','aria-hidden':'true','data-laser-trail':'true'});
  for(const {start,end,opacity}of trailSegments(this.points,now,this.options.duration)){
   this.layer.append(svgEl('line',{x1:start.x*v.zoom+v.x,y1:start.y*v.zoom+v.y,x2:end.x*v.zoom+v.x,y2:end.y*v.zoom+v.y,stroke:this.options.color,'stroke-width':this.options.width,'stroke-linecap':'round',opacity}));
  }
  this.editor.svg.append(this.layer);
 }
 dispose(){this.disposed=true;if(this.frame!==null)cancelAnimationFrame(this.frame);this.frame=null;this.points=[];this.layer?.remove();}
}
