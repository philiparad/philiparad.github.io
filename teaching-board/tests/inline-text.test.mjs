import test from 'node:test';
import assert from 'node:assert/strict';
import {InlineText} from '../js/inline-text.js';
class Element {
 constructor(tag='div'){this.tagName=tag.toUpperCase();this.nodeType=1;this.style={};this.dataset={};this.children=[];this.scrollHeight=160;}
 get childNodes(){return this.children;}
 get textContent(){return this.children.map(n=>n.textContent).join('');}
 set textContent(value){this.children=[{nodeType:3,textContent:value}];}
 replaceChildren(...nodes){this.children=nodes;}
 getAttribute(k){return this[k]||null;}
 setAttribute(k,v){this[k]=v;}
 addEventListener(k,fn){this['on'+k]=fn;}
 append(...nodes){this.children.push(...nodes);}
 contains(n){return n===this||this.children.includes(n);}
 remove(){this.removed=true;}
 focus(){}
 setSelectionRange(){}
}
const listeners=new Map();
globalThis.document={createElement:tag=>new Element(tag),createRange:()=>({selectNodeContents(){},collapse(){}}),addEventListener:(k,fn)=>listeners.set(k,fn),removeEventListener:k=>listeners.delete(k)};
globalThis.window={getSelection:()=>({removeAllRanges(){},addRange(){}})};
function fixture(){const e={area:new Element(),svg:new Element(),board:{viewport:{x:30,y:40,zoom:2}},paint(){},applyText(...args){this.applied=args;}};const item={id:'text',type:'text',x:100,y:120,w:360,h:130,fontSize:26,rotation:30,text:'Original'};e.inlineText=new InlineText(e,item,true);return e;}
test('inline draft is isolated, correctly anchored with zoom/rotation and saves once',()=>{
 const e=fixture(),edit=e.inlineText;edit.input.textContent='שלום\nSecond line';edit.input.oninput();
 assert.equal(edit.item.text,'Original');assert.equal(edit.root.style.left,'410px');assert.equal(edit.root.style.top,'345px');assert.equal(edit.root.style.transform,'scale(2) rotate(30deg)');
 edit.input.onkeydown({key:'Enter',ctrlKey:true,preventDefault(){},stopPropagation(){}});
 assert.equal(e.inlineText,null);assert.equal(e.applied[1],'שלום\nSecond line');assert.equal(e.applied[2],162);assert.equal(listeners.size,0);assert.ok(edit.root.removed&&edit.controls.removed);
 edit.finish(false);assert.equal(e.applied[1],'שלום\nSecond line');
});
test('Escape, blank content and IME composition cannot accidentally commit',()=>{
 let e=fixture();e.inlineText.input.textContent='Cancelled';e.inlineText.input.onkeydown({key:'Escape',isComposing:true});assert.ok(e.inlineText);
 e.inlineText.input.onkeydown({key:'Escape',preventDefault(){},stopPropagation(){}});assert.equal(e.applied,undefined);
 e=fixture();e.inlineText.input.textContent=' \n ';e.inlineText.finish(true);assert.equal(e.applied,undefined);
});
test('outside pointer or keyboard focus saves; internal controls do not',()=>{
 const e=fixture(),edit=e.inlineText;edit.outside({target:edit.input});assert.equal(e.applied,undefined);
 edit.outside({target:new Element()});assert.equal(e.applied[1],'Original');assert.equal(listeners.size,0);
});

test('Ctrl+Z and Ctrl+Y travel through isolated text history',()=>{
 const e=fixture(),edit=e.inlineText;
 edit.input.textContent='Updated';
 edit.input.oninput();
 assert.equal(edit.textHistory.canUndo,true);
 assert.equal(edit.undoButton.disabled,false);
 assert.equal(edit.redoButton.disabled,true);
 const event=(key)=>({key,ctrlKey:true,preventDefault(){},stopPropagation(){}});
 edit.input.onkeydown(event('z'));
 assert.equal(edit.input.textContent,'Original');
 assert.equal(edit.undoButton.disabled,true);
 assert.equal(edit.redoButton.disabled,false);
 edit.input.onkeydown(event('y'));
 assert.equal(edit.input.textContent,'Updated');
 edit.finish(false);
 assert.equal(listeners.size,0);
});
test('composition input is recorded only after composition finishes',()=>{
 const e=fixture(),edit=e.inlineText;
 edit.input.oncompositionstart();
 edit.input.textContent='שלום';
 edit.input.oninput();
 assert.equal(edit.textHistory.canUndo,false);
 edit.input.oncompositionend();
 assert.equal(edit.textHistory.canUndo,true);
 edit.finish(false);
});

