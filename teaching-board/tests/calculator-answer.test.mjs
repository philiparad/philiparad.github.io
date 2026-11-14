import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,validateBoard} from '../js/model.js';
import {CALCULATOR_ANS_PROTOCOL,CALCULATOR_ANS_MAX_LENGTH,
 validAnsDisplay,calculatorTextItem,validateAnsResponse} from '../js/calculator-answer.js';

const base=()=>({
 id:'calculator-text-001',type:'text',x:100,y:200,w:1,h:1,
 stroke:'#243c59',strokeOpacity:1,fill:'none',fillOpacity:1,
 lineWidth:3,lineStyle:'solid',opacity:1,rotation:0,locked:false
});
const response=(display,id='request-123')=>({
 protocol:CALCULATOR_ANS_PROTOCOL,type:'response',id,display
});

test('calculator Ans text preserves decimal, fraction, negative, and scientific display precision',()=>{
 for(const answer of ['125.75','1/3','-0.0000123','1.23456789×10⁻⁷','√2','π/4','0']){
  assert.equal(validAnsDisplay(answer),answer);
  const item=calculatorTextItem(base(),answer,26);
  assert.equal(item.text,answer);
  assert.deepEqual(item.runs,[{text:answer}]);
  assert.deepEqual(item.paragraphs,[{align:'left',dir:'ltr',list:'none'}]);
  assert.equal(item.fontSize,26);
  assert(item.w>=200&&item.w<=680&&item.h>=70);
  const board=createBoard('Calculator Ans integration');
  board.items=[item];
  assert.doesNotThrow(()=>validateBoard(board));
 }
});

test('calculator Ans text is a new editable ordinary text object',()=>{
 const original=base();
 const item=calculatorTextItem(original,'  2/7  ',30);
 assert.equal(item.id,original.id);
 assert.equal(item.type,'text');
 assert.equal(item.text,'2/7');
 assert.equal(item.textAlign,'left');
 assert.equal(item.textStyle,'normal');
 assert.equal(item.locked,false);
 assert.equal(item.fill,'none');
 assert.equal(original.w,1,'Do not mutate the source object.');
 assert.equal(original.text,undefined);
});

test('calculator rejects untrusted or malformed result strings',()=>{
 for(const invalid of ['', '  ',null,NaN,12.5,'X'.repeat(CALCULATOR_ANS_MAX_LENGTH+1),
  'value\nnext','a\u0000b','a\u007fb','a\uFFFCb']){
  assert.equal(validAnsDisplay(invalid),null);
  assert.throws(()=>calculatorTextItem(base(),invalid));
 }
 assert.throws(()=>calculatorTextItem({...base(),x:NaN},'2'));
 assert.throws(()=>calculatorTextItem(base(),'2',Infinity));
 assert.equal(validAnsDisplay('X'.repeat(CALCULATOR_ANS_MAX_LENGTH)),
  'X'.repeat(CALCULATOR_ANS_MAX_LENGTH));
});

test('Ans iframe protocol validates type, request ID, and response payload strictly',()=>{
 assert.deepEqual(validateAnsResponse(response('1/3'),'request-123'),{text:'1/3'});
 assert.deepEqual(validateAnsResponse({...response('3'),error:undefined},'request-123'),
  {text:'3'});
 assert.deepEqual(validateAnsResponse({
  protocol:CALCULATOR_ANS_PROTOCOL,type:'response',id:'request-123',error:'no-answer'
 },'request-123'),{error:'Calculate a result before sending Ans.'});
 for(const invalid of [
  response('1/3','wrong-id'),{...response('1/3'),protocol:'other'},
  {...response('1/3'),type:'request'},{...response('1/3'),display:42},
  {...response('1/3'),error:'not-valid'},
  {...response('1/3'),display:'\uFFFC'},
  null,[],{},'data'
 ])assert.equal(validateAnsResponse(invalid,'request-123'),null);
});
