import test from 'node:test';
import assert from 'node:assert/strict';
import {planTextFlow,applyTextFlow} from '../js/text-pagination.js';
import {A4,textOverflowWarnings} from '../js/pages.js';
import {textLayoutMetrics} from '../js/inline-equation.js';
import {paragraphRuns,readRichDocument,writeRuns,validateParagraphs} from '../js/rich-text.js';
import {createBoard,validateBoard,serializeBackup,parseBackup} from '../js/model.js';

function board(item){return {...createBoard('Numbered A4'),layout:'a4',pageCount:1,items:[item]};}
const item=(text,paragraphs,other={})=>({
 id:'ordered',type:'text',x:30,y:A4.h-160,w:245,h:22,fontSize:24,
 text,paragraphs,...other
});
function markers(item){
 return textLayoutMetrics(item,paragraphRuns(item)).lines.flatMap(line=>
   line.parts.filter(part=>part.synthetic).map(part=>part.text.trim())).filter(Boolean);
}
test('numbered entries continue 1, 2, 3 across page splits without repeated markers',()=>{
 const first='Long numbered explanation '.repeat(95);
 const source=item(first+'\nSecond entry\nThird entry',[
  {align:'right',list:'number',dir:'rtl'},
  {align:'right',list:'number',dir:'rtl'},
  {align:'right',list:'number',dir:'rtl'}
 ]);
 const b=board(source),unchanged=structuredClone(b);
 const plan=planTextFlow(b,source.id,A4);
 assert.ok(plan.items.length>1);
 assert.deepEqual(b,unchanged);
 assert.equal(plan.items.map(x=>x.text).join(''),source.text);
 assert.deepEqual(plan.items.flatMap(markers),['1.','2.','3.']);
 assert.equal(plan.items[0].id,source.id);
 assert.ok(plan.items.slice(1).some(x=>x.paragraphs[0].list==='none'),'continued text must not repeat its list number');
 for(const fragment of plan.items){
  validateParagraphs(fragment.paragraphs,fragment.text);
  assert.equal(fragment.paragraphs.length,fragment.text.split('\n').length);
 }
 assert.equal(applyTextFlow(b,plan),true);
 assert.deepEqual(textOverflowWarnings(b),[]);
 validateBoard(b);
 const restored=parseBackup(serializeBackup(b));
 assert.deepEqual(restored.items.flatMap(markers),['1.','2.','3.']);
});
test('ordered list starting at 7 preserves numbering after crossing A4 pages',()=>{
 const original=item('First '.repeat(100)+'\nSecond\nThird',[
  {align:'left',list:'number',dir:'ltr',numberStart:7},
  {align:'left',list:'number',dir:'ltr'},
  {align:'left',list:'number',dir:'ltr'}
 ]);
 const plan=planTextFlow(board(original),original.id,A4);
 assert.ok(plan.items.length>1);
 assert.deepEqual(plan.items.flatMap(markers),['7.','8.','9.']);
 assert.equal(plan.items.map(x=>x.text).join(''),original.text);
 assert.ok(plan.items.slice(1).some(fragment=>fragment.paragraphs.some(meta=>meta.numberStart===8)));
});
test('explicit numberStart is validated and survives HTML editing round-trip',()=>{
 const original=item('Step one\nStep two\nPlain ending',[
  {align:'left',list:'number',dir:'ltr',numberStart:7},
  {align:'left',list:'number',dir:'ltr'},
  {align:'right',list:'none',dir:'rtl'}
 ]);
 const previous=globalThis.document;
 class Node {
  constructor(tag){this.nodeType=1;this.tagName=tag.toUpperCase();this.childNodes=[];this.children=[];this.style={};this.dataset={};this.dir='auto';this.start=1;this.attrs={};}
  append(...nodes){for(const node of nodes){node.parentNode=this;node.parentElement=this;this.childNodes.push(node);if(node.nodeType===1)this.children.push(node);}}
  replaceChildren(...nodes){this.childNodes=[];this.children=[];this.append(...nodes);}
  set textContent(s){this.replaceChildren({nodeType:3,textContent:s});}
  get textContent(){return this.childNodes.map(n=>n.textContent).join('');}
  getAttribute(key){return this.attrs[key]??null;}
 }
 globalThis.document={createElement:tag=>new Node(tag)};
 try{
  const root=new Node('div');
  writeRuns(root,original);
  const list=root.children[0];
  assert.equal(list.tagName,'OL');
  assert.equal(list.start,7);
  assert.equal(list.children.length,2);
  const parsed=readRichDocument(root,original);
  assert.deepEqual(parsed.paragraphs,original.paragraphs);
  assert.equal(parsed.runs.map(run=>run.text).join(''),original.text);
 }finally{globalThis.document=previous;}
});
test('invalid numbered metadata is rejected before backup or print',()=>{
 assert.throws(()=>validateParagraphs([{align:'auto',list:'none',numberStart:5}],'x'),/Invalid text paragraphs/);
 for(const numberStart of [0,-5,1.5,10001,NaN,'3']){
  assert.throws(()=>validateParagraphs([{align:'auto',list:'number',numberStart}],'x'),/Invalid text paragraphs/);
 }
 assert.doesNotThrow(()=>validateParagraphs([{align:'auto',list:'number',numberStart:10000}],'x'));
});
test('numbers remain correct when a nonnumbered paragraph interrupts a list',()=>{
 const original=item('First\nComment '.repeat(35)+'\nAnother numbered',[
  ...Array.from({length:36},(_,i)=>({align:'left',list:i===0?'number':'none',dir:'ltr'})),
  {align:'left',list:'number',dir:'ltr'}
 ]);
 // source metadata must exactly match explicit newlines
 assert.equal(original.paragraphs.length,original.text.split('\n').length);
 const plan=planTextFlow(board(original),original.id,A4);
 assert.ok(plan?.items?.length>1);
 assert.deepEqual(plan.items.flatMap(markers),['1.','1.']);
});
