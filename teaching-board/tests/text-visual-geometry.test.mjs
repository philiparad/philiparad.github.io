import test from 'node:test';
import assert from 'node:assert/strict';
import {drawItem,bounds,textObjectHeight,union} from '../js/scene.js';
import {RenderCache} from '../js/render-cache.js';
import {beginResize,resizeItems,beginRotation,rotateItems,drawResizeHandles} from '../js/selection-transform.js';

class Node {
 constructor(tag){this.tagName=tag;this.attributes={};this.children=[];this.style={};this.textContent='';}
 setAttribute(name,value){this.attributes[name]=String(value);}
 getAttribute(name){return this.attributes[name]??null;}
 append(...nodes){this.children.push(...nodes);}
 getContext(){return {measureText:value=>({width:Array.from(value).length*12})};}
}
globalThis.document={createElementNS:(_,tag)=>new Node(tag),createElement:tag=>new Node(tag)};
const item=()=>({id:'legacy',type:'text',x:100,y:80,w:140,h:18,fontSize:24,
  text:'שלום English long words with line wraps',rotation:0});

test('cached SVG transform and selection bounds use identical rendered height',()=>{
 const original=item(),before=structuredClone(original);
 const visible=textObjectHeight(original);
 assert.ok(visible>original.h);
 const cached=new RenderCache(drawItem).draw(original);
 assert.equal(cached.getAttribute('transform'),`translate(100 80) rotate(0 70 ${visible/2})`);
 assert.equal(bounds(original).h,visible);
 assert.equal(union([original]).h,visible);
 const layer=new Node('g');
 drawResizeHandles(layer,[original],1);
 const bottom=layer.children.find(node=>node.getAttribute('data-resize')==='s');
 assert.equal(Number(bottom.attributes.y)+5,80+visible+8);
 assert.deepEqual(original,before);
});
test('horizontal resize does not jump a legacy text box vertically',()=>{
 const box=item(),before=textObjectHeight(box),board={items:[box]};
 const drag=beginResize([box],'e',{x:0,y:0});
 assert.equal(drag.items[0].h,before);
 assert.equal(drag.b.h,before);
 resizeItems(board,drag,{x:50,y:0});
 assert.equal(box.x,100);
 assert.equal(box.y,80);
 assert.equal(box.w,190);
 assert.equal(box.h,before);
 assert.equal(box.fontSize,24);
});
test('rotation respects rendered center and saves actual height',()=>{
 const box=item(),h=textObjectHeight(box),board={items:[box]};
 const drag=beginRotation([box],{x:0,y:0},1);
 assert.equal(drag.items[0].h,h);
 rotateItems(board,drag,{x:0,y:0});
 assert.equal(box.x,100);assert.equal(box.y,80);
 assert.equal(box.h,h);assert.equal(box.rotation,0);
 const start=drag.handleStart;
 const next=beginRotation([box],start,1),c=next.center;
 rotateItems(board,next,{x:c.x+c.y-start.y,y:c.y});
 assert.ok(Math.abs(box.rotation-90)<1e-8);
 assert.equal(box.x,100);assert.equal(box.y,80);
});
test('normal shape resizing does not change dimensions due to text metrics',()=>{
 const box={id:'rect',type:'rectangle',x:20,y:30,w:100,h:50},board={items:[box]};
 const drag=beginResize([box],'e',{x:0,y:0});
 assert.equal(drag.items[0].h,50);
 resizeItems(board,drag,{x:30,y:0});
 assert.equal(box.w,130);assert.equal(box.h,50);
 assert.equal(box.y,30);
});
