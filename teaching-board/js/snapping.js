import { bounds } from './scene.js?v=20260929-paste';
export function snapPoint(point,board,exclude=new Set(),mode='both',anchors=null){
 if(mode==='off')return {...point,guides:[]};
 const tolerance=7/board.viewport.zoom,targets={x:[],y:[]};
 if(mode==='objects'||mode==='both')for(const item of board.items){if(exclude.has(item.id))continue;const b=bounds(item);targets.x.push(b.x,b.x+b.w/2,b.x+b.w);targets.y.push(b.y,b.y+b.h/2,b.y+b.h);}
 const result={...point,guides:[]};
 for(const axis of ['x','y']){const offsets=anchors?.[axis]||[0];let best=tolerance,delta=0,guide=null;
  for(const offset of offsets){const value=point[axis]+offset,options=[...targets[axis]];if(mode==='grid'||mode==='both')options.push(Math.round(value/32)*32);
   for(const target of options){const distance=Math.abs(target-value);if(distance<=best){best=distance;delta=target-value;guide=target;}}
  }
  result[axis]+=delta;if(guide!==null)result.guides.push({axis,value:guide});
 }return result;
}
export function snapAngle(start,end,step=15){const r=Math.hypot(end.x-start.x,end.y-start.y),a=Math.round(Math.atan2(end.y-start.y,end.x-start.x)/(Math.PI*step/180))*(Math.PI*step/180);return {x:start.x+r*Math.cos(a),y:start.y+r*Math.sin(a)};}
