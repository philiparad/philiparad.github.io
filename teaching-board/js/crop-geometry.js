import {imageAxes} from './image-geometry.js?v=20261023-image-handles';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function dragCrop(start,from,to,handle){
 const dx=to.x-from.x,dy=to.y-from.y,min=.001;
 if(handle==='move')return {...start,x:clamp(start.x+dx,0,1-start.w),y:clamp(start.y+dy,0,1-start.h)};
 if(handle==='new'){const x=Math.min(from.x,to.x),y=Math.min(from.y,to.y);return {x:clamp(x,0,1-min),y:clamp(y,0,1-min),w:Math.max(min,Math.abs(dx)),h:Math.max(min,Math.abs(dy))};}
 let l=start.x,r=l+start.w,t=start.y,b=t+start.h;
 if(handle.includes('w'))l=clamp(l+dx,0,r-min);if(handle.includes('e'))r=clamp(r+dx,l+min,1);
 if(handle.includes('n'))t=clamp(t+dy,0,b-min);if(handle.includes('s'))b=clamp(b+dy,t+min,1);
 return {x:l,y:t,w:r-l,h:b-t};
}
export function croppedFrame(item,crop){
 const old=item.crop||{x:0,y:0,w:1,h:1},w=item.w*crop.w/old.w,h=item.h*crop.h/old.h;
 const dx=(crop.x-old.x)*item.w/old.w+(w-item.w)/2,dy=(crop.y-old.y)*item.h/old.h+(h-item.h)/2,[a,b,c,d]=imageAxes(item);
 return {crop:{...crop},w,h,x:item.x+item.w/2+a*dx+c*dy-w/2,y:item.y+item.h/2+b*dx+d*dy-h/2};
}
