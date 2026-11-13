import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,parseBackup,serializeBackup} from '../js/model.js';
import {validateParagraphs,paragraphRuns} from '../js/rich-text.js';
import {equationLines,drawEquationText} from '../js/inline-equation.js';

test('RTL/LTR paragraphs round trip through editable lesson backups',()=>{
 const board=createBoard();
 board.items=[{id:'txt',type:'text',x:0,y:0,w:400,h:100,fontSize:24,
   text:'שלום English\nEnglish עברית',
   paragraphs:[{align:'right',list:'none',dir:'rtl'},{align:'left',list:'none',dir:'ltr'}]}];
 const restored=parseBackup(serializeBackup(board)).items[0];
 assert.deepEqual(restored.paragraphs,board.items[0].paragraphs);
 assert.deepEqual(paragraphRuns(restored).map(p=>p.dir),['rtl','ltr']);
});

test('legacy paragraph data remains valid; unrecognized direction is rejected',()=>{
 assert.doesNotThrow(()=>validateParagraphs([{align:'auto',list:'none'}],'Hello'));
 assert.throws(()=>validateParagraphs([{align:'auto',list:'none',dir:'sideways'}],'Hello'),/Invalid text paragraphs/);
});

test('SVG layout honors explicit direction even when first word is opposite language',()=>{
 const rows=[
  {align:'right',list:'none',dir:'rtl',runs:[{text:'English שלום'}]},
  {align:'left',list:'none',dir:'ltr',runs:[{text:'שלום English'}]}
 ];
 const layout=equationLines(rows,500,24,text=>text.length*10);
 assert.deepEqual(layout.map(x=>x.dir),['rtl','ltr']);
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({measureText:t=>({width:t.length*10})})})};
 try{
  const element=(tag,attributes={})=>({tag,attributes,children:[],append(node){this.children.push(node);},set textContent(value){this.content=value;}});
  const g=drawEquationText({w:500,fontSize:24},rows,element);
  const spans=g.children.filter(x=>x.tag==='text');
  assert.ok(spans.some(x=>x.attributes.direction==='rtl'));
  assert.ok(spans.some(x=>x.attributes.direction==='ltr'));
  assert.ok(spans.every(x=>x.attributes['unicode-bidi']==='isolate'));
 }finally{globalThis.document=previous;}
});
