import {bounds} from './scene.js?v=20261121-variation-fields';
import { SHAPES } from './shapes.js?v=20261121-variation-fields';

// PERF-004: Text/note bounds must use the same wrapped, measured height as
// sceneSVG and hit testing. Cache by item identity and geometry so a pan/zoom
// never measures long paragraphs again. Explicit invalidation covers in-place
// rich-text edits committed through the editor.
const TEXT_BOUNDS_KEYS=['type','x','y','w','h','rotation','fontSize','text',
 'runs','paragraphs','textStyle','textAlign','lineWidth'];
let textBoundsCache=new WeakMap();
let boundsDocument;
let boundsFontSet;

// PERF-013: Local stroke extents are expensive for long ink paths. Keep them
// separately from transformed bounds so moving/rotating a stroke does not
// rescan its points on each paint. Explicit invalidation handles in-place
// point edits (including pressure/ink changes) at commit time.
let pointExtentsCache=new WeakMap();
export function invalidatePointBounds(item){
 if(item&&typeof item==='object')pointExtentsCache.delete(item);
}
export function clearPointBoundsCache(){pointExtentsCache=new WeakMap();}
function localPointBounds(item){
 const points=item.points;
 const cached=pointExtentsCache.get(item);
 if(cached&&cached.points===points&&cached.length===points.length)return cached.box;
 let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
 for(const [x,y] of points){
  left=Math.min(left,x);right=Math.max(right,x);
  top=Math.min(top,y);bottom=Math.max(bottom,y);
 }
 const box={left,top,right,bottom};
 pointExtentsCache.set(item,{points,length:points.length,box});
 return box;
}

export function clearTextBoundsCache(){textBoundsCache=new WeakMap();}

function watchFonts(){
 const active=typeof document==='undefined'?null:document;
 if(active===boundsDocument)return;
 boundsFontSet?.removeEventListener?.('loadingdone',clearTextBoundsCache);
 boundsFontSet?.removeEventListener?.('loadingerror',clearTextBoundsCache);
 boundsDocument=active;
 boundsFontSet=active?.fonts||null;
 boundsFontSet?.addEventListener?.('loadingdone',clearTextBoundsCache);
 boundsFontSet?.addEventListener?.('loadingerror',clearTextBoundsCache);
 clearTextBoundsCache();
}

export function invalidateTextBounds(item){
 if(item&&typeof item==='object')textBoundsCache.delete(item);
}

function measuredTextBounds(item){
 watchFonts();
 const cached=textBoundsCache.get(item);
 if(cached&&TEXT_BOUNDS_KEYS.every(key=>Object.is(cached.snapshot[key],item[key])))return cached.box;
 const box=bounds(item);
 // Glyph side bearings, italics, stroke outlines and font fallback can extend
 // slightly beyond the measured paragraph box. Include this extra safety band.
 const pad=Math.max(8,(item.fontSize||24)*.5,(item.lineWidth||3)*2)+4;
 const padded={x:box.x-pad,y:box.y-pad,w:box.w+pad*2,h:box.h+pad*2};
 const snapshot=Object.create(null);
 for(const key of TEXT_BOUNDS_KEYS)snapshot[key]=item[key];
 textBoundsCache.set(item,{snapshot,box:padded});
 return padded;
}

// Conservative viewport bounds; unknown object types remain visible.
export function visualBounds(item){
 if(item.type==='image'){const b=bounds(item),pad=(item.imageBorder&&item.imageBorder!=='none'?(item.imageBorderWidth||2)/2:0)+2;return {x:b.x-pad,y:b.y-pad,w:b.w+pad*2,h:b.h+pad*2};}
 const w=item.w||1,h=item.h||1;
 let left=0,top=0,right=w,bottom=h;
 if(['text','note'].includes(item.type))return measuredTextBounds(item);
 if(item.points&&['path','curve','polygon','line','arrow'].includes(item.type)){
  if(!item.points.length)return null;
  ({left,top,right,bottom}=localPointBounds(item));
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
