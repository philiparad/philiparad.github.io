/* REA-101: original fx-991ES STAT Distr P(t), source-level checks.
 * Run: node calculator/tests/rea101-stat-normal-p.cjs
 * Comparison values independently drawn from standard normal CDF.
 * No native CASIO screen or device parity is implied.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const NORMAL=require('../js/stat-normal.js');
const M=require('../js/math-engine.js');
const APP=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
let passed=0;
function test(name,fn){try{fn();passed++}catch(error){error.message=name+': '+error.message;throw error}}
const options={model:'fx-991es',mode:'STAT',statOriginalDistr:true};
const cases=[
 [0,0.5],[1,0.841344746068543],[-1,0.158655253931457],
 [2,0.977249868051821],[-2,0.0227501319481792],
 [3,0.99865010196837],[-3,0.00134989803163009],
 [-5,2.86651571879193e-7],[-8,6.22096057427178e-16],
 [-10,7.61985302416047e-24],[5,0.999999713348428],
 [8,0.9999999999999993]
];
for(const [input,expected] of cases){
 test('P('+input+') reference CDF',()=>{
  const actual=M.evaluate('P('+input+')',options);
  assert.ok(Math.abs(actual-expected)<=Math.max(1e-14,Math.abs(expected)*1e-8),
   actual+' differs from '+expected);
 });
 test('P('+input+') normal module agrees with engine',()=>{
  assert.equal(M.evaluate('P('+input+')',options),NORMAL.calculate('P',input));
 });
 test('P('+input+') remains a probability',()=>{
  const value=M.evaluate('P('+input+')',options);
  assert.ok(value>=0&&value<=1);
 });
}
for(const x of [-10,-8,-5,-3,-2,-1,0,1,2,3,5,8]){
 test('P(t) symmetry '+x,()=>{
  const p=NORMAL.calculate('P',x),q=NORMAL.calculate('P',-x);
  assert.ok(Math.abs(p+q-1)<=1e-12);
 });
}
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c'])
 for(const mode of ['COMP','STAT','CMPLX','TABLE'])
  for(const enabled of [true,false]){
   const allowed=model==='fx-991es'&&mode==='STAT'&&enabled;
   test('model and mode gate '+model+'/'+mode+'/'+enabled,()=>{
    if(allowed)assert.equal(M.evaluate('P(0)',{model,mode,statOriginalDistr:enabled}),0.5);
    else assert.throws(()=>M.evaluate('P(0)',{model,mode,statOriginalDistr:enabled}),/Argument ERROR/);
   });
  }
for(const source of ['P()','P(1,2)','P(1,2,3)']){
 test('invalid input '+source,()=>assert.throws(()=>M.evaluate(source,options),/Syntax ERROR|Argument ERROR/));
}
for(const source of ['P(1/0)','P(sqrt(-1))','P(1e100)']){
 test('invalid domain '+source,()=>assert.throws(()=>M.evaluate(source,options),/Math ERROR/));
}
test('expression composition',()=>{
 const value=M.evaluate('2*P(0)+P(-1)',options);
 assert.ok(Math.abs(value-(1+0.158655253931457))<1e-12);
});
test('Ans as P argument',()=>{
 assert.ok(Math.abs(M.evaluate('P(Ans)',{...options,ans:2})-
  0.977249868051821)<1e-12);
});
test('manual nested menu route inserts an expression',()=>{
 const start=APP.indexOf('function statDistr(){');
 const end=APP.indexOf('function statDistrInput(kind)',start);
 const snippet=APP.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.match(snippet,/action:\(\)=>originalStatPInput\(\)/);
 assert.match(snippet,/function originalStatPInput\(\)/);
 assert.match(snippet,/insert\('P\('\)/);
});
test('STAT only P gate in calculation app',()=>{
 const start=APP.indexOf('function evaluateSegment(');
 const end=APP.indexOf('function evaluate(){',start);
 const snippet=APP.slice(start,end);
 assert.match(snippet,/statOriginalDistr:state\.model==='fx-991es'/);
 assert.match(snippet,/state\.mode==='STAT'/);
 assert.match(snippet,/!state\.statTable\.paired/);
 assert.match(snippet,/state\.statTable\.regressionType==='1VAR'/);
});
test('original STAT equals-key path passes P gate',()=>{
 const start=APP.indexOf("if(state.mode==='STAT'&&state.model==='fx-991es'&&state.statTable){");
 const end=APP.indexOf("if(state.mode!=='COMP'&&state.mode!=='CMPLX')",start);
 assert.ok(start>=0&&end>start);
 const snippet=APP.slice(start,end);
 assert.match(snippet,/statOriginalDistr:!state\.statTable\.paired/);
 assert.match(snippet,/state\.statTable\.regressionType==='1VAR'/);
});
test('original STAT P key actually inserts calculator expression',()=>{
 const start=APP.indexOf('function statDistr(){');
 const end=APP.indexOf('function statDistrInput(kind)',start);
 const stat={model:'fx-991es',mode:'STAT',
  statTable:{paired:false,regressionType:'1VAR'},
  menuReturnScreen:'stat-table',screen:'menu',editor:{old:true}};
 let commands,inserted='',stopped=false;
 const evaluateRoute=new Function('state','releaseModifier','optionDialog',
  'notify','paint','STRUCT','syncEditor','insert',
  APP.slice(start,end)+';return {statDistr,originalStatPInput};');
 const route=evaluateRoute(stat,()=>{},
  (title,entries)=>{assert.equal(title,'STAT Distr');commands=entries;},
  ()=>{stopped=true},()=>{},{create:()=>({created:true})},()=>{},
  value=>{inserted=value;});
 route.statDistr();assert.equal(commands.length,4);
 commands[0].action();assert.equal(inserted,'P(');
 assert.equal(stat.screen,'edit');
 assert.deepEqual(stat.editor,{created:true});
 stat.model='fx-991es-plus-c';commands=null;
 route.statDistr();assert.equal(commands,null);
 assert.equal(stopped,true);
});
test('P menu original STAT only',()=>{
 const start=APP.indexOf('function statDistr(){');
 const end=APP.indexOf('function statDistrInput(kind)',start);
 const snippet=APP.slice(start,end);
 assert.match(snippet,/state\.model!=='fx-991es'/);
 assert.match(snippet,/state\.statTable\.paired/);
});
test('independent result does not mutate stat data',()=>{
 const rows=[1,2,3],copy=rows.slice();
 NORMAL.calculate('P',0);
 assert.deepEqual(rows,copy);
});
console.log('REA-101 PASS '+passed+' source-level CDF, mode-gating and menu-route checks; physical device parity unverified');
