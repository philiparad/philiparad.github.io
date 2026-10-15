import test from 'node:test';
import assert from 'node:assert/strict';
import { minimapFrame } from '../js/minimap.js';
test('empty minimap encloses visible workspace at any pan and zoom',()=>{
 const {view,frame}=minimapFrame([],{x:400,y:-200,zoom:2},800,600);
 assert.deepEqual(view,{x:-200,y:100,w:400,h:300});
 assert.ok(frame.x<view.x&&frame.y<view.y&&frame.x+frame.w>view.x+view.w&&frame.y+frame.h>view.y+view.h);
});
test('minimap includes distant objects and viewport without changing lesson',()=>{
 const items=[{id:'a',type:'rectangle',x:-4000,y:3000,w:300,h:200,rotation:45}];
 const before=JSON.stringify(items),{frame}=minimapFrame(items,{x:0,y:0,zoom:1},1000,600);
 assert.ok(frame.x<-4000&&frame.y<0&&frame.x+frame.w>1000&&frame.y+frame.h>3200);
 assert.equal(JSON.stringify(items),before);
});
