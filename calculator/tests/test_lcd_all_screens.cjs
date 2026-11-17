/* Complete LCD text-output inventory: typography should be vector in all
 * text-bearing modes. This tests screen routing and draw calls; Chromium
 * screenshot review is still required for pixel-level visual acceptance.
 */
'use strict';
const assert=require('node:assert/strict');
require('../js/lcd-viewport.js');
const legacy=require('../js/display.js');
const lcd=require('../js/lcd-enhanced.js');
globalThis.FreshTable={format:v=>String(v),active:t=>t.rows[t.row].f};
globalThis.FreshEquation={format:v=>String(v)};
const base=()=>({
 power:true,contrast:5,math:true,mode:'COMP',screen:'edit',
 input:'Ans',cursor:3,editor:{root:[],path:[],offset:0},
 viewport:{inputX:0,inputY:0,resultX:0,flowX:0},result:'0',
 resultPresentation:null,menu:[],menuEntries:[],menuPageSize:8,
 menuPage:0,menuTitle:'MODE',menuKind:'mode'
});
const menuEntries=['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR']
 .map((label,i)=>({number:i+1,label}));
const eqnEditor={
 rows:[['a','b','c'],['d','e','f']],row:0,col:0,editing:true,
 buffer:'0',values:{a:0,b:0,c:0,d:0,e:0,f:0}
};
const matrixEditor={name:'MatA',matrix:{rows:2,cols:2,data:[[1,2],[3,4]]},
 row:0,col:0,buffer:'1',error:''};
const vectorEditor={name:'VctA',vector:{dimension:3,data:[1,2,3]},
 index:0,buffer:'1',error:''};
const flow={title:'SOLVE',fields:[{id:'value',label:'X'}],index:0,
 buffer:'12',cursor:2,editing:true};
