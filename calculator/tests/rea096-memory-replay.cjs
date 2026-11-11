/* REA-096 — lifecycle, CLR, replay and LCD source-level tests.
 * Run: node calculator/tests/rea096-memory-replay.cjs
 * These are isolated runtime tests of extracted controller functions and
 * indicator module, not browser DOM or physical calculator captures.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const APP=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const IND=require('../js/lcd-indicators.js');
let passed=0;
function test(name,fn){try{fn();passed++}catch(error){error.message=name+': '+error.message;throw error}}
function span(first,last){
 const a=APP.indexOf(first),b=APP.indexOf(last,a+first.length);
 assert.ok(a>=0&&b>a,'Missing controller functions '+first);return APP.slice(a,b);
}
const code=[
 span("function reset(mode='all'){","function clearMenu(){"),
 span("function setMode(mode){","function setModel(id){"),
 span("function setupChoose(id,value){","function setupMenu(){")
].join('\n');
function harness(model){
 const state={power:true,model,mode:'COMP',math:true,outputMath:true,angle:'DEG',
  format:'Norm1',screen:'result',shift:false,alpha:false,
  memory:{A:10,B:3,C:0,D:0,E:0,F:0,M:7,X:5,Y:0},
  complexMemory:{},complexAns:{re:0,im:0},ans:15,preAns:11,raw:15,
  history:[{source:'1+1',mode:'COMP'}],storedInputs:[0],replayDraft:'1+1',
  viewport:{},input:'1+1',result:'2',menuEntries:[]};
 const setup={defaults:{math:true,outputMath:true,angle:'DEG',format:'Norm1',
  complexFormat:'rectangular'},setting:()=>true,
  options:()=>[{value:'matho'},{value:'lineo'}]};
 const events=[];
 const env={
  state,SETUP:setup,MODELS:{supports:()=>true,get:()=>({label:model})},
  MATRIX:{store:()=>({})},VECTOR:{store:()=>({})},
  STRUCT:{create:()=>({})},clearReplay:()=>{
   state.storedInputs=[];state.replayDraft=null;
  },releaseModifier:()=>{state.shift=false;state.alpha=false},
  notify:text=>events.push(text),paint:()=>{},cancelNumeric:()=>{},
  clearPowerTimer:()=>{},markOperation:()=>{},advancedMode:()=>{},
  exitFactorization:()=>{},optionDialog:()=>{}
 };
 const funcs=new Function(...Object.keys(env),code+
  ';return {reset,clearSetup,powerOff,powerOn,setMode,setupChoose,setupSetting};'
 )(...Object.values(env));
 return {state,funcs,events};
}
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 test(model+' mode clears replay and retains M/Ans',()=>{
  const {state,funcs}=harness(model);funcs.setMode('STAT');
  assert.equal(state.mode,'STAT');assert.deepEqual(state.history,[]);
  assert.deepEqual(state.storedInputs,[]);
  assert.equal(state.ans,15);assert.equal(state.memory.M,7);
 });
 test(model+' CMPLX exit removes imaginary Ans',()=>{
  const {state,funcs}=harness(model);
  state.mode='CMPLX';state.ans=0;state.complexAns={re:8,im:9};
  funcs.setMode('COMP');assert.equal(state.ans,8);
  assert.deepEqual(state.complexAns,{re:8,im:0});
  assert.equal(state.memory.M,7);
 });
 test(model+' CLR Setup resets COMP and angle but retains memory',()=>{
  const {state,funcs}=harness(model);
  state.mode='STAT';state.angle='RAD';funcs.clearSetup();
  assert.equal(state.mode,'COMP');assert.equal(state.angle,'DEG');
  assert.equal(state.ans,15);assert.equal(state.memory.A,10);
  assert.equal(state.memory.M,7);assert.equal(state.history.length,0);
 });
 test(model+' CLR Setup complex retains real answer',()=>{
  const {state,funcs}=harness(model);
  state.mode='CMPLX';state.complexAns={re:6,im:4};
  funcs.clearSetup();assert.equal(state.ans,6);
  assert.equal(state.complexAns.im,0);assert.equal(state.mode,'COMP');
 });
 test(model+' MathIO switch invalidates history',()=>{
  const {state,funcs}=harness(model);
  funcs.setupChoose('mthio','lineo');assert.equal(state.history.length,0);
  assert.equal(state.ans,15);assert.equal(state.memory.M,7);
 });
 test(model+' LineIO switch invalidates history',()=>{
  const {state,funcs}=harness(model);funcs.setupSetting('lineio');
  assert.equal(state.math,false);assert.equal(state.history.length,0);
 });
 test(model+' OFF/ON retains memory and Ans, loses history',()=>{
  const {state,funcs}=harness(model);
  funcs.powerOff('manual');assert.equal(state.power,false);
  assert.equal(state.history.length,0);
  assert.equal(state.memory.M,7);assert.equal(state.ans,15);
  funcs.powerOn();assert.equal(state.power,true);
  assert.equal(state.memory.A,10);assert.equal(state.memory.M,7);
 });
 test(model+' OFF/ON preserves mode and setup',()=>{
  const {state,funcs}=harness(model);
  state.mode='CMPLX';state.angle='RAD';
  funcs.powerOff();funcs.powerOn();
  assert.equal(state.mode,'CMPLX');assert.equal(state.angle,'RAD');
 });
 test(model+' CLR All clears memory and Ans',()=>{
  const {state,funcs}=harness(model);
  funcs.reset('all');assert.equal(state.mode,'COMP');
  assert.equal(state.memory.M,0);assert.equal(state.memory.A,0);
  assert.equal(state.ans,0);assert.equal(state.history.length,0);
 });
 test(model+' LCD M indicator reflects stored nonzero value',()=>{
  const {state}=harness(model);
  assert.equal(IND.derive(state).memory,'M');state.memory.M=0;
  assert.equal(IND.derive(state).memory,'');
 });
 test(model+' LCD standby and modifiers',()=>{
  const {state}=harness(model);
  state.pendingMemory='STO';state.shift=true;
  const flags=IND.derive(state);
  assert.equal(flags.pending,'STO');assert.equal(flags.shift,'S');
  state.pendingMemory='RCL';assert.equal(IND.derive(state).pending,'RCL');
 });
 test(model+' LCD replay only in compatible modes',()=>{
  const {state}=harness(model);state.screen='edit';state.storedInputs=[];
  state.mode='STAT';assert.equal(IND.derive(state).replay,'');
  state.mode='MATRIX';assert.equal(IND.derive(state).replay,'');
  state.mode='COMP';assert.notEqual(IND.derive(state).replay,'');
  state.mode='BASE-N';assert.notEqual(IND.derive(state).replay,'');
 });
 test(model+' LCD off hides all memory indicators',()=>{
  const {state}=harness(model);state.power=false;
  assert.equal(IND.derive(state).memory,'');
  assert.equal(IND.derive(state).replay,'');
 });
}
test('source: RCL STO and M +/- route through guarded memory updates',()=>{
 for(const literal of ['function memoryOperand()','function assignRegister(name,value)',
 'function memorySelect(name)','function accumulateMemory(sign)',
 "if(kind==='STO')","else if(kind==='RCL')",
 "COMPLEX.add(previous,value)","COMPLEX.sub(previous,value)",
 "memorySum(state.memory.M,value,sign)"])
  assert.ok(APP.includes(literal),literal);
});
test('source: AC cancels STO/RCL without memory mutation',()=>{
 assert.match(APP,/if\(state\.pendingMemory\)\{/);
 assert.match(APP,/if\(key==='AC'\)\{state\.pendingMemory=null/);
});
test('source: calculation errors do not invoke result commit',()=>{
 const start=APP.indexOf('function error(message,source=state.input)');
 const end=APP.indexOf('function setComplexResult(',start);
 const block=APP.slice(start,end);
 assert.ok(start>=0&&end>start);
 assert.doesNotMatch(block,/state\.ans\s*=|state\.memory\s*=|state\.history\.unshift/);
});
test('source: replay is gated to original supported modes',()=>{
 assert.match(APP,/\['COMP','CMPLX','BASE-N'\]\.includes\(state\.mode\)/);
});
console.log('REA-096 PASS '+passed+' isolated lifecycle/indicator/source checks; browser and hardware unverified');
