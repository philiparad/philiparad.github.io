import { SHAPES } from './shapes.js?v=20261005-groups';

// Conservative geometry bounds, independent of the DOM. Text can overflow its
// nominal box (long words, RTL and font metrics), so keep text/notes mounted.
export function visualBounds(item){
 const w=item.w||1,h=item.h||1;
 let left=0,top=0,right=w,bottom=h;
 if(['text','note'].includes(item.type))return null;
 if(item.points&&['path','curve','polygon','line','arrow'].includes(item.type)){
  if(!item.points.length)return null;
  left=top=Infinity;right=bottom=-Infinity;
  for(const [x,y]of item.points){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  // Catmull–Rom handles extend by at most one sixth of the coordinate range.
  // Natural ink clamps its handles; pressure ink stays inside its footprints.
  if(item.type==='curve'||item.type==='path'&&!item.pressures&&item.inkVersion!==2&&item.smoothing>0){
   const dx=(right-left)/6,dy=(bottom-top)/6;left-=dx;right+=dx;top-=dy;bottom+=dy;
  }
 }else if(item.type==='shape'){
  const spec=SHAPES.get(item.shape);if(!spec)return null;
  for(const part of spec.paths){
   // Preset M/L/Q/C paths use paired absolute coordinates. The control hull
   // encloses the curve, including portions outside the nominal shape box.
   const values=part.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number)||[];
   for(let k=0;k<values.length;k+=2){const x=values[k]*w/100,y=values[k+1]*h/100;left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  }
 }else if(!['rectangle','ellipse','triangle','arc','image','equation','graph'].includes(item.type))return null;
 const angle=(item.rotation||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),cx=w/2,cy=h/2;
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(const [x,y]of [[left,top],[right,top],[right,bottom],[left,bottom]]){
  const px=item.x+cx+(x-cx)*c-(y-cy)*s,py=item.y+cy+(x-cx)*s+(y-cy)*c;
  x0=Math.min(x0,px);x1=Math.max(x1,px);y0=Math.min(y0,py);y1=Math.max(y1,py);
 }
 // Covers round caps, pressure width, wave amplitude, default miter limits,
 // arrowheads and numerical rounding without trimming a visible edge.
 const width=item.lineWidth||3,pad=width*2+(item.type==='arrow'?12+width*2:0)+2;
 return {x:x0-pad,y:y0-pad,w:x1-x0+2*pad,h:y1-y0+2*pad};
}
export function visibleItems(items,viewport,width,height,selected=new Set()){
 if(!(width>0&&height>0&&viewport.zoom>0))return items;
 const margin=64,z=viewport.zoom;
 const left=(-viewport.x-margin)/z,top=(-viewport.y-margin)/z;
 const right=(width-viewport.x+margin)/z,bottom=(height-viewport.y+margin)/z;
 return items.filter(item=>{
  if(selected.has(item.id))return true;
  const b=visualBounds(item);
  return !b||b.x<=right&&b.x+b.w>=left&&b.y<=bottom&&b.y+b.h>=top;
 });
}
