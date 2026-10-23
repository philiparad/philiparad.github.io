import {svgEl,union} from './scene.js?v=20261023-image-handles';
import {stretchImage} from './image-geometry.js?v=20261023-image-handles';
export const resizeHandles={nw:[0,0],n:[.5,0],ne:[1,0],e:[1,.5],se:[1,1],s:[.5,1],sw:[0,1],w:[0,.5]};
export function drawResizeHandles(scene,items,zoom){
 const b=union(items),pad=8/zoom,size=10/zoom;
 for(const [name,[u,v]] of Object.entries(resizeHandles)){
  const x=b.x+b.w*u+(u-.5)*2*pad,y=b.y+b.h*v+(v-.5)*2*pad;
  const n=svgEl('rect',{x:x-size/2,y:y-size/2,width:size,height:size,rx:2/zoom,fill:'#8acb43',stroke:'#5c8f2b','stroke-width':1/zoom,'data-resize':name,cursor:`${name}-resize`,'aria-label':`Resize ${name}`});scene.append(n);
 }
}
export function beginResize(items,handle,start){return {kind:'resize',items:structuredClone(items),handle,b:union(items),start};}
export function resizeItems(board,d,p,shift=false){
 const [u,v]=resizeHandles[d.handle]||resizeHandles.se,b=d.b,dx=p.x-d.start.x,dy=p.y-d.start.y;
 let sx=u===.5?1:1+dx/(b.w*(u===0?-1:1)),sy=v===.5?1:1+dy/(b.h*(v===0?-1:1));
 const proportional=d.items.some(i=>['image','shape','equation','graph'].includes(i.type)||i.groupId);
 if(u!==.5&&v!==.5&&proportional!==shift){const scale=(sx*b.w*b.w+sy*b.h*b.h)/(b.w*b.w+b.h*b.h);sx=sy=scale;}
 // Crossing the anchor flips images. Keep the geometry nonsingular at the anchor.
 const floor=(s,n)=>Math.sign(s||1)*Math.max(1/n,Math.abs(s));
 if(d.items.every(i=>i.type==='image')){sx=floor(sx,b.w);sy=floor(sy,b.h);}else{sx=Math.max(1/b.w,sx);sy=Math.max(1/b.h,sy);}
 const ax=b.x+b.w*(u===0?1:0),ay=b.y+b.h*(v===0?1:0);
 for(const old of d.items){
  const item=board.items.find(i=>i.id===old.id);if(!item)continue;
  const cx=ax+(old.x+old.w/2-ax)*sx,cy=ay+(old.y+old.h/2-ay)*sy;
  if(old.type==='image'){stretchImage(item,old,sx,sy,cx,cy);continue;}
  item.w=old.w*sx;item.h=old.h*sy;item.x=cx-item.w/2;item.y=cy-item.h/2;
  if(old.points)item.points=old.points.map(([x,y])=>[x*sx,y*sy]);
  if(old.rawPoints)item.rawPoints=old.rawPoints.map(([x,y])=>[x*sx,y*sy]);
  if(['text','note'].includes(item.type))item.fontSize=(old.fontSize||26)*Math.min(sx,sy);
 }
}

export function drawRotationHandle(scene,items,zoom,drag){
 const b=union(items),center={x:b.x+b.w/2,y:b.y+b.h/2},top=b.y-33/zoom;
 const active=drag?.kind==='rotate',p=active?drag.current:{x:center.x,y:top};
 if(active){
  const c=drag.center,start=drag.handleStart,r=28/zoom,a0=Math.atan2(start.y-c.y,start.x-c.x),a1=a0+(drag.angle||0)*Math.PI/180;
  const guide=svgEl('g',{'pointer-events':'none','data-angle-guide':'true'});
  guide.append(svgEl('path',{d:`M${start.x} ${start.y} L${c.x} ${c.y} L${p.x} ${p.y}`,fill:'none',stroke:'#4b8ac9','stroke-width':1/zoom,'stroke-dasharray':`${4/zoom} ${3/zoom}`}));
  guide.append(svgEl('path',{d:`M${c.x+r*Math.cos(a0)} ${c.y+r*Math.sin(a0)} A${r} ${r} 0 ${Math.abs(drag.angle)>180?1:0} ${drag.angle>=0?1:0} ${c.x+r*Math.cos(a1)} ${c.y+r*Math.sin(a1)}`,fill:'none',stroke:'#4b8ac9','stroke-width':1.5/zoom}));
  const label=svgEl('text',{x:c.x+36/zoom,y:c.y-12/zoom,fill:'#235886','font-size':14/zoom,'paint-order':'stroke',stroke:'white','stroke-width':3/zoom});label.textContent=`${Math.round((drag.angle||0)*10)/10}°`;guide.append(label);scene.append(guide);
 }
 scene.append(svgEl('circle',{cx:p.x,cy:p.y,r:5/zoom,fill:'#528fcb',stroke:'#2d6296','stroke-width':1/zoom,'data-rotate':'true',cursor:'grab','aria-label':'Rotate selection'}));
}
export function beginRotation(items,start,zoom){
 const b=union(items),center={x:b.x+b.w/2,y:b.y+b.h/2},handleStart={x:b.x+b.w/2,y:b.y-33/zoom};
 return {kind:'rotate',items:structuredClone(items),center,start,handleStart,current:handleStart,angle:0};
}
export function rotateItems(board,d,p,shift=false){
 const c=d.center,q={x:p.x+d.handleStart.x-d.start.x,y:p.y+d.handleStart.y-d.start.y};
 if(Math.hypot(q.x-c.x,q.y-c.y)<1e-8)return;
 const from=Math.atan2(d.handleStart.y-c.y,d.handleStart.x-c.x);
 let to=Math.atan2(q.y-c.y,q.x-c.x);if(shift)to=Math.round(to/(Math.PI/36))*Math.PI/36;
 const angle=Math.atan2(Math.sin(to-from),Math.cos(to-from)),co=Math.cos(angle),si=Math.sin(angle);
 d.angle=angle*180/Math.PI;const radius=Math.hypot(q.x-c.x,q.y-c.y);d.current={x:c.x+radius*Math.cos(to),y:c.y+radius*Math.sin(to)};
 for(const old of d.items){const item=board.items.find(i=>i.id===old.id);if(!item)continue;const dx=old.x+old.w/2-c.x,dy=old.y+old.h/2-c.y;item.x=c.x+dx*co-dy*si-old.w/2;item.y=c.y+dx*si+dy*co-old.h/2;item.rotation=(old.rotation||0)+d.angle;}
}
