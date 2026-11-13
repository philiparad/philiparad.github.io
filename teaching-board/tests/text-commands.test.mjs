import test from 'node:test';
import assert from 'node:assert/strict';
import {paragraphAncestor,supportedInlineSelection,inlineFormatState,applyInlineFormat} from '../js/text-commands.js';

function makeElement(tag,parent=null,styles={}){
 const element={nodeType:1,tagName:tag,parentElement:parent,style:styles,childNodes:[],contains(node){for(let n=node;n;n=n.parentElement||n.parentNode){if(n===this)return true;}return false;},append(fragment){this.childNodes.push(fragment);}};
 return element;
}
function textNode(parent){return {nodeType:3,parentElement:parent,parentNode:parent,textContent:'שלום English'};}
test('formatting is restricted to one paragraph, never wraps multiple blocks',()=>{
 const root=makeElement('DIV'),a=makeElement('DIV',root),b=makeElement('DIV',root);
 const first=textNode(a),second=textNode(b);
 assert.equal(paragraphAncestor(first,root),a);
 assert.equal(supportedInlineSelection(root,{collapsed:false,startContainer:first,endContainer:second}),false);
 assert.equal(supportedInlineSelection(root,{collapsed:false,startContainer:first,endContainer:first}),true);
 assert.equal(supportedInlineSelection(root,{collapsed:true,startContainer:first,endContainer:first}),false);
 assert.equal(supportedInlineSelection(root,{collapsed:false,startContainer:root,endContainer:root}),false);
});
test('button states derive from ancestor styles without deprecated queryCommandState',()=>{
 const root=makeElement('DIV'),para=makeElement('DIV',root);
 const strong=makeElement('SPAN',para,{fontWeight:'700'}),leaf=textNode(strong);
 const selection={rangeCount:1,anchorNode:leaf};
 assert.equal(inlineFormatState(root,selection,'bold'),true);
 assert.equal(inlineFormatState(root,selection,'italic'),false);
 strong.style.fontWeight='400';
 assert.equal(inlineFormatState(root,selection,'bold'),false);
});
test('Range command wraps selected words and preserves the selection',()=>{
 const root=makeElement('DIV'),para=makeElement('DIV',root),leaf=textNode(para);
 const fragment={querySelectorAll(){return [];},childNodes:[]};
 const range={collapsed:false,startContainer:leaf,endContainer:leaf,
   extractContents(){this.extracted=true;return fragment;},
   insertNode(node){this.inserted=node;node.parentElement=para;},
   selectNodeContents(node){this.selected=node;}};
 const selection={rangeCount:1,anchorNode:leaf,getRangeAt(){return range;},removeAllRanges(){},addRange(r){this.range=r;}};
 const previous=globalThis.document;
 globalThis.document={createElement:tag=>makeElement(tag.toUpperCase())};
 try{
  assert.equal(applyInlineFormat(root,selection,'bold'),true);
  assert.equal(range.inserted.style.fontWeight,'700');
  assert.equal(range.selected,range.inserted);
  assert.equal(applyInlineFormat(root,selection,'foreColor','#b42318'),true);
  assert.equal(range.inserted.style.color,'#b42318');
  assert.equal(applyInlineFormat(root,selection,'foreColor','red;unsafe'),false);
 }finally{globalThis.document=previous;}
});
