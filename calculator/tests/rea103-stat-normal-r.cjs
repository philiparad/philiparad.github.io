/* REA-103 — Original fx-991ES STAT R(t) normal upper-tail regression.
 * Run: node calculator/tests/rea103-stat-normal-r.cjs
 * No original hardware capture or parity claim is implied.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const M=require('../js/math-engine.js'),STAT=require('../js/stat-normal.js');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const opts={model:'fx-991es',mode:'STAT',statOriginalDistr:true};
let count=0;
function test(label,fn){try{fn();count++}catch(e){e.message=label+': '+e.message;throw e}}
function near(actual,expected,rel=2e-9){
 assert.ok(Number.isFinite(actual));
 assert.ok(Math.abs(actual-expected)<=Math.max(1e-30,Math.abs(expected)*rel),
  String(actual)+' != '+String(expected));
}
const cases=[
 [0,0.5],[1,0.158655253931457],[-1,0.841344746068543],
 [2,0.0227501319481792],[-2,0.977249868051821],
 [3,0.00134989803163009],[-3,0.99865010196837],
 [5,2.86651571879193e-7],[-5,0.999999713348428],
 [8,6.22096057427178e-16],[-8,0.9999999999999993],
 [10,7.61985302416047e-24],[-10,1],
 [12,1.77648211207768e-33],[-12,1]
];
for(const [t,expected] of cases){
 test('R('+t+') reference',()=>near(M.evaluate('R('+t+')',opts),expected));
 test('R('+t+') normal backend',()=>near(STAT.calculate('R',t),expected));
 test('R('+t+') within probability range',()=>{
  const result=M.evaluate('R('+t+')',opts);
  assert.ok(result>=0&&result<=1);
 });
 test('P(t)+R(t)=1 for '+t,()=>{
  near(M.evaluate('P('+t+')',opts)+M.evaluate('R('+t+')',opts),1,1e-12);
 });
 test('R(t)=P(-t) for '+t,()=>{
  near(M.evaluate('R('+t+')',opts),M.evaluate('P('+(-t)+')',opts));
 });
 test('R(t)+Q(t)=0.5 for '+t,()=>{
  near(M.evaluate('R('+t+')',opts)+M.evaluate('Q('+t+')',opts),0.5,1e-12);
 });
}
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 for(const mode of ['COMP','STAT','CMPLX','TABLE']){
  for(const allowed of [false,true]){
   test('mode gate '+model+' '+mode+' '+allowed,()=>{
    const context={model,mode,statOriginalDistr:allowed};
    if(model==='fx-991es'&&mode==='STAT'&&allowed)
     near(M.evaluate('R(0)',context),0.5);
    else assert.throws(()=>M.evaluate('R(0)',context),/Argument ERROR/);
   });
  }
 }
}
for(const src of ['R()','R(1,2)','R(1,2,3)']){
 test('invalid syntax '+src,()=>assert.throws(()=>M.evaluate(src,opts),/Syntax ERROR|Argument ERROR/));
}
for(const src of ['R(1/0)','R(sqrt(-1))','R(1e100)']){
 test('invalid domain '+src,()=>assert.throws(()=>M.evaluate(src,opts),/Math ERROR/));
}
test('R(Ans)',()=>near(M.evaluate('R(Ans)',{...opts,ans:2}),0.0227501319481792));
test('composed expression',()=>near(M.evaluate('2*R(0)+R(1)',opts),1.158655253931457));
test('large tail never cancels to zero',()=>{
 assert.ok(M.evaluate('R(8)',opts)>0);
 assert.ok(M.evaluate('R(10)',opts)>0);
 assert.ok(M.evaluate('R(12)',opts)>0);
});
test('original menu command is R(',()=>{
 const start=app.indexOf('function statDistr(){');
 const end=app.indexOf('function statDistrInput(kind)',start);
 assert.ok(start>=0&&end>start);
 const snippet=app.slice(start,end);
 assert.match(snippet,/action:\(\)=>originalStatRInput\(\)/);
 assert.match(snippet,/function originalStatRInput\(\)/);
 assert.match(snippet,/insert\('R\('\)/);
});
test('menu action inserts editable R( and forbids other editions',()=>{
 const start=app.indexOf('function statDistr(){'),end=app.indexOf('function statDistrInput(kind)',start);
 const code=app.slice(start,end);
 let choices,inserted=null,rejected=false;
 const state={model:'fx-991es',mode:'STAT',statTable:{paired:false,regressionType:'1VAR'},
  menuReturnScreen:'stat-table',screen:'menu',editor:null};
 const driver=new Function('state','releaseModifier','optionDialog','notify','paint',
  'STRUCT','syncEditor','insert',code+';return {statDistr,originalStatRInput};')(
   state,()=>{},(title,items)=>{choices=items},
   ()=>{rejected=true},()=>{},
   {create:()=>({fresh:true})},()=>{},text=>{inserted=text});
 driver.statDistr();
 assert.equal(choices.length,4);
 choices[2].action();
 assert.equal(inserted,'R(');
 assert.equal(state.screen,'edit');
 assert.deepEqual(state.editor,{fresh:true});
 state.model='fx-991es-plus-c';choices=null;
 driver.statDistr();assert.equal(choices,null);assert.ok(rejected);
});
test('1-VAR-only equals path authorizes standard normal functions',()=>{
 const start=app.indexOf("if(state.mode==='STAT'&&state.model==='fx-991es'&&state.statTable){");
 const end=app.indexOf("if(state.mode!=='COMP'&&state.mode!=='CMPLX')",start);
 assert.ok(start>=0&&end>start);
 const src=app.slice(start,end);
 assert.match(src,/statOriginalDistr:!state\.statTable\.paired/);
 assert.match(src,/state\.statTable\.regressionType==='1VAR'/);
});
test('PLUS C DIST unrelated to original R',()=>{
 const start=app.indexOf('function statDistr(){');
 const end=app.indexOf('function statDistrInput(kind)',start);
 assert.doesNotMatch(app.slice(start,end),/DIST\.calculate|distMenu\(/);
});
console.log('REA-103 PASS '+count+' isolated reference, upper-tail, model and menu checks; physical parity unverified');
