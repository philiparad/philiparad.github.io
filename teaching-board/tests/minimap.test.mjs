import test from 'node:test';
import assert from 'node:assert/strict';
import { minimapFrame, centeredViewport, Minimap } from '../js/minimap.js';
test('minimap navigation centers negative world coordinates without changing zoom',()=>{
 const v={x:20,y:30,zoom:2};
 assert.deepEqual(centeredViewport(v,{x:-300,y:500},800,600),{x:1000,y:-700,zoom:2});
 assert.deepEqual(v,{x:20,y:30,zoom:2});
});
test('minimap pointer drag keeps initial transform, saves once and ignores other pointers',()=>{
 const make=()=>({style:{},setAttribute(){},append(){},focus(){},setPointerCapture(){},getScreenCTM(){return {inverse:()=>({})};}});
 const oldDocument=globalThis.document,oldPoint=globalThis.DOMPoint;
 globalThis.document={createElement:make,createElementNS:make};
 globalThis.DOMPoint=class{constructor(x,y){this.x=x;this.y=y;}matrixTransform(){return this;}};
 try{
  let saves=0,paints=0;const e={board:{viewport:{x:0,y:0,zoom:2}},area:{clientWidth:800,clientHeight:600},paint(){paints++;},requestPaint(){paints++;},save(){saves++;}};
  const m=new Minimap(e),event=(x,y,id=1)=>({button:0,pointerId:id,clientX:x,clientY:y,preventDefault(){},stopPropagation(){},target:{hasAttribute:()=>true}});
  m.preview.onpointerdown(event(10,20));m.preview.onpointermove(event(50,80,2));assert.equal(paints,0);
  m.preview.onpointermove(event(50,80));assert.deepEqual(e.board.viewport,{x:-80,y:-120,zoom:2});
  m.preview.onpointerup(event(50,80));m.preview.onlostpointercapture(event(50,80));assert.equal(saves,1);assert.equal(m.drag,null);
 }finally{globalThis.document=oldDocument;globalThis.DOMPoint=oldPoint;}
});
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
