/* REA-102: original fx-991ES STAT Distr Q(t) source regression.
 * Run: node calculator/tests/rea102-stat-normal-q.cjs
 * Independent standard normal integral identities; NO hardware parity claim.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const NORMAL=require('../js/stat-normal.js'),M=require('../js/math-engine.js');
const APP=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
let passed=0;
function test(name,fn){try{fn();passed++}catch(e){e.message=name+': '+e.message;throw e}}
function near(actual,want,tolerance=2e-12){
 assert.ok(Number.isFinite(actual)&&Math.abs(actual-want)<=tolerance,
  actual+' != '+want);
}
const original={model:'fx-991es',mode:'STAT',statOriginalDistr:true};
const references=[
 [0,0],[1,0.341344746068543],[-1,-0.341344746068543],
 [2,0.477249868051821],[-2,-0.477249868051821],
 [3,0.49865010196837],[-3,-0.49865010196837],
 [5,0.499999713348428],[-5,-0.499999713348428],
 [8,0.4999999999999993],[-8,-0.4999999999999993],
 [10,0.5],[-10,-0.5]
];
for(const [t,want] of references){
 test('Q('+t+') reference',()=>near(M.evaluate('Q('+t+')',original),want));
 test('Q('+t+') direct API agreement',()=>near(
  NORMAL.calculate('Q',t),M.evaluate('Q('+t+')',original)));
 test('Q('+t+') bounded between -0.5 and 0.5',()=>{
  const q=M.evaluate('Q('+t+')',original);
  assert.ok(q>=-0.5&&q<=0.5);
 });
 test('Q('+t+') equals P(t)-0.5',()=>near(
  M.evaluate('Q('+t+')',original),M.evaluate('P('+t+')',original)-0.5));
 test('Q('+t+') odd symmetry',()=>near(
  M.evaluate('Q('+t+')',original),-M.evaluate('Q('+(-t)+')',original)));
 test('P+R complements',()=>near(
  NORMAL.calculate('P',t)+NORMAL.calculate('R',t),1));
}
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 for(const mode of ['COMP','STAT','CMPLX','TABLE']){
  for(const allowFlag of [false,true]){
   test('Q gate '+model+'/'+mode+'/'+allowFlag,()=>{
    const opts={model,mode,statOriginalDistr:allowFlag};
    if(model==='fx-991es'&&mode==='STAT'&&allowFlag)near(M.evaluate('Q(0)',opts),0);
    else assert.throws(()=>M.evaluate('Q(0)',opts),/Argument ERROR/);
   });
  }
 }
}
for(const expr of ['Q()','Q(1,2)','Q(1,2,3)'])
 test('invalid argument count or syntax '+expr,
  ()=>assert.throws(()=>M.evaluate(expr,original),/Argument ERROR|Syntax ERROR/));
for(const expr of ['Q(1/0)','Q(sqrt(-1))','Q(1e100)'])
 test('invalid value '+expr,()=>assert.throws(()=>M.evaluate(expr,original),/Math ERROR/));
test('Q arithmetic composition',()=>near(
 M.evaluate('2*Q(1)+Q(-1)',original),0.341344746068543));
test('Q(Ans) retains normal answer reuse',()=>near(
 M.evaluate('Q(Ans)',{...original,ans:-2}),-0.477249868051821));
test('ordinary q variable is NOT a substitute for Q(t)',()=>{
 assert.throws(()=>M.evaluate('Q(0)',{model:'fx-991es',mode:'STAT',statOriginalDistr:false}),/Argument ERROR/);
});
test('Q menu route and original-model restriction',()=>{
 const start=APP.indexOf('function statDistr(){'),end=APP.indexOf('function statDistrInput(kind)',start);
 assert.ok(start>=0&&end>start);
 const body=APP.slice(start,end);
 assert.match(body,/action:\(\)=>originalStatQInput\(\)/);
 assert.match(body,/function originalStatQInput\(\)/);
 assert.match(body,/state\.model!=='fx-991es'/);
 assert.match(body,/insert\('Q\('\)/);
});
test('Q menu actually inserts Q( and preserves edit context',()=>{
 const start=APP.indexOf('function statDistr(){'),end=APP.indexOf('function statDistrInput(kind)',start);
 const body=APP.slice(start,end);
 const state={model:'fx-991es',mode:'STAT',statTable:{paired:false,regressionType:'1VAR'},
  menuReturnScreen:'stat-table',screen:'menu',editor:{}};
 let options,inserted='',errorNotified=false;
 const route=new Function('state','releaseModifier','optionDialog','notify','paint',
  'STRUCT','syncEditor','insert',body+';return {statDistr,originalStatQInput};')(
   state,()=>{},(_,choices)=>{options=choices},()=>{errorNotified=true},
   ()=>{},{create:()=>({created:true})},()=>{},text=>{inserted=text});
 route.statDistr();
 assert.equal(options.length,4);
 options[1].action();
 assert.equal(inserted,'Q(');
 assert.deepEqual(state.editor,{created:true});
 assert.equal(state.screen,'edit');
 state.model='fx-991es-plus-c';options=null;
 route.statDistr();
 assert.equal(options,null);
 assert.equal(errorNotified,true);
});
test('original STAT equals flow forwards 1-VAR feature gate',()=>{
 const start=APP.indexOf("if(state.mode==='STAT'&&state.model==='fx-991es'&&state.statTable){");
 const end=APP.indexOf("if(state.mode!=='COMP'&&state.mode!=='CMPLX')",start);
 const route=APP.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.match(route,/statOriginalDistr:!state\.statTable\.paired/);
 assert.match(route,/state\.statTable\.regressionType==='1VAR'/);
});
test('model-independent C DIST is not invoked by original Q',()=>{
 const start=APP.indexOf('function statDistr(){'),end=APP.indexOf('function statDistrInput(kind)',start);
 assert.doesNotMatch(APP.slice(start,end),/distMenu\(|DIST\.calculate\(/);
});
console.log('REA-102 PASS '+passed+' isolated Q(t) reference, identity, model and menu checks; physical parity unverified');
