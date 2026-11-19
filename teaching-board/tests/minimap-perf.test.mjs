import test from 'node:test';
import assert from 'node:assert/strict';
import {Minimap} from '../js/minimap.js';

// Minimal SVG DOM fixture that detects full preview rebuilds and node churn.
function domFixture(){
 const state={rebuilds:0,replacements:0};
 class Element{
  constructor(tag){this.tagName=tag;this.style={};this.children=[];this.attrs={};this.parentNode=null;}
  setAttribute(k,v){this.attrs[k]=String(v);}
  getAttribute(k){return this.attrs[k]??null;}
  append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
  remove(){if(!this.parentNode)return;const p=this.parentNode;p.children.splice(p.children.indexOf(this),1);this.parentNode=null;}
  replaceChildren(...nodes){state.rebuilds++;for(const node of this.children)node.parentNode=null;this.children=[];this.append(...nodes);}
  replaceWith(node){const p=this.parentNode;if(!p)throw Error('Detached replacement');const at=p.children.indexOf(this);node.remove();p.children[at]=node;node.parentNode=p;this.parentNode=null;state.replacements++;}
  focus(){}
  setPointerCapture(){}
 }
 return {state,create:tag=>new Element(tag)};
}
const rect=(id,x)=>({id,type:'rectangle',x,y:10,w:40,h:30,fill:'#ffffff',stroke:'#123456',lineWidth:2});
function editor(count){
 return {history:{current:{}},board:{
  items:Array.from({length:count},(_,i)=>rect('item-'+i,i*60)),
  viewport:{x:0,y:0,zoom:1},layout:'infinite',pageCount:1,background:'grid'
 },area:{clientWidth:1200,clientHeight:700},drag:null};
}
async function withDocument(run){
 const old=globalThis.document,dom=domFixture();
 globalThis.document={createElement:dom.create,createElementNS:(_,tag)=>dom.create(tag)};
 try{await run(dom.state);}finally{globalThis.document=old;}
}

test('PERF-009 panning never rebuilds minimap preview; moving one item keeps all nodes',async()=>{
 await withDocument(async state=>{
  const e=editor(120),m=new Minimap(e);m.open=true;m.update();
  const original=[...m.content.children],initial=state.rebuilds;
  assert.equal(initial,1);
  assert.equal(original.length,120);
  e.drag={kind:'pan'};
  for(let i=0;i<120;i++){
   e.board.viewport.x=-i*12;m.update();
  }
  assert.equal(state.rebuilds,initial);
  assert.deepEqual(m.content.children,original,'Viewport drag must not remount any SVG object');
  assert.equal(m.viewportNode.attrs.x,String(-e.board.viewport.x));
  const moving=e.board.items[3];
  e.drag={kind:'move',items:[{id:moving.id}]};
  for(let x=1;x<=90;x++){moving.x=x*2;m.update();}
  assert.equal(state.rebuilds,initial,'Object drag should not reconstruct entire preview');
  assert.deepEqual(m.content.children,original,'Translation keeps existing SVG groups');
  assert.match(original[3].attrs.transform,/translate\(180 10\)/);
  assert.equal(state.replacements,0);
  e.drag=null;m.update();
  assert.equal(state.rebuilds,initial+1,'Cancelled drag restores preview once');
  m.dispose();
 });
});

test('PERF-009 resizes replace only changed SVG node and commit invalidates the snapshot',async()=>{
 await withDocument(async state=>{
  const e=editor(42),m=new Minimap(e);m.open=true;m.update();
  const before=[...m.content.children],first=e.board.items[5],initial=state.rebuilds;
  e.drag={kind:'resize',items:[{id:first.id}]};first.w+=55;m.update();
  assert.equal(state.rebuilds,initial);
  assert.equal(state.replacements,1);
  assert.notEqual(m.content.children[5],before[5]);
  assert.deepEqual(m.content.children.filter((node,i)=>i!==5),before.filter((node,i)=>i!==5));
  const after=m.content.children[5];m.update();
  assert.equal(m.content.children[5],after,'Unchanged visual must reuse node');
  e.drag=null;e.history.current={};m.update();
  assert.equal(state.rebuilds,initial+1,'Committed edit refreshes overview once');
  m.dispose();
 });
});

test('PERF-009 large simplified minimap path remains stable over repeated drags',async()=>{
 await withDocument(async state=>{
  const e=editor(1400),m=new Minimap(e);m.open=true;m.update();
  assert.equal(m.content.children.length,1);
  const path=m.content.children[0],initial=state.rebuilds;
  e.drag={kind:'move',items:[{id:'item-0'}]};
  for(let i=0;i<200;i++){e.board.items[0].x=-i*50;m.update();}
  assert.equal(state.rebuilds,initial,'Dragging must not regenerate the 1400-object SVG path');
  assert.equal(m.content.children[0],path);
  e.drag=null;e.history.current={};m.update();
  assert.equal(state.rebuilds,initial+1);
  assert.notEqual(m.content.children[0],path);
  await m.toggle.onclick();
  assert.equal(m.content.children.length,0,'Closed minimap releases cached SVG content');
  await m.toggle.onclick();
  assert.equal(m.content.children.length,1,'Reopening recreates current full overview');
  m.dispose();
 });
});
