import test from 'node:test';
import assert from 'node:assert/strict';
import {planTextFlow,applyTextFlow} from '../js/text-pagination.js';
import {A4,Pages,textOverflowWarnings} from '../js/pages.js';
import {textLayoutMetrics} from '../js/inline-equation.js';
import {paragraphRuns,validateRuns,validateParagraphs} from '../js/rich-text.js';
import {bounds} from '../js/scene.js';
import {createBoard,validateBoard,serializeBackup,parseBackup} from '../js/model.js';
import {History} from '../js/history.js';

const step=A4.h+A4.gap;
function board(items,count=1){
 return {...createBoard('Text flow test'),layout:'a4',pageCount:count,items};
}
function textItem(extra={}){
 return {id:'source',type:'text',x:40,y:A4.h-140,w:270,h:30,fontSize:24,
  text:'שלום English '.repeat(70),...extra};
}
test('plan and apply A4 continuation preserves all text, Hebrew styles and backup validity',()=>{
 const source=textItem({text:'שלום '.repeat(10)+'\n'+'English and Hebrew example '.repeat(60),
  paragraphs:[{align:'right',list:'bullet',dir:'rtl'},{align:'left',list:'none',dir:'ltr'}]});
 const input=board([source]),original=structuredClone(input);
 const plan=planTextFlow(input,source.id,A4);
 assert.ok(plan.items.length>1);
 assert.equal(plan.items[0].id,source.id);
 assert.equal(new Set(plan.items.map(item=>item.id)).size,plan.items.length);
 assert.equal(plan.items.map(item=>item.text).join(''),source.text);
 assert.ok(plan.pageCount>=plan.items.length);
 assert.deepEqual(input,original,'planning must be immutable');
 for(const fragment of plan.items){
  validateRuns(fragment.runs,fragment.text);
  validateParagraphs(fragment.paragraphs,fragment.text);
  assert.ok(fragment.h>=textLayoutMetrics(fragment,paragraphRuns(fragment)).height);
  const index=Math.floor(fragment.y/step);
  assert.ok(fragment.y>=index*step);
  assert.ok(fragment.y+bounds(fragment).h<=index*step+A4.h);
 }
 assert.equal(plan.items[0].paragraphs[0].list,'bullet');
 assert.ok(plan.items.slice(1).some(fragment=>fragment.paragraphs[0].list==='none'));
 assert.equal(applyTextFlow(input,plan),true);
 assert.equal(input.pageCount,plan.pageCount);
 validateBoard(input);
 const restored=parseBackup(serializeBackup(input));
 assert.equal(restored.items.map(item=>item.text).join(''),source.text);
});
test('flow preserves inline equations and formatting without duplicating equation tokens',()=>{
 const equation={source:'x^2+1',src:'data:image/png;base64,AAAA',w:100,h:40};
 const source=textItem({text:'פתרון '+String.fromCharCode(0xfffc)+' '+('Explain the formula '.repeat(90)),
  runs:[{text:'פתרון ',bold:true,color:'#b42318'},
   {text:'\uFFFC',equation},
   {text:' '+('Explain the formula '.repeat(90)),italic:true}],
  paragraphs:[{align:'right',list:'none',dir:'rtl'}]});
 const input=board([source]),plan=planTextFlow(input,source.id,A4);
 assert.ok(plan.items.length>1);
 assert.equal(plan.items.flatMap(item=>item.runs).filter(run=>run.equation).length,1);
 assert.equal(plan.items.flatMap(item=>item.runs).find(run=>run.equation).equation.source,'x^2+1');
 assert.ok(plan.items[0].runs.some(run=>run.bold));
 assert.ok(plan.items.slice(1).some(item=>item.runs.some(run=>run.italic)));
 assert.equal(plan.items.map(item=>item.text).join(''),source.text);
 assert.equal(textOverflowWarnings({...input,items:plan.items,pageCount:plan.pageCount}).length,0);
});
test('text beginning at bottom moves to the next page retaining its original ID',()=>{
 const source=textItem({y:A4.h-7,text:'Short',paragraphs:[{align:'left',list:'none',dir:'ltr'}]});
 const plan=planTextFlow(board([source]),source.id,A4);
 assert.ok(plan);
 assert.equal(plan.items.length,1);
 assert.equal(plan.items[0].id,source.id);
 assert.equal(plan.items[0].y,step+24);
 assert.equal(plan.pageCount,2);
});
test('unsupported or unsafe changes are rejected without changing the lesson',()=>{
 const source=textItem(),input=board([source]),original=structuredClone(input);
 for(const property of [{locked:true},{groupId:'group'},{rotation:30},{x:-1},{x:750}]){
  assert.throws(()=>planTextFlow(board([{...source,...property}]),source.id,A4));
 }
 assert.throws(()=>planTextFlow(board([{...source,paragraphs:[{align:'right',list:'number',dir:'rtl'}]}]),source.id,A4),/Numbered lists/);
 const occupied=board([source,{id:'occupied',type:'rectangle',x:20,y:step+20,w:380,h:500}],2);
 assert.throws(()=>planTextFlow(occupied,source.id,A4),/another object/);
 assert.deepEqual(input,original);
 assert.equal(planTextFlow(board([textItem({y:30,text:'Tiny'})]),source.id,A4),null);
});
test('A4 page limit prevents partial pagination or data loss',()=>{
 const source=textItem({y:99*step+A4.h-10,text:'One two three four five six seven eight'.repeat(10)});
 const input=board([source],100),original=structuredClone(input);
 assert.throws(()=>planTextFlow(input,source.id,A4),/100 A4 pages/);
 assert.deepEqual(input,original);
});

test('flow is a single undoable history step and redo restores each continuation',()=>{
 const source=textItem(),input=board([source]),before=structuredClone(input);
 const history=new History(input),plan=planTextFlow(input,source.id,A4);
 assert.ok(plan.items.length>1);
 applyTextFlow(input,plan);
 assert.equal(history.commit(input),true);
 assert.equal(history.past.length,1);
 const after=structuredClone(input);
 assert.deepEqual(history.undo(),before);
 assert.deepEqual(history.redo(),after);
});
test('bullet continuation suppresses repeated bullets while retaining list metadata',()=>{
 const source=textItem({text:'חשבון '.repeat(90),
  paragraphs:[{align:'right',list:'bullet',dir:'rtl'}]}),input=board([source]),plan=planTextFlow(input,source.id,A4);
 assert.ok(plan.items.length>1);
 assert.equal(plan.items[0].paragraphs[0].list,'bullet');
 for(const fragment of plan.items.slice(1)){
  assert.equal(fragment.paragraphs[0].list,'none');
  assert.equal(fragment.paragraphs[0].dir,'rtl');
 }
 assert.equal(plan.items.map(fragment=>fragment.text).join(''),source.text);
});
