import test from 'node:test';
import assert from 'node:assert/strict';
import {writeRuns,readRichDocument} from '../js/rich-text.js';

class FakeElement {
 constructor(tag='div'){
  this.nodeType=1;
  this.tagName=tag.toUpperCase();
  this.style={};
  this.dataset={};
  this.childNodes=[];
  this.attributes={};
 }
 append(...nodes){for(const node of nodes){node.parentNode=this;this.childNodes.push(node);}}
 replaceChildren(...nodes){this.childNodes=[...nodes];}
 set textContent(value){this.childNodes=[{nodeType:3,textContent:value}];}
 get textContent(){return this.childNodes.map(n=>n.textContent).join('');}
 setAttribute(key,value){this.attributes[key]=String(value);}
 getAttribute(key){return this.attributes[key]||null;}
}
const cases=[
 {list:'none',dir:'rtl',text:'רגיל מודגש',
  runs:[{text:'רגיל ',bold:false,italic:false},
        {text:'מודגש',bold:true,italic:true}]},
 {list:'number',dir:'ltr',text:'Normal BOLD',
  runs:[{text:'Normal ',bold:false,italic:true},
        {text:'BOLD',bold:true,italic:false}]}
];
test('TXT-067 explicit normal runs override inherited bold and italic',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:tag=>new FakeElement(tag)};
 try{
  for(const sample of cases){
   const item={type:'text',w:350,fontSize:26,textStyle:'bold-italic',
    text:sample.text,runs:sample.runs,
    paragraphs:[{align:'auto',list:sample.list,dir:sample.dir}]};
   const root=new FakeElement();
   writeRuns(root,item);
   const spans=sample.list==='number'
    ?root.childNodes[0].childNodes[0].childNodes
    :root.childNodes[0].childNodes;
   assert.equal(spans.length,2);
   for(let i=0;i<spans.length;i++){
    assert.equal(spans[i].style.fontWeight,sample.runs[i].bold?'700':'400');
    assert.equal(spans[i].style.fontStyle,sample.runs[i].italic?'italic':'normal');
   }
   const saved=readRichDocument(root,item);
   assert.deepEqual(saved.runs.map(r=>({text:r.text,bold:r.bold,italic:r.italic})),
    sample.runs);
   assert.equal(saved.paragraphs[0].dir,sample.dir);
   assert.equal(saved.paragraphs[0].list,sample.list);
   const reopened=new FakeElement();
   writeRuns(reopened,{...item,runs:saved.runs,paragraphs:saved.paragraphs});
   const reopenedRuns=readRichDocument(reopened,item);
   assert.deepEqual(reopenedRuns.runs.map(r=>({text:r.text,bold:r.bold,italic:r.italic})),
    sample.runs);
  }
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
});
test('TXT-067 legacy plain bold-italic content still inherits its original style',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:tag=>new FakeElement(tag)};
 try{
  const item={type:'text',fontSize:24,w:500,text:'שלום English',
   textStyle:'bold-italic',paragraphs:[{align:'auto',list:'none',dir:'rtl'}]};
  const root=new FakeElement();
  writeRuns(root,item);
  const span=root.childNodes[0].childNodes[0];
  assert.equal(span.style.fontWeight,'700');
  assert.equal(span.style.fontStyle,'italic');
  const parsed=readRichDocument(root,item).runs;
  assert.equal(parsed.length,1);
  assert.equal(parsed[0].bold,true);
  assert.equal(parsed[0].italic,true);
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
});
