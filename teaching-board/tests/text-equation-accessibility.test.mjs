import test from 'node:test';
import assert from 'node:assert/strict';
import {equationNode} from '../js/inline-equation.js';
import {positionFromEquationKeyboard} from '../js/text-equation-caret.js';
test('TXT-064 math is focusable, named and an atomic image-hidden token',()=>{
 const previous=globalThis.document;
 try{
  globalThis.document={createElement(tag){return {tagName:tag.toUpperCase(),style:{},attrs:{},
   setAttribute(k,v){this.attrs[k]=v;},append(child){this.image=child;}};}};
  const node=equationNode({source:'x^2',src:'data:image/png;base64,AAAA',w:50,h:30},24);
  assert.equal(node.tabIndex,0);
  assert.equal(node.contentEditable,'false');
  assert.equal(node.attrs.role,'math');
  assert(node.attrs['aria-label'].includes('x^2'));
  assert.match(node.attrs['aria-description'],/Shift/);
  assert.match(node.attrs['aria-keyshortcuts'],/Enter/);
  assert.equal(node.image.attrs['aria-hidden'],'true');
 }finally{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;}
});
test('TXT-064 arrows, whole-atom Shift selection and Escape from focused RTL math',()=>{
 const oldDocument=globalThis.document,oldStyle=globalThis.getComputedStyle;
 try{
  const events=[];
  globalThis.document={createRange(){return {
   setStartBefore(node){events.push(['before',node]);},
   setEndAfter(node){events.push(['after',node]);},
   collapse(before){events.push(['collapse',before]);}
  };}};
  globalThis.getComputedStyle=()=>({direction:'rtl'});
  const math={nodeType:1,tagName:'SPAN',dataset:{equation:'{}'},childNodes:[]};
  const block={nodeType:1,tagName:'DIV',childNodes:[math],contains(n){return n===math;}};
  const root={children:[block],contains(n){return n===math;},focus(){this.focused=true;}};
  math.parentNode=block;
  const selection={removeAllRanges(){this.cleared=true;},addRange(r){this.range=r;},
   setBaseAndExtent(...args){this.points=args;}};
  assert(positionFromEquationKeyboard(root,selection,math,'ArrowLeft'));
  assert.deepEqual(events.at(-1),['collapse',false]);
  assert(root.focused&&selection.cleared);
  assert(positionFromEquationKeyboard(root,selection,math,'ArrowRight',true));
  assert.deepEqual(selection.points.slice(1,4),[1,block,0]);
  assert(positionFromEquationKeyboard(root,selection,math,'Escape'));
  assert.deepEqual(events.at(-1),['collapse',false]);
  assert.equal(positionFromEquationKeyboard(root,selection,math,'Enter'),false);
 }finally{
  if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;
  if(oldStyle===undefined)delete globalThis.getComputedStyle;else globalThis.getComputedStyle=oldStyle;
 }
});
