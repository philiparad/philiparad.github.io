import { svgEl } from './scene.js?v=20260927-feature5';
import { formDialog, notify } from './ui.js?v=20260927-feature5';
export const radians=degrees=>degrees*Math.PI/180;
export const degrees=radians=>radians*180/Math.PI;
export function arcPoint(item,angle){return [item.w/2+item.w/2*Math.cos(radians(angle)),item.h/2+item.h/2*Math.sin(radians(angle))];}
export function arcPath(item){const a=arcPoint(item,item.startAngle),end=arcPoint(item,item.startAngle+item.sweepAngle),rx=item.w/2,ry=item.h/2,dir=item.sweepAngle>=0?1:0;if(Math.abs(item.sweepAngle)>=359.999){const mid=arcPoint(item,item.startAngle+item.sweepAngle/2);return `M${a} A${rx},${ry} 0 1 ${dir} ${mid} A${rx},${ry} 0 1 ${dir} ${a}`;}return `M${a} A${rx},${ry} 0 ${Math.abs(item.sweepAngle)>180?1:0} ${dir} ${end}`;}
export function localPoint(item,p){const a=-radians(item.rotation||0),x=p.x-item.x-item.w/2,y=p.y-item.y-item.h/2;return {x:x*Math.cos(a)-y*Math.sin(a)+item.w/2,y:x*Math.sin(a)+y*Math.cos(a)+item.h/2};}
export function curvePath(points){if(!points.length)return '';let d='M'+points[0];for(let k=0;k<points.length-1;k++){const a=points[Math.max(0,k-1)],b=points[k],c=points[k+1],z=points[Math.min(points.length-1,k+2)];d+=` C${b[0]+(c[0]-a[0])/6},${b[1]+(c[1]-a[1])/6} ${c[0]-(z[0]-b[0])/6},${c[1]-(z[1]-b[1])/6} ${c}`;}return d;}
export function normalizeCurve(item){const a=radians(item.rotation||0),cx=item.x+item.w/2,cy=item.y+item.h/2;const points=item.points.map(([x,y])=>[cx+(x-item.w/2)*Math.cos(a)-(y-item.h/2)*Math.sin(a),cy+(x-item.w/2)*Math.sin(a)+(y-item.h/2)*Math.cos(a)]);const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys);Object.assign(item,{x,y,w:Math.max(1,Math.max(...xs)-x),h:Math.max(1,Math.max(...ys)-y),rotation:0,points:points.map(p=>[p[0]-x,p[1]-y])});}
export class Geometry {
 constructor(editor){this.e=editor;this.reset();}
 reset(){this.stage=null;this.edit=null;}
 down(event,p){const e=this.e,handle=event.target.getAttribute('data-geometry');
  if(handle&&e.tool==='select'){const item=e.board.items.find(i=>e.selected.has(i.id));if(!item||item.locked)return false;this.edit={item,handle};if(handle.startsWith('mid:')){const k=+handle.split(':')[1],a=item.points[k],b=item.points[k+1];item.points.splice(k+1,0,[(a[0]+b[0])/2,(a[1]+b[1])/2]);this.edit.handle='point:'+(k+1);}return true;}
  if(e.tool==='curve'){if(!e.draft){e.draft={...e.base('curve',p),points:[[0,0]],fill:'none'};}else e.draft.points.push([p.x-e.draft.x,p.y-e.draft.y]);e.paint();e.toolHint.textContent='Click anchors · Enter finishes · Escape cancels';return true;}
  if(e.tool!=='arc')return false;
  if(!this.stage){this.stage={center:p,step:1};e.draft={...e.base('arc',p),w:2,h:2,startAngle:0,sweepAngle:90,showRadii:false};e.toolHint.textContent='Click the radius/start point · Escape cancels';}
  else if(this.stage.step===1){this.move(event,p);this.stage.step=2;e.toolHint.textContent='Click the end angle · Shift snaps to 15° · Edit content for precise values';}
  else{this.move(event,p);e.board.items.push(e.draft);e.selected=new Set([e.draft.id]);e.draft=null;this.reset();e.setTool('select');e.commit();}
  e.paint();return true;
 }
 move(event,p){const e=this.e;
  if(this.edit){const {item,handle}=this.edit,q=localPoint(item,p);if(handle.startsWith('point:')){item.points[+handle.split(':')[1]]=[q.x,q.y];e.paint();return true;}const a=degrees(Math.atan2((q.y-item.h/2)/(item.h/2),(q.x-item.w/2)/(item.w/2))),angle=event.shiftKey?Math.round(a/15)*15:a;
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
 up(){if(!this.edit)return false;if(this.edit.item.type==='curve')normalizeCurve(this.edit.item);this.edit=null;this.e.commit();return true;}
 paint(scene){const e=this.e;if(e.tool!=='select'||e.selected.size!==1)return;const i=e.board.items.find(i=>e.selected.has(i.id));if(!i||i.locked||!['arc','curve'].includes(i.type))return;
  const g=svgEl('g',{transform:`translate(${i.x} ${i.y}) rotate(${i.rotation||0} ${i.w/2} ${i.h/2})`});
  const handles=i.type==='curve'?i.points.flatMap((p,k)=>{const next=i.points[k+1];return [[`point:${k}`,p,'#bd559a'],...(next?[[`mid:${k}`,[(p[0]+next[0])/2,(p[1]+next[1])/2],'#9cb3c6']]:[])];}):[['start',arcPoint(i,i.startAngle),'#087da6'],['end',arcPoint(i,i.startAngle+i.sweepAngle),'#bd559a'],['radius',[i.w/2,i.h],'#399575']];
  for(const [name,p,color] of handles){const h=svgEl('circle',{cx:p[0],cy:p[1],r:6/e.board.viewport.zoom,fill:color,stroke:'#fff','stroke-width':1/e.board.viewport.zoom,'data-geometry':name,cursor:'crosshair'});const title=svgEl('title');title.textContent=`Drag arc ${name}`;h.append(title);g.append(h);}scene.append(g);
 }
 finishCurve(){const e=this.e;if(!e.draft||e.draft.type!=='curve'||e.draft.points.length<2){notify('Place at least two curve anchors.');return;}normalizeCurve(e.draft);e.board.items.push(e.draft);e.selected=new Set([e.draft.id]);e.draft=null;e.setTool('select');e.commit();}
 doubleClick(event){const name=event.target.getAttribute('data-geometry');if(!name?.startsWith('point:'))return false;const e=this.e,i=e.board.items.find(i=>e.selected.has(i.id));if(!i||i.locked||i.type!=='curve')return false;if(i.points.length<=2){notify('A curve needs at least two anchors.');return true;}i.points.splice(+name.split(':')[1],1);normalizeCurve(i);e.commit();return true;}
 async editArc(item){const r=await formDialog('Compass / arc',[['radius','Radius (board units)',item.w/2,'number'],['start','Start angle (degrees, clockwise)',item.startAngle,'number'],['sweep','Sweep (−360 to 360 degrees)',item.sweepAngle,'number'],['radii','Show radius lines (yes/no)',item.showRadii?'yes':'no']],{note:'0° points right; 90° points down. A negative sweep runs counterclockwise.',validate:v=>{const radius=+v.radius,start=+v.start,sweep=+v.sweep;if(![radius,start,sweep].every(Number.isFinite)||radius<2||radius>50000||!sweep||Math.abs(sweep)>360)throw new Error('Use a radius from 2–50,000 and a nonzero sweep up to 360°.');return {radius,start,sweep,radii:v.radii.toLowerCase()==='yes'};}});if(!r||this.e.disposed)return;const cx=item.x+item.w/2,cy=item.y+item.h/2;Object.assign(item,{x:cx-r.radius,y:cy-r.radius,w:r.radius*2,h:r.radius*2,startAngle:r.start,sweepAngle:r.sweep,showRadii:r.radii});this.e.commit();}
}
