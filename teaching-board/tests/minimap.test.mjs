import test from 'node:test';
import assert from 'node:assert/strict';
import { minimapFrame, centeredViewport, Minimap, overviewPath } from '../js/minimap.js';
test('minimap includes blank A4 pages and rotated large-board content',()=>{
 const pages=[{x:0,y:0,w:794,h:1123},{x:0,y:1155,w:794,h:1123}];
 const {frame}=minimapFrame([],{x:0,y:0,zoom:1},800,600,pages);
 assert.ok(frame.y+frame.h>2278);
 const items=Array.from({length:1000},(_,n)=>({x:n*10,y:-n,w:20,h:30,rotation:45}));
 const path=overviewPath(items);assert.equal((path.match(/M/g)||[]).length,1000);assert.ok(!/NaN|Infinity/.test(path));
});
test('large overview keeps one content path and does not rebuild on viewport navigation',()=>{
 const make=()=>({style:{},children:[],attrs:{},setAttribute(k,v){this.attrs[k]=v;},append(...nodes){this.children.push(...nodes);},replaceChildren(...nodes){this.children=nodes;}});
 const old=globalThis.document;globalThis.document={createElement:make,createElementNS:make};
 try{
  const e={history:{current:{}},board:{items:Array.from({length:400},(_,n)=>({id:String(n),x:n,y:n,w:20,h:30})),viewport:{x:0,y:0,zoom:1},layout:'a4',pageCount:2},area:{clientWidth:800,clientHeight:600}};
  const m=new Minimap(e);m.open=true;m.update();assert.equal(m.content.children.length,3);
  const path=m.content.children[2];e.board.viewport.x=100;m.update();assert.equal(m.content.children[2],path);
  e.history.current={};e.board.items[0].x=-500;m.update();assert.notEqual(m.content.children[2],path);
 }finally{globalThis.document=old;}
});
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