const scenarios=[
 ['input-Ans',{input:'Ans'}],
 ['menu-mode',{screen:'menu',menuKind:'mode',menu:menuEntries,menuEntries}],
 ['menu-eqn-types',{screen:'menu',menuKind:'eqn-type',mode:'EQN',
   menu:menuEntries.slice(0,4),menuEntries:menuEntries.slice(0,4)}],
 ['menu-general',{screen:'menu',menuKind:'normal',menuTitle:'SETUP',
   menu:menuEntries.slice(0,6),menuEntries:menuEntries.slice(0,6)}],
 ['menu-matrix-dims',{screen:'menu',menuKind:'matrix-dims',mode:'MATRIX',
   menu:menuEntries.slice(0,6),menuEntries:menuEntries.slice(0,6)}],
 ['menu-matrix',{screen:'menu',menuKind:'matrix',mode:'MATRIX',
   menu:menuEntries.slice(0,6),menuEntries:menuEntries.slice(0,6)}],
 ['menu-vector',{screen:'menu',menuKind:'vector',mode:'VECTOR',
   menu:menuEntries.slice(0,6),menuEntries:menuEntries.slice(0,6)}],
 ['eqn-coeff',{screen:'eqn-coeff',mode:'EQN',eqnEditor}],
 ['eqn-result',{screen:'eqn-result',mode:'EQN',
   eqnSession:{type:'2',index:0,solutions:[{label:'X',value:3}]}}],
 ['base-n-edit',{screen:'edit',mode:'BASE-N',input:'101',baseRadix:'BIN'}],
 ['base-n-result',{screen:'result',mode:'BASE-N',input:'101',
   result:'0000000000000101',baseRadix:'BIN'}],
 ['contrast',{screen:'contrast'}],
 ['pending-memory',{pendingMemory:'STO'}],
 ['error',{screen:'error',error:'Math ERROR'}],
 ['prompt',{screen:'prompt',flow}],
 ['prompt-table',{screen:'prompt',mode:'TABLE',flow:{
   ...flow,title:'TABLE 1',fields:[{id:'expression',label:'f(X)'}],
   buffer:'X+1'}}],
 ['flow-result',{screen:'flow-result',
   outputLines:['X=1','Y=2','Z=3'],outputPage:0}],
 ['stat-table',{screen:'stat-table',mode:'STAT',statTable:{
   paired:false,frequency:false,regressionType:'1VAR',
   rows:[{X:1},{X:2}],row:0,col:0,buffer:'1'}}],
 ['matrix-table',{screen:'matrix-table',mode:'MATRIX',matrixEditor}],
 ['matrix-result',{screen:'matrix-result',mode:'MATRIX',matrixView:matrixEditor}],
 ['matrix-parameter',{screen:'matrix-parameter',mode:'MATRIX',
   matrixParameter:{operator:'power',name:'MatA',buffer:'2'}}],
 ['matrix-scalar',{screen:'matrix-scalar',mode:'MATRIX',result:'9'}],
 ['vector-table',{screen:'vector-table',mode:'VECTOR',vectorEditor}],
 ['vector-result',{screen:'vector-result',mode:'VECTOR',vectorView:vectorEditor}],
 ['vector-parameter',{screen:'vector-parameter',mode:'VECTOR',
   vectorParameter:{name:'VctA',buffer:'3'}}],
 ['vector-scalar',{screen:'vector-scalar',mode:'VECTOR',result:'3',
   vectorScalarInfo:'VECTOR Result'}],
 ['constant-code',{screen:'constant-code',constantCode:{buffer:'10',error:''}}],
 ['result-number',{screen:'result',input:'2+2',result:'4'}],
 ['result-symbolic',{screen:'result',input:'sqrt(6)',result:'4√6',
   resultPresentation:{chosen:{kind:'surd',text:'4√6'}}}],
 ['result-engineering',{screen:'result',input:'1234',result:'1.234×10^3',
   resultPresentation:{chosen:{kind:'engineering',text:'1.234×10^3'}}}]
];
function canvas(){
 const operations=[],ctx={
  createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
  putImageData:()=>operations.push({type:'raster'}),
  save(){},restore(){},scale(){},beginPath(){},rect(){},clip(){},
  fillRect(x,y,w,h){operations.push({type:'clear',x,y,w,h})},
  moveTo(){},lineTo(){},stroke(){},strokeRect(){},bezierCurveTo(){},
  measureText:value=>({width:String(value).length*3.8}),
  fillText(value,x,y,maxWidth){operations.push({
   type:'text',value:String(value),x,y,maxWidth,font:ctx.font,
   color:ctx.fillStyle
  })}
 };
 return {width:960,height:310,getContext:()=>ctx,operations};
}
let count=0,characters=0;
for(const [label,override] of scenarios){
 const state={...base(),...override};
 const legacyRuns=legacy.getTextRuns(state);
 const wanted=legacyRuns.filter(g=>g.c!==' '&&
  g.x<96&&g.y<31&&g.x+4>0&&g.y+6>0);
 assert.ok(wanted.length,'expected text runs on '+label);
 const target=canvas();
 assert.equal(lcd.draw(target,state),'enhanced',label);
 const vector=target.operations.filter(op=>op.type==='text'&&
  String(op.font||'').startsWith('600 '));
 assert.ok(vector.length>=wanted.length,
  label+' should repaint every glyph with vector text ('+
  vector.length+'/'+wanted.length+')');
 assert.ok(vector.every(op=>op.maxWidth===undefined),
  label+' must render natural-width glyphs without horizontal compression');
 assert.ok(vector.every(op=>Number.isFinite(op.x)&&Number.isFinite(op.y)),
  label+' must preserve finite character positions');
 assert.ok(target.operations.some(op=>op.type==='raster'),label+' original geometry retained');
 if(label==='menu-mode'){
  const inverse=legacyRuns.filter(g=>g.inverse);
  assert.equal(inverse.length,8,'mode digits are inverted');
  assert.ok(vector.some(op=>op.value==='1'&&op.color==='rgb(215,230,215)'),
   'inverse menu digit is repainted in LCD paper color');
 }
 characters+=vector.length;count++;
}
console.log('PASS: '+count+' LCD screen classes and '+characters+
 ' high-resolution character drawings');
