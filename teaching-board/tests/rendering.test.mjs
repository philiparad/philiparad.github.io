// Run with: node --test teaching-board/tests/rendering.test.mjs
// A small SVG DOM double lets the real editor/renderer run without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={};}
 setAttribute(k,v){this.attributes[k]=String(v);}
 getAttribute(k){return this.attributes[k]??null;}
 hasAttribute(k){return k in this.attributes;}
 append(...nodes){for(const n of nodes){n.parentNode=this;this.children.push(n);}}
 replaceChildren(...nodes){for(const n of this.children)n.parentNode=null;this.children=[];this.append(...nodes);}
 get isConnected(){return this.root||!!this.parentNode?.isConnected;}
 closest(selector){return selector==='[data-id]'&&this.hasAttribute('data-id')?this:this.parentNode?.closest(selector)||null;}
 focus(){}
 setPointerCapture(){}
}
let frameId=0;const frames=new Map();
globalThis.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};
globalThis.cancelAnimationFrame=id=>frames.delete(id);
function nextFrame(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());}
globalThis.document={createElementNS:(_,tag)=>new Element(tag)};
const {Editor}=await import('../js/editor.js');
const {History}=await import('../js/history.js');
const {createBoard,validateBoard}=await import('../js/model.js');
const {sceneSVG}=await import('../js/scene.js');
function fixture(count=1){
 frames.clear();const e=Object.create(Editor.prototype);e.board=createBoard('Rendering regression');
 e.board.items=Array.from({length:count},(_,k)=>({id:'object-'+k,type:'rectangle',x:k*3,y:20,w:50,h:40,lineWidth:3,stroke:'#123456',fill:'none'}));
 e.svg=new Element('svg');e.svg.root=true;e.area={clientWidth:1000,clientHeight:700};
 e.selected=new Set();e.tool='pen';e.stroke='#123456';e.strokeOpacity=1;e.fill='none';e.fillOpacity=1;e.lineWidth=3;e.lineStyle='solid';e.opacity=1;e.inkSmoothing=.65;e.guides=[];
 for(const key of ['shapeGallery','strokePalette','fillPalette','lineStyleMenu'])e[key]={update(){}};
 e.pages={update(){},paint(){}};e.geometry={paint(){},down(){return false;},up(){return false;},move(){return false;}};
 for(const key of ['zoomLabel','selectionLabel','undoButton','redoButton','paper','smoothingSelect'])e[key]={};
 e.point=event=>({x:event.clientX,y:event.clientY});e.screen=e.point;e.save=()=>{};
 e.history=new History(e.document());e.action=fn=>fn();e.paint();return e;
}
function pointer(e,x,y){return {button:0,pointerId:1,clientX:x,clientY:y,timeStamp:x,target:e.svg,preventDefault(){}};}
function walk(n){return [n,...n.children.flatMap(walk)];}
function object(e,id){return walk(e.svg).find(n=>n.getAttribute('data-id')===id);}
test('pen preview preserves 1,000 committed SVG nodes and records all samples',()=>{
 const e=fixture(1000);e.pointerDown(pointer(e,10,10));const old=e.board.items.map(i=>object(e,i.id)),root=e.svg.children[0];
 for(let x=11;x<70;x++)e.pointerMove(pointer(e,x,20+Math.sin(x)));
 assert.equal(e.draft.rawPoints.length,60);assert.equal(e.svg.children[0],root);
 e.board.items.forEach((i,k)=>assert.equal(object(e,i.id),old[k]));
 nextFrame();assert.equal(e.draftLayer.children.length,1);e.pointerUp(pointer(e,70,20));
 assert.equal(e.board.items.length,1001);assert.equal(e.draftLayer.children.length,0);validateBoard(e.board);
 e.undo();assert.equal(e.board.items.length,1000);e.redo();assert.equal(e.board.items.length,1001);
 assert.equal(walk(sceneSVG(e.board)).filter(n=>n.hasAttribute('data-id')).length,1001);
});
test('tap creates a dot and exports the committed ink',()=>{
 const e=fixture();e.pointerDown(pointer(e,10,10));assert.ok(walk(e.draftLayer).some(n=>n.tagName==='circle'));
 e.pointerUp(pointer(e,10,10));assert.equal(e.board.items.at(-1).points.length,1);
 assert.ok(walk(sceneSVG(e.board)).some(n=>n.tagName==='circle'));
});
test('shape previews refresh snapping guides without replacing fixed objects',()=>{
 const e=fixture();e.tool='rectangle';e.board.snapMode='grid';e.pointerDown(pointer(e,5,5));const old=object(e,'object-0');
 e.pointerMove(pointer(e,63,95));assert.equal(e.draft.w,59);assert.equal(e.draft.h,91);
 nextFrame();assert.equal(e.guideLayer.children.length,2);assert.equal(object(e,'object-0'),old);
 e.pointerUp(pointer(e,63,95));assert.equal(e.guideLayer.children.length,0);assert.equal(e.board.items.length,2);
});
test('full redraws clear canceled previews and update viewport transforms',()=>{
 const e=fixture();e.pointerDown(pointer(e,10,10));const abandoned=e.draftLayer;
 e.drag=null;e.draft=null;e.paint();assert.equal(abandoned.isConnected,false);assert.equal(e.draftLayer.children.length,0);
 e.board.viewport={x:40,y:30,zoom:2};e.paint();assert.equal(e.draftLayer.parentNode.getAttribute('transform'),'translate(40 30) scale(2)');
 e.pointerDown(pointer(e,20,20));e.pointerMove(pointer(e,30,30));assert.equal(e.draftLayer.parentNode.getAttribute('transform'),'translate(40 30) scale(2)');
});

test('many input events produce one preview frame without dropping samples',()=>{
 const e=fixture();e.pointerDown(pointer(e,10,10));let paints=0;
 const draw=e.paintDraft.bind(e);e.paintDraft=()=>{paints++;draw();};
 for(let x=11;x<=110;x++)e.pointerMove(pointer(e,x,20));
 assert.equal(e.draft.rawPoints.length,101);assert.equal(paints,0);assert.equal(frames.size,1);
 nextFrame();assert.equal(paints,1);assert.equal(frames.size,0);
});
test('pointer release before the next frame commits final ink and cancels stale paint',()=>{
 const e=fixture();e.pointerDown(pointer(e,10,10));e.pointerMove(pointer(e,30,20));
 assert.equal(frames.size,1);e.pointerUp(pointer(e,45,25));
 assert.equal(frames.size,0);assert.equal(e.board.items.length,2);
 assert.equal(e.board.items.at(-1).rawPoints.at(-1)[0],35);
 nextFrame();assert.equal(e.draftLayer.children.length,0);e.undo();assert.equal(e.board.items.length,1);
});
test('full redraw supersedes draft requests and canceled/disposed work cannot render',()=>{
 const e=fixture();let full=0,draft=0;
 const paint=e.paint.bind(e);e.paint=()=>{full++;paint();};e.paintDraft=()=>draft++;
 e.requestPaint(true);e.requestPaint();e.requestPaint(true);assert.equal(frames.size,1);
 nextFrame();assert.equal(full,1);assert.equal(draft,0);
 e.requestPaint(true);e.paint();assert.equal(frames.size,0);
 e.requestPaint(true);e.disposed=true;nextFrame();assert.equal(draft,0);
 e.requestPaint();assert.equal(frames.size,0);
});
