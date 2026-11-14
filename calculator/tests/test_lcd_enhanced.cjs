/* High-resolution LCD structural and drawing regression.
 * node calculator/tests/test_lcd_enhanced.cjs
 */
'use strict';
const assert=require('node:assert/strict');
require('../js/lcd-viewport.js');
const legacy=require('../js/display.js');
const editor=require('../js/structured-editor.js');
const lcd=require('../js/lcd-enhanced.js');
const fields={
 fraction:['numerator','denominator'],mixed:['integer','numerator','denominator'],
 squareRoot:['radicand'],cubeRoot:['radicand'],nthRoot:['index','radicand'],
 power:['exponent'],exp10:['exponent'],recurring:['period'],
 logBase:['base','argument'],derivative:['expression','at'],
 integral:['expression','lower','upper'],summation:['expression','lower','upper']
};
const node=(type,filled=false)=>({type,parts:Object.fromEntries(fields[type].map(key=>[key,filled?[{type:'char',value:'2'}]:[]]))});
const state=(root,options={})=>({
 power:true,mode:'COMP',screen:'edit',math:true,contrast:5,
 editor:{root,path:[],offset:0},viewport:{inputX:0,inputY:0},
 input:'',result:'0',...options
});
const makeCanvas=()=>{
 const ops=[];
 const ctx={
  createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
  putImageData:()=>ops.push('legacy'),save:()=>ops.push('save'),
  restore:()=>ops.push('restore'),scale:()=>{},beginPath:()=>{},
  rect:()=>{},clip:()=>{},fillRect:()=>ops.push('fill'),
  moveTo:()=>{},lineTo:()=>{},stroke:()=>ops.push('vector'),
  fillText:()=>ops.push('text'),strokeRect:()=>ops.push('slot'),
  bezierCurveTo:()=>ops.push('curve')
 };
 return {width:960,height:310,getContext:()=>ctx,ops};
};
let tested=0;
for(const type of Object.keys(fields)){
 for(const filled of [false,true]){
  const exp=[node(type,filled)];
  const s=state(exp),layout=lcd.measureNodes(exp);
  assert.ok(layout.width>0&&layout.ascent>=0&&layout.descent>=0,type);
  assert.ok(Number.isFinite(layout.width)&&Number.isFinite(layout.ascent),type);
  assert.equal(lcd.supported(s),true,type);
  const canvas=makeCanvas();
  assert.equal(lcd.draw(canvas,s),'enhanced',type);
  assert.ok(canvas.ops.includes('legacy')&&canvas.ops.includes('fill')&&canvas.ops.includes('vector')||
    canvas.ops.includes('legacy')&&canvas.ops.includes('fill')&&canvas.ops.includes('text'),type);
  tested++;
 }
 const ed=editor.create();
 editor.template(ed,type);
 const blank=lcd.measureNodes(ed.root);
 editor.insert(ed,'7');
 const entered=lcd.measureNodes(ed.root);
 assert.ok(entered.width>0&&blank.width>0,type);
 const draw=makeCanvas();
 assert.equal(lcd.draw(draw,state(ed.root,{editor:ed})),'enhanced');
 tested++;
}
const nested=node('fraction');
nested.parts.numerator=[node('squareRoot',true)];
nested.parts.denominator=[node('integral',true)];
for(const inputY of [0,4,10,20]){
 const canvas=makeCanvas();
 assert.equal(lcd.draw(canvas,state([nested],{viewport:{inputX:0,inputY}})),'enhanced');
 tested++;
}
for(const mode of ['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR']){
 const canvas=makeCanvas();
 const s=state([node('fraction')],{mode});
 assert.equal(lcd.draw(canvas,s),['STAT','BASE-N','MATRIX','VECTOR'].includes(mode)?'authentic':'enhanced');
 tested++;
}
for(const screen of ['menu','prompt','error','table-grid','flow-result']){
 const canvas=makeCanvas();
 const fallback=state([node('squareRoot')],{
  screen,menu:[],menuEntries:[],menuPage:0,menuPageSize:6,menuTitle:'MODE',
  flow:{title:'TEST',fields:[{id:'value',label:'X'}],index:0,buffer:''},
  error:'Math ERROR',outputLines:[],outputPage:0
 });
 assert.equal(lcd.draw(canvas,fallback),'authentic');
 tested++;
}
// High-resolution answer line is independent of whether the input
// expression contains a structured editor node. This guards the 4√6 case.
for(const chosen of [
 {kind:'surd',text:'4√6'},
 {kind:'surd',text:'√2+3√5'},
 {kind:'pi',text:'2π'},
 {kind:'decimal',text:'12345.6789'},
 {kind:'fraction',text:'7/12',numerator:'7',denominator:'12'},
 {kind:'mixed',text:'2 1/3',integer:'2',numerator:'1',denominator:'3'},
 {kind:'recurring',text:'0.123',initial:'0.1',period:'23'}
]){
 const answer=state([],{screen:'result',result:chosen.text,
   resultPresentation:{chosen},editor:{root:[],path:[],offset:0}});
 assert.ok(lcd.resultModel(answer),'result recognized: '+chosen.text);
 const surface=makeCanvas();
 assert.equal(lcd.draw(surface,answer),'enhanced',chosen.text);
 assert.ok(surface.ops.includes('fill')&&surface.ops.includes('text'),
   'result raster overlay and vector text: '+chosen.text);
 if(chosen.kind==='surd'||chosen.kind==='fraction')
  assert.ok(surface.ops.includes('vector'),'vector geometry: '+chosen.text);
 tested++;
}
// Do not hide or overwrite legacy output when the result cannot be safely
// laid out or when a user is horizontally scrolling a long result.
for(const extra of [
 {result:'1234567890123456789012345',resultPresentation:null},
 {result:'3√2',viewport:{inputX:0,inputY:0,resultX:3}},
 {result:'8',mode:'BASE-N'},
 {result:'8',math:false}
]){
 const fallback=state([],{screen:'result',...extra});
 assert.equal(lcd.resultModel(fallback),null);
 const surface=makeCanvas();
 assert.equal(lcd.draw(surface,fallback),'authentic');
 tested++;
}
const plain=makeCanvas();
assert.equal(lcd.draw(plain,state([{type:'char',value:'2'}])),'authentic');
tested++;
const poweredOff=makeCanvas();
assert.equal(lcd.draw(poweredOff,state([node('fraction')],{power:false})),'authentic');
tested++;
assert.equal(typeof legacy.draw,'function');
console.log('PASS: '+tested+' enhanced LCD layout and drawing cases');
