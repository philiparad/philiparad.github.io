import test from 'node:test';
import assert from 'node:assert/strict';
import {beginResize,resizeItems,resizeHandles,beginRotation,rotateItems} from '../js/selection-transform.js';
import {imageCorners} from '../js/image-geometry.js';
import {bounds} from '../js/scene.js';
const image=()=>({id:'image',type:'image',x:100,y:100,w:200,h:100,rotation:0,src:'data:image/png;base64,AAAA'});
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('all eight handles keep the opposite edge or corner fixed',()=>{
 for(const [name,[u,v]] of Object.entries(resizeHandles)){
  const item=image(),board={items:[item]},d=beginResize([item],name,{x:0,y:0});
  resizeItems(board,d,{x:u===.5?0:u===0?-100:100,y:v===.5?0:v===0?-50:50});
  near(item.w,u===.5?200:300);near(item.h,v===.5?100:150);
  near(item.x,u===0?0:100);near(item.y,v===0?50:100);
 }
});
test('corner proportion toggles with Shift; side stretch is independent of Shift',()=>{
 const item=image(),board={items:[item]},d=beginResize([item],'se',{x:0,y:0});
 resizeItems(board,d,{x:100,y:0});near(item.w/item.h,2);
 resizeItems(board,d,{x:100,y:0},true);near(item.w,300);near(item.h,100);
 const side=beginResize([image()],'e',{x:0,y:0});resizeItems(board,side,{x:100,y:80},true);near(item.h,100);near(item.w,300);
});
test('a rotated cropped image receives the exact world-axis affine stretch',()=>{
 const item={...image(),rotation:37,crop:{x:.1,y:.1,w:.8,h:.8}},old=structuredClone(item),before=imageCorners(item),b=bounds(item),board={items:[item]},d=beginResize([item],'e',{x:0,y:0});
 resizeItems(board,d,{x:b.w,y:400});const after=imageCorners(item);
 before.forEach((p,k)=>{near(after[k].x,b.x+2*(p.x-b.x));near(after[k].y,p.y);});assert.deepEqual(item.crop,old.crop);assert.equal(item.src,old.src);
});
test('crossing an image anchor flips it and returning restores the original corners',()=>{
 const item=image(),original=imageCorners(item),board={items:[item]},d=beginResize([item],'e',{x:0,y:0});
 resizeItems(board,d,{x:-400,y:0});const flipped=imageCorners(item);near(flipped[0].x,100);near(flipped[1].x,-100);
 resizeItems(board,d,{x:0,y:0});imageCorners(item).forEach((p,k)=>{near(p.x,original[k].x);near(p.y,original[k].y);});
});

test('rotation stays centered, honors pointer offset and snaps at five degrees',()=>{
 const item=image(),board={items:[item]},d=beginRotation([item],{x:202,y:68},1);
 rotateItems(board,d,{x:285,y:151});near(item.rotation,90);near(item.x,100);near(item.y,100);
 const angle=17*Math.PI/180;rotateItems(board,d,{x:202+83*Math.sin(angle),y:68+83*(1-Math.cos(angle))},true);near(item.rotation,15);
});
test('group rotation preserves spacing and rotates a stretched image without losing its basis',()=>{
 const item={...image(),imageBasis:[1,0,.3,Math.sqrt(.91)]},other={...image(),id:'other',x:400},board={items:[item,other]},d=beginRotation(board.items,{x:350,y:67},1),basis=[...item.imageBasis];
 rotateItems(board,d,{x:433,y:150});near(item.rotation,90);near(other.rotation,90);near(other.y-item.y,300);near(item.x,other.x);assert.deepEqual(item.imageBasis,basis);
});
