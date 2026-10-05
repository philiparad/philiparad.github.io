export const connectorTarget=item=>!!item&&!['line','arrow'].includes(item.type);
const center=item=>[item.x+(item.w||1)/2,item.y+(item.h||1)/2];
// Intersect a center-to-center ray with the rotated object's frame. Ellipses
// use their curved edge; other objects use their rectangular bounding frame.
export function connectionAnchor(item,toward,direction=1){
 const [cx,cy]=center(item),a=(item.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
 const dx=toward[0]-cx,dy=toward[1]-cy;
 let x=dx*c+dy*s,y=-dx*s+dy*c;if(Math.hypot(x,y)<1e-8){x=direction;y=0;}
 const rx=(item.w||1)/2,ry=(item.h||1)/2;
 const ellipse=item.type==='ellipse'||item.type==='shape'&&item.shape==='ellipse';
 const scale=ellipse?1/Math.hypot(x/rx,y/ry):1/Math.max(Math.abs(x)/rx,Math.abs(y)/ry);
 x*=scale;y*=scale;return [cx+x*c-y*s,cy+x*s+y*c];
}
export function syncConnectors(items){
 const targets=new Map(items.map(i=>[i.id,i]));
 for(const i of items){
  if(!i.links)continue;
  for(const end of ['start','end'])if(i.links[end]&&!connectorTarget(targets.get(i.links[end])))i.links[end]=null;
  if(!i.links.start&&!i.links.end){delete i.links;continue;}
  const start=targets.get(i.links.start),end=targets.get(i.links.end);
  const old=i.points.map(([x,y])=>[i.x+x,i.y+y]);
  const p=start?connectionAnchor(start,end?center(end):old[1],1):old[0];
  const q=end?connectionAnchor(end,start?center(start):old[0],-1):old[1];
  const x=Math.min(p[0],q[0]),y=Math.min(p[1],q[1]);
  Object.assign(i,{x,y,w:Math.max(1,Math.abs(q[0]-p[0])),h:Math.max(1,Math.abs(q[1]-p[1])),rotation:0,points:[p,q].map(([px,py])=>[px-x,py-y])});
 }
}
