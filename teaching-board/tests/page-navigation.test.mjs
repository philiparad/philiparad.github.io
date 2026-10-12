import test from 'node:test';
import assert from 'node:assert/strict';
import {Pages,visiblePage,A4} from '../js/pages.js';
class Element{constructor(){this.children=[];}append(...nodes){this.children.push(...nodes);}replaceChildren(){this.children=[];}setAttribute(k,v){this[k]=v;}}
globalThis.document={createElement:()=>new Element()};
function fixture(){const e={board:{layout:'a4',pageCount:4,viewport:{x:0,y:0,zoom:1},items:[{id:'keep'}]},area:{clientWidth:1000,clientHeight:700},saves:0,commits:0,save(){this.saves++;},commit(){this.commits++;this.paint();},paint(){this.pages.update();}};e.pages=new Pages(e);e.pages.controls();e.pages.update();return e;}
test('direct A4 navigation fits the selected page without document edits',()=>{
 const e=fixture(),items=structuredClone(e.board.items);e.pages.jump.value='2';e.pages.jump.onchange();assert.equal(e.pages.index,2);assert.equal(e.pages.jump.value,'2');assert.equal(e.saves,1);assert.equal(e.commits,0);assert.deepEqual(e.board.items,items);
 const r=e.board.viewport;assert.ok(Math.abs((350-r.y)/r.zoom-(2*(A4.h+A4.gap)+A4.h/2))<1e-8);
 const reloaded=new Pages(e);reloaded.controls();reloaded.update();assert.equal(reloaded.index,2);
 e.pages.go(NaN);assert.equal(e.saves,1);
});
test('A4 navigation follows viewport and updates after page count changes',async()=>{
 const e=fixture();e.pages.go(3);e.board.pageCount=2;e.pages.update();assert.equal(e.pages.index,1);assert.equal(e.pages.jump.children.length,2);assert.equal(e.pages.next.disabled,true);
 e.board.pageCount=4;e.pages.update();assert.equal(e.pages.jump.children.length,4);
 e.pages.go(1);await e.pages.previous.onclick();assert.equal(e.pages.index,0);assert.equal(e.pages.previous.disabled,true);
 e.pages.go(2);await e.pages.next.onclick();assert.equal(e.pages.index,3);assert.equal(e.pages.next.disabled,true);
 await e.pages.add.onclick();assert.equal(e.board.pageCount,5);assert.equal(e.pages.index,4);assert.equal(e.pages.jump.children.length,5);
 e.board.layout='infinite';e.pages.update();assert.equal(e.pages.jump.hidden,true);
});
test('visible A4 page clamps safely at document edges and between pages',()=>{
 assert.equal(visiblePage({y:10000,zoom:1},700,4),0);assert.equal(visiblePage({y:-100000,zoom:.5},700,4),3);
 assert.equal(visiblePage({y:350-2.5*(A4.h+A4.gap),zoom:1},700,4),2);
});
