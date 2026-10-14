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
