import {bounds} from './scene.js?v=20261119-perf005';

// PERF-006 — construct once per snapping gesture. Preserve the original
// traversal order as a rank: on equal distances, the last candidate wins.
// The sorted axes allow O(log n) nearest-object queries per pointer sample.
export function buildSnapIndex(items,exclude=new Set(),measure=bounds){
 const x=[],y=[];
 let rank=0;
 for(const item of items){
  if(exclude.has(item.id))continue;
  const box=measure(item);
  for(const value of [box.x,box.x+box.w/2,box.x+box.w])x.push({value,rank:rank++});
  for(const value of [box.y,box.y+box.h/2,box.y+box.h])y.push({value,rank:rank++});
 }
 const sort=(a,b)=>a.value-b.value||a.rank-b.rank;
 x.sort(sort);y.sort(sort);
 return {x,y};
}
function lowerBound(points,value){
 let lo=0,hi=points.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(points[mid].value<value)lo=mid+1;else hi=mid;}
 return lo;
}
function upperBound(points,value){
 let lo=0,hi=points.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(points[mid].value<=value)lo=mid+1;else hi=mid;}
 return lo;
}
function nearestObject(points,value){
 if(!points.length)return null;
 const i=lowerBound(points,value);
 const left=i>0?points[i-1]:null;
 // For equal-coordinate targets, select the last in original insertion order.
 const right=i<points.length?points[upperBound(points,points[i].value)-1]:null;
 if(!left)return right;
 if(!right)return left;
 const a=Math.abs(left.value-value),b=Math.abs(right.value-value);
 return a<b?left:b<a?right:left.rank>right.rank?left:right;
}
export function snapPoint(point,board,exclude=new Set(),mode='both',anchors=null,index=null){
 if(mode==='off')return {...point,guides:[]};
 const tolerance=7/board.viewport.zoom,objects=mode==='objects'||mode==='both';
 const targets=objects?(index||buildSnapIndex(board.items,exclude)):null;
 const result={...point,guides:[]};
 for(const axis of ['x','y']){
  const offsets=anchors?.[axis]||[0];
  let best=tolerance,delta=0,guide=null;
  for(const offset of offsets){
   const value=point[axis]+offset;
   if(objects){
    const candidate=nearestObject(targets[axis],value);
    if(candidate){
     const distance=Math.abs(candidate.value-value);
     if(distance<=best){best=distance;delta=candidate.value-value;guide=candidate.value;}
    }
   }
   // Grid is the last candidate at every offset, just like the old
   // implementation, so exact-distance ties retain the same guides.
   if(mode==='grid'||mode==='both'){
    const target=Math.round(value/32)*32,distance=Math.abs(target-value);
    if(distance<=best){best=distance;delta=target-value;guide=target;}
   }
  }
  result[axis]+=delta;
  if(guide!==null)result.guides.push({axis,value:guide});
 }
 return result;
}
export function snapAngle(start,end,step=15){
 const r=Math.hypot(end.x-start.x,end.y-start.y);
 const a=Math.round(Math.atan2(end.y-start.y,end.x-start.x)/(Math.PI*step/180))*(Math.PI*step/180);
 return {x:start.x+r*Math.cos(a),y:start.y+r*Math.sin(a)};
}