test('paragraph alignment commands use native paragraph styling',()=>{
 const e=fixture(),edit=e.inlineText;
 const paragraph=edit.input.children[0];
 edit.input.querySelectorAll=()=>[paragraph];
 paragraph.closest=()=>null;
 const original=globalThis.document.execCommand;
 globalThis.document.execCommand=()=>{throw Error('legacy alignment command should not run');};
 try{
  edit.setParagraphAlignment('center');
  assert.equal(paragraph.style.textAlign,'center');
  edit.setParagraphAlignment('right');
  assert.equal(paragraph.style.textAlign,'right');
  edit.setParagraphAlignment('invalid');
  assert.equal(paragraph.style.textAlign,'right');
 }finally{globalThis.document.execCommand=original;edit.finish(false);}
});

test('Ctrl/Command+Shift+7/8 dispatch native list formatting without legacy command',()=>{
 const e=fixture(),edit=e.inlineText,called=[];
 edit.formatList=kind=>{called.push(kind);return true;};
 for(const key of ['7','8']){
  let prevented=false;
  edit.input.onkeydown({key,ctrlKey:true,shiftKey:true,preventDefault(){prevented=true;},stopPropagation(){}});
  assert.equal(prevented,true);
 }
 assert.deepEqual(called,['number','bullet']);
 edit.finish(false);
});

test('collapsed caret formatting inserts styled Hebrew text without execCommand',()=>{
 const e=fixture(),edit=e.inlineText;
 const prevSelection=globalThis.window.getSelection;
 const prevText=globalThis.document.createTextNode;
 const prevCommand=globalThis.document.execCommand;
 const range={
  collapsed:true,startContainer:edit.input,
  deleteContents(){},insertNode(node){this.inserted=node;edit.input.append(node);node.parentNode=edit.input;},
  setStart(node,offset){this.caret=[node,offset];},collapse(){this.collapsed=true;}
 };
 const selection={
  rangeCount:1,anchorNode:edit.input,focusNode:edit.input,anchorOffset:0,focusOffset:0,
  getRangeAt(){return range;},removeAllRanges(){},addRange(){}
 };
 globalThis.window.getSelection=()=>selection;
 globalThis.document.createTextNode=value=>({nodeType:3,textContent:value});
 globalThis.document.execCommand=()=>{throw Error('deprecated command must not run');};
 try{
  assert.equal(edit.formatText('bold'),true);
  assert.equal(edit.pendingMarks.bold,true);
  let prevented=false;
  edit.input.onbeforeinput({inputType:'insertText',data:'אבג',isComposing:false,preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(range.inserted.style.fontWeight,'700');
  assert.deepEqual(range.caret.map((v,i)=>i===0?v.textContent:v),['אבג',3]);
  assert.equal(edit.pendingMarks,null);
  assert.equal(edit.textHistory.canUndo,true);
 }finally{
  globalThis.window.getSelection=prevSelection;
  globalThis.document.createTextNode=prevText;
  globalThis.document.execCommand=prevCommand;
  edit.finish(false);
 }
});

test('pending marks are discarded when IME composition begins',()=>{
 const e=fixture(),edit=e.inlineText;
 edit.pendingMarks={bold:true};
 edit.pendingSelection={anchor:[],focus:[],anchorOffset:0,focusOffset:0};
 edit.input.oncompositionstart();
 assert.equal(edit.composing,true);
 assert.equal(edit.pendingMarks,null);
 assert.equal(edit.pendingSelection,null);
 edit.input.oncompositionend();
 edit.finish(false);
});
