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

test('TXT-071 first calculator result still appears exactly at the visible center',async()=>{
 const {calculatorAnswerPlacement}=await import('../js/calculator-answer.js');
 const item=calculatorTextItem(base(),'1/3',26);
 const placed=calculatorAnswerPlacement(item,{x:550,y:350},{x:0,y:0,w:1100,h:700});
 assert.deepEqual(placed,{x:550-item.w/2,y:350-item.h/2});
});
test('TXT-071 successive answers choose separate nearby visible positions',async()=>{
 const {calculatorAnswerPlacement}=await import('../js/calculator-answer.js');
 const item=calculatorTextItem(base(),'1/3',26);
 const center={x:550,y:350},view={x:0,y:0,w:1100,h:700},occupied=[];
 const positions=[];
 for(let i=0;i<5;i++){
  const at=calculatorAnswerPlacement(item,center,view,occupied);
  positions.push(at);
  occupied.push({...at,w:item.w,h:item.h});
  assert(at.x>=8&&at.y>=8&&at.x+item.w<=view.w-8&&at.y+item.h<=view.h-8);
 }
 assert.equal(new Set(positions.map(p=>p.x+','+p.y)).size,5);
 for(let i=0;i<occupied.length;i++)for(let j=i+1;j<occupied.length;j++){
  const a=occupied[i],b=occupied[j];
  assert(!(a.x<b.x+b.w+16&&a.x+a.w+16>b.x&&
    a.y<b.y+b.h+16&&a.y+a.h+16>b.y),'Answers overlap: '+JSON.stringify([a,b]));
 }
 assert(positions[1].y>positions[0].y,'Second answer should be placed below center');
 assert(positions[2].y<positions[0].y,'Third answer should be placed above center');
});
test('TXT-071 existing lesson content is avoided and position follows zoomed viewport',async()=>{
 const {calculatorAnswerPlacement}=await import('../js/calculator-answer.js');
 const item=calculatorTextItem(base(),'42',26);
 const center={x:1200,y:400},view={x:800,y:100,w:800,h:600};
 const blocked=[{x:1100,y:350,w:210,h:100}];
 const placed=calculatorAnswerPlacement(item,center,view,blocked);
 assert(placed.x>=view.x+8&&placed.y>=view.y+8);
 assert(placed.x+item.w<=view.x+view.w-8);
 assert(placed.y+item.h<=view.y+view.h-8);
 assert(!(placed.x<blocked[0].x+blocked[0].w+16&&
   placed.x+item.w+16>blocked[0].x&&
   placed.y<blocked[0].y+blocked[0].h+16&&
   placed.y+item.h+16>blocked[0].y));
});
test('TXT-071 fully occupied or tiny boards retain centered fallback',async()=>{
 const {calculatorAnswerPlacement}=await import('../js/calculator-answer.js');
 const item=calculatorTextItem(base(),'42',26);
 const center={x:90,y:90};
 const expected={x:center.x-item.w/2,y:center.y-item.h/2};
 assert.deepEqual(calculatorAnswerPlacement(item,center,{x:0,y:0,w:180,h:180}),expected);
 assert.deepEqual(calculatorAnswerPlacement(item,center,{x:0,y:0,w:1000,h:1000},
  [{x:0,y:0,w:1000,h:1000}]),expected);
});
