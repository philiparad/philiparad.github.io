import test from 'node:test';
import assert from 'node:assert/strict';
import {formatDocumentRange,rangeDocumentOffsets} from '../js/text-range-format.js';
import {validateRuns,validateParagraphs} from '../js/rich-text.js';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';

const equation={source:'x^2',src:'data:image/png;base64,AAAA',w:90,h:45};
const fixture=()=>({
 runs:[
  {text:'שלום ',bold:false},
  {text:'\n'},
  {text:'Solve ',italic:true},
  {text:'\uFFFC',equation},
  {text:' now',color:'#000000'},
  {text:'\n'},
  {text:'סוף',underline:true}
 ],
 paragraphs:[
  {align:'right',list:'bullet',dir:'rtl'},
  {align:'left',list:'number',dir:'ltr'},
  {align:'center',list:'none',dir:'rtl'}
 ]
});
test('cross-paragraph bold preserves unselected prefixes, lists and math',()=>{
 const input=fixture(),text=input.runs.map(r=>r.text).join('');
 const after=formatDocumentRange(input,2,text.length-2,'bold');
 assert.ok(after);
 assert.equal(after.runs.map(r=>r.text).join(''),text);
 assert.deepEqual(after.paragraphs,input.paragraphs);
 assert.equal(input.runs[0].bold,false);
 assert.ok(after.runs.find(r=>r.text==='של'&&!r.bold));
 assert.ok(after.runs.find(r=>r.text==='ום '&&r.bold));
 assert.equal(after.runs.find(r=>r.equation).equation.source,'x^2');
 assert.equal(after.runs.find(r=>r.equation).bold,undefined);
 validateRuns(after.runs,text);
 validateParagraphs(after.paragraphs,text);
 const board=createBoard();
 board.items=[{id:'t',type:'text',x:0,y:0,w:350,h:120,text,runs:after.runs,paragraphs:after.paragraphs}];
 assert.deepEqual(parseBackup(serializeBackup(board)).items,board.items);
});
test('cross-paragraph colors, clear-format and mixed toggle keep exact text',()=>{
 const input=fixture(),text=input.runs.map(r=>r.text).join('');
 const colored=formatDocumentRange(input,1,text.length,'foreColor','#B42318');
 assert.ok(colored.runs.some(r=>r.color==='#b42318'));
 assert.equal(colored.runs.find(r=>r.equation).color,undefined);
 const reset=formatDocumentRange(colored,1,text.length,'removeFormat');
 assert.equal(reset.runs.map(r=>r.text).join(''),text);
 assert.ok(reset.runs.some(r=>r.text==='ש'));
 assert.equal(reset.runs.find(r=>r.equation).equation.source,'x^2');
 assert.deepEqual(reset.paragraphs,input.paragraphs);
 assert.equal(formatDocumentRange(input,0,1,'foreColor','red;unsafe'),null);
 assert.equal(formatDocumentRange(input,0,0,'bold'),null);
 assert.equal(formatDocumentRange(input,-1,4,'bold'),null);
});
test('toggle formatting off when all intersecting text is already formatted',()=>{
 const input={runs:[{text:'אב\n',bold:true},{text:'CD',bold:true}],paragraphs:[{align:'right',list:'none',dir:'rtl'},{align:'left',list:'none',dir:'ltr'}]};
 const toggled=formatDocumentRange(input,1,4,'bold');
 assert.ok(toggled.runs.some(r=>r.text==='ב'&&!r.bold));
 assert.ok(toggled.runs.some(r=>r.text==='C'&&!r.bold));
 assert.ok(toggled.runs.some(r=>r.text==='א'&&r.bold));
 assert.ok(toggled.runs.some(r=>r.text==='D'&&r.bold));
});
test('selection offsets include a single atomic inline equation token',()=>{
 const make=(tag,parent=null)=>{const n={nodeType:1,tagName:tag,parentNode:parent,childNodes:[],children:[],contains(x){return x===this||this.childNodes.some(c=>c.contains?.(x)||c===x);}};if(parent){parent.childNodes.push(n);parent.children.push(n);}return n;};
 const root=make('DIV'),p1=make('DIV',root),p2=make('DIV',root),t1={nodeType:3,textContent:'Hi',parentNode:p1},t2={nodeType:3,textContent:'yo',parentNode:p2};
 p1.childNodes.push(t1);p2.childNodes.push(t2);
 const snapshot={runs:[{text:'Hi\nyo'}],paragraphs:[{align:'auto',list:'none'},{align:'auto',list:'none'}]};
 const range={collapsed:false,startContainer:t1,startOffset:1,endContainer:t2,endOffset:1};
 const selection={rangeCount:1,getRangeAt:()=>range};
 const previous=globalThis.document;
 globalThis.document={createRange:()=>({selectNodeContents(b){this.block=b;},setEnd(n,i){this.end=[n,i];},toString(){return this.end[0].textContent.slice(0,this.end[1]);},cloneContents(){return {querySelectorAll:()=>[]};}})};
 try{assert.deepEqual(rangeDocumentOffsets(root,selection,snapshot),{start:1,end:4});}
 finally{globalThis.document=previous;}
});
