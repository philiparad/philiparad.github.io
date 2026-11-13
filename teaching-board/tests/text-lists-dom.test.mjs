import test from 'node:test';
import assert from 'node:assert/strict';
import {readRichDocument,writeRuns,validateRuns,validateParagraphs} from '../js/rich-text.js';
import {toggleParagraphLists} from '../js/text-lists.js';

class TextNode {
 constructor(text){this.nodeType=3;this.textContent=text;this.childNodes=[];}
}
class Element {
 constructor(tag){this.nodeType=1;this.tagName=tag.toUpperCase();this.childNodes=[];this.children=[];this.style={};this.dataset={};}
 append(...nodes){for(const n of nodes){n.parentNode=this;n.parentElement=this;this.childNodes.push(n);if(n.nodeType===1)this.children.push(n);}}
 replaceChildren(...nodes){this.childNodes=[];this.children=[];this.append(...nodes);}
 getAttribute(name){return this[name]??null;}
 set textContent(value){this.replaceChildren(new TextNode(value));}
 get textContent(){return this.childNodes.map(n=>n.textContent).join('');}
}
const previousDocument=globalThis.document;
globalThis.document={createElement:tag=>new Element(tag)};

test('bullets and numbering survive HTML write/read without losing mixed RTL or emphasis',()=>{
 const item={
  text:'שלום\nEnglish \u03c0\nפתרון',
  runs:[{text:'שלום\n',bold:true},{text:'English \u03c0\n',italic:true},{text:'פתרון',underline:true}],
  paragraphs:[
   {align:'right',list:'none',dir:'rtl'},
   {align:'left',list:'number',dir:'ltr'},
   {align:'center',list:'none',dir:'rtl'}
  ]
 };
 const changed={...item,paragraphs:toggleParagraphLists(item.paragraphs,[0,2],'bullet')};
 const root=new Element('div');
 writeRuns(root,changed);
 assert.deepEqual(root.children.map(e=>e.tagName),['UL','OL','UL']);
 const read=readRichDocument(root,changed);
 validateRuns(read.runs,item.text);
 validateParagraphs(read.paragraphs,item.text);
 assert.equal(read.runs.map(r=>r.text).join(''),item.text);
 assert.deepEqual(read.paragraphs,changed.paragraphs);
 assert.equal(read.runs[0].bold,true);
 assert.equal(read.runs.at(-1).underline,true);
 const restored={...item,runs:read.runs,paragraphs:toggleParagraphLists(read.paragraphs,[0,2],'bullet')};
 writeRuns(root,restored);
 assert.deepEqual(root.children.map(e=>e.tagName),['DIV','OL','DIV']);
 assert.equal(readRichDocument(root,restored).runs.map(r=>r.text).join(''),item.text);
});
