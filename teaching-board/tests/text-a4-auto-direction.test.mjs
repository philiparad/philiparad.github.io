import test from 'node:test';
import assert from 'node:assert/strict';
import {planTextFlow,applyTextFlow} from '../js/text-pagination.js';
import {A4,textOverflowWarnings} from '../js/pages.js';
import {paragraphRuns,validateParagraphs} from '../js/rich-text.js';
import {paragraphDirectionIsRtl,textLayoutMetrics} from '../js/inline-equation.js';
import {createBoard,parseBackup,serializeBackup} from '../js/model.js';

const source=(prefix,body,dir='auto')=>({
 id:'flow-direction',type:'text',x:40,y:A4.h-140,w:260,h:20,
 fontSize:24,text:prefix+' '+body.repeat(95),
 paragraphs:[{align:'auto',list:'bullet',dir}]
});
const board=item=>({...createBoard('A4 direction'),layout:'a4',pageCount:1,items:[item]});
const markers=item=>textLayoutMetrics(item,paragraphRuns(item)).lines
 .flatMap(line=>line.parts.filter(part=>part.synthetic).map(part=>part.text.trim()))
 .filter(Boolean);

for(const [name,prefix,body,dir] of [
 ['RTL Hebrew first','שלום','English explanations ','rtl'],
 ['LTR English first','English','שלום הסברים ','ltr']
]){
 test('TXT-069: '+name+' across A4 continuation pages',()=>{
  const item=source(prefix,body),b=board(item),before=structuredClone(b);
  const plan=planTextFlow(b,item.id,A4);
  assert(plan?.items.length>1,'Expected A4 continuation');
  assert.deepEqual(b,before,'Preview must not mutate original');
  assert.equal(plan.items.map(x=>x.text).join(''),item.text);
  assert.equal(plan.items[0].paragraphs[0].dir,'auto');
  for(const piece of plan.items.slice(1)){
   assert.equal(piece.paragraphs[0].dir,dir);
   assert.equal(piece.paragraphs[0].list,'none');
   assert.equal(paragraphDirectionIsRtl(paragraphRuns(piece)[0]),dir==='rtl');
   validateParagraphs(piece.paragraphs,piece.text);
  }
  assert.deepEqual(plan.items.flatMap(markers),['•']);
  applyTextFlow(b,plan);
  assert.deepEqual(textOverflowWarnings(b),[]);
  const restored=parseBackup(serializeBackup(b));
  assert.equal(restored.items.map(x=>x.text).join(''),item.text);
  assert.deepEqual(restored.items.map(x=>x.paragraphs[0].dir),
   plan.items.map(x=>x.paragraphs[0].dir));
 });
}
test('TXT-069 explicit paragraph direction always survives A4 flow unchanged',()=>{
 for(const dir of ['rtl','ltr']){
  const item=source('שלום','English explanations ',dir);
  const plan=planTextFlow(board(item),item.id,A4);
  assert(plan?.items.length>1);
  assert(plan.items.every(piece=>piece.paragraphs[0].dir===dir));
 }
});
test('TXT-069 a new paragraph retains auto direction when its predecessor splits',()=>{
 const item=source('שלום','English explanations ');
 item.text='שלום '+('English explanations '.repeat(95))+'\nEnglish second paragraph';
 item.paragraphs=[{align:'auto',list:'bullet',dir:'auto'},
  {align:'auto',list:'none',dir:'auto'}];
 const plan=planTextFlow(board(item),item.id,A4);
 assert(plan?.items.length>1);
 const matches=plan.items.flatMap(piece=>piece.paragraphs.map((meta,i)=>({
  meta,text:piece.text.split('\n')[i]
 }))).filter(part=>part.text==='English second paragraph');
 assert(matches.length>0,'Expected intact independent paragraph');
 assert(matches.every(part=>part.meta.dir==='auto'));
});
