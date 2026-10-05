import { IncrementalInk } from './ink.js?v=20261005-viewport';

// Missing pressure is neutral; pointerup often reports zero after contact ends.
export function penPressure(event,fallback=.5){
 return Number.isFinite(event?.pressure)&&event.pressure>0?Math.min(1,event.pressure):fallback;
}
export const pressureRadius=(width,pressure)=>width*(.25+1.5*pressure)/2;

export function resmoothPressure(item,strength){
 const ink=new IncrementalInk(item.rawPoints[0],strength,item.inkZoom||1,item.rawPressures[0]);
 for(let k=1;k<item.rawPoints.length;k++)ink.add(item.rawPoints[k],item.rawPressures[k]);
 item.points=ink.finish();item.pressures=[...ink.pressures];
}

// One nonzero-filled SVG path contains round footprints and tangent bridges.
// Overlaps are filled once, so translucent ink has no dark seams. All subpaths
// use the same winding; tight turns and reversals cannot open holes in the ink.
export function pressurePathD(points,pressures,width){
 const fmt=n=>Number(n.toFixed(4)),xy=p=>p.map(fmt).join(' ');
 let d='';
 for(let i=0;i<points.length;i++){
  const p=points[i],r=pressureRadius(width,pressures[i]);
  d+=`M${fmt(p[0]+r)} ${fmt(p[1])}a${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(-2*r)} 0a${fmt(r)} ${fmt(r)} 0 1 1 ${fmt(2*r)} 0Z`;
  if(!i)continue;
  const a=points[i-1],ra=pressureRadius(width,pressures[i-1]),dx=p[0]-a[0],dy=p[1]-a[1],length=Math.hypot(dx,dy);
  if(length<=Math.abs(ra-r)+1e-8)continue; // One footprint contains the other.
  const ux=dx/length,uy=dy/length,c=(ra-r)/length,h=Math.sqrt(Math.max(0,1-c*c));
  const n1=[ux*c-uy*h,uy*c+ux*h],n2=[ux*c+uy*h,uy*c-ux*h];
  const offset=(q,n,radius)=>[q[0]+n[0]*radius,q[1]+n[1]*radius];
  d+=`M${xy(offset(a,n2,ra))}L${xy(offset(p,n2,r))}L${xy(offset(p,n1,r))}L${xy(offset(a,n1,ra))}Z`;
 }
 return d;
}
