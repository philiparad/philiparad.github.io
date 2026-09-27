import { svgEl } from './scene.js?v=20260927-feature1';
import { formDialog, notify } from './ui.js?v=20260927-feature1';
export const radians=degrees=>degrees*Math.PI/180;
export const degrees=radians=>radians*180/Math.PI;
export function arcPoint(item,angle){return [item.w/2+item.w/2*Math.cos(radians(angle)),item.h/2+item.h/2*Math.sin(radians(angle))];}
export function arcPath(item){const a=arcPoint(item,item.startAngle),end=arcPoint(item,item.startAngle+item.sweepAngle),rx=item.w/2,ry=item.h/2,dir=item.sweepAngle>=0?1:0;if(Math.abs(item.sweepAngle)>=359.999){const mid=arcPoint(item,item.startAngle+item.sweepAngle/2);return `M${a} A${rx},${ry} 0 1 ${dir} ${mid} A${rx},${ry} 0 1 ${dir} ${a}`;}return `M${a} A${rx},${ry} 0 ${Math.abs(item.sweepAngle)>180?1:0} ${dir} ${end}`;}
export function localPoint(item,p){const a=-radians(item.rotation||0),x=p.x-item.x-item.w/2,y=p.y-item.y-item.h/2;return {x:x*Math.cos(a)-y*Math.sin(a)+item.w/2,y:x*Math.sin(a)+y*Math.cos(a)+item.h/2};}
export class Geometry {
 constructor(editor){this.e=editor;this.reset();}
 reset(){this.stage=null;this.edit=null;}
 down(event,p){const e=this.e,handle=event.target.getAttribute('data-geometry');
  if(handle&&e.tool==='select'){const item=e.board.items.find(i=>e.selected.has(i.id));if(!item||item.locked)return false;this.edit={item,handle};return true;}
  if(e.tool!=='arc')return false;
  if(!this.stage){this.stage={center:p,step:1};e.draft={...e.base('arc',p),w:2,h:2,startAngle:0,sweepAngle:90,showRadii:false};e.toolHint.textContent='Click the radius/start point · Escape cancels';}
  else if(this.stage.step===1){this.move(event,p);this.stage.step=2;e.toolHint.textContent='Click the end angle · Shift snaps to 15° · Edit content for precise values';}
  else{this.move(event,p);e.board.items.push(e.draft);e.selected=new Set([e.draft.id]);e.draft=null;this.reset();e.setTool('select');e.commit();}
  e.paint();return true;
 }
 move(event,p){const e=this.e;
  if(this.edit){const {item,handle}=this.edit,q=localPoint(item,p),a=degrees(Math.atan2((q.y-item.h/2)/(item.h/2),(q.x-item.w/2)/(item.w/2))),angle=event.shiftKey?Math.round(a/15)*15:a;
   if(handle==='start')item.startAngle=angle;
   if(handle==='end')item.sweepAngle=((angle-item.startAngle)%360+360)%360||360;
   if(handle==='radius'){const r=Math.max(2,Math.hypot(q.x-item.w/2,q.y-item.h/2)),cx=item.x+item.w/2,cy=item.y+item.h/2;item.w=item.h=2*r;item.x=cx-r;item.y=cy-r;}
   e.paint();return true;}
  if(!this.stage||e.tool!=='arc'||!e.draft)return false;
  const i=e.draft,c=this.stage.center;let a=degrees(Math.atan2(p.y-c.y,p.x-c.x));if(event.shiftKey)a=Math.round(a/15)*15;
  if(this.stage.step===1){const r=Math.max(2,Math.hypot(p.x-c.x,p.y-c.y));Object.assign(i,{x:c.x-r,y:c.y-r,w:2*r,h:2*r,startAngle:a});}
  else i.sweepAngle=((a-i.startAngle)%360+360)%360||360;
  e.paint();return true;
 }
 up(){if(!this.edit)return false;this.edit=null;this.e.commit();return true;}
 paint(scene){const e=this.e;if(e.tool!=='select'||e.selected.size!==1)return;const i=e.board.items.find(i=>e.selected.has(i.id));if(!i||i.locked||i.type!=='arc')return;
  const g=svgEl('g',{transform:`translate(${i.x} ${i.y}) rotate(${i.rotation||0} ${i.w/2} ${i.h/2})`});
  for(const [name,p,color] of [['start',arcPoint(i,i.startAngle),'#087da6'],['end',arcPoint(i,i.startAngle+i.sweepAngle),'#bd559a'],['radius',[i.w/2,i.h],'#399575']]){const h=svgEl('circle',{cx:p[0],cy:p[1],r:6/e.board.viewport.zoom,fill:color,stroke:'#fff','stroke-width':1/e.board.viewport.zoom,'data-geometry':name,cursor:'crosshair'});const title=svgEl('title');title.textContent=`Drag arc ${name}`;h.append(title);g.append(h);}scene.append(g);
 }
 async editArc(item){const r=await formDialog('Compass / arc',[['radius','Radius (board units)',item.w/2,'number'],['start','Start angle (degrees, clockwise)',item.startAngle,'number'],['sweep','Sweep (−360 to 360 degrees)',item.sweepAngle,'number'],['radii','Show radius lines (yes/no)',item.showRadii?'yes':'no']],{note:'0° points right; 90° points down. A negative sweep runs counterclockwise.',validate:v=>{const radius=+v.radius,start=+v.start,sweep=+v.sweep;if(![radius,start,sweep].every(Number.isFinite)||radius<2||radius>50000||!sweep||Math.abs(sweep)>360)throw new Error('Use a radius from 2–50,000 and a nonzero sweep up to 360°.');return {radius,start,sweep,radii:v.radii.toLowerCase()==='yes'};}});if(!r||this.e.disposed)return;const cx=item.x+item.w/2,cy=item.y+item.h/2;Object.assign(item,{x:cx-r.radius,y:cy-r.radius,w:r.radius*2,h:r.radius*2,startAngle:r.start,sweepAngle:r.sweep,showRadii:r.radii});this.e.commit();}
}
