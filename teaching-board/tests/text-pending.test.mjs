import test from 'node:test';
import assert from 'node:assert/strict';
import {pendingMark,insertPendingText} from '../js/text-pending.js';

test('collapsed-caret marks toggle safely and preserve independent formatting',()=>{
 let state=pendingMark(null,'bold',undefined,()=>false);
 assert.deepEqual(state,{bold:true});
 state=pendingMark(state,'italic',undefined,()=>false);
 assert.deepEqual(state,{bold:true,italic:true});
 state=pendingMark(state,'bold',undefined,()=>false);
 assert.deepEqual(state,{bold:false,italic:true});
 state=pendingMark(state,'foreColor','#B42318');
 assert.equal(state.color,'#b42318');
 assert.equal(pendingMark(state,'foreColor','red;alert(1)'),null);
 assert.equal(pendingMark(state,'unknown'),null);
 state=pendingMark(state,'removeFormat');
 assert.deepEqual(state,{bold:false,italic:false,underline:false,strikeThrough:false,color:null});
 assert.deepEqual(pendingMark(null,'underline',undefined,()=>true),{underline:false});
});
test('pending marks insert at caret with CSS style and restore collapsed caret',()=>{
 const root={style:{color:'#203954'},contains:n=>n===textNode||n===root};
 const textNode={nodeType:3,textContent:'שלום'};
 let fragment,created;
 const range={collapsed:true,startContainer:textNode,deleteContents(){this.deleted=true;},
  insertNode(n){this.inserted=n;},setStart(n,offset){this.start=[n,offset];},
  collapse(value){this.collapsedValue=value;}};
 const selection={rangeCount:1,getRangeAt:()=>range,removeAllRanges(){this.cleared=true;},addRange(r){this.restored=r;}};
 const old=globalThis.document;
 globalThis.document={createElement:tag=>(created={tag,style:{},children:[],append(child){this.children.push(child);}}),createTextNode:value=>(fragment={textContent:value,nodeType:3})};
 try{
  assert.equal(insertPendingText(root,selection,{bold:true,italic:true,color:'#b42318'},'אבג'),true);
  assert.equal(created.style.fontWeight,'700');
  assert.equal(created.style.fontStyle,'italic');
  assert.equal(created.style.color,'#b42318');
  assert.equal(range.inserted,created);
  assert.deepEqual(range.start,[fragment,3]);
  assert.equal(range.collapsedValue,true);
  assert.equal(selection.restored,range);
 }finally{globalThis.document=old;}
});
test('pending insertion rejects unsafe or non-collapsed input without changing the range',()=>{
 const root={contains:()=>true,style:{}},range={collapsed:false,startContainer:{}},sel={rangeCount:1,getRangeAt:()=>range};
 assert.equal(insertPendingText(root,sel,{bold:true},'hello'),false);
 range.collapsed=true;
 assert.equal(insertPendingText(root,sel,{bold:true},'line\nnext'),false);
 assert.equal(insertPendingText(root,sel,null,'text'),false);
 assert.equal(insertPendingText(root,sel,{bold:true},''),false);
});
