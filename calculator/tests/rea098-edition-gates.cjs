/* REA-098 — model-specific operation gates and keyboard checks.
 * Run: node calculator/tests/rea098-edition-gates.cjs
 * Isolated JavaScript/source checks, not browser DOM or hardware captures.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const P=require('../js/model-profiles.js'),M=require('../js/math-engine.js'),K=require('../js/keyboard.js');
const APP=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
let passed=0;
function test(label,fn){try{fn();passed++}catch(e){e.message=label+': '+e.message;throw e}}
const models=['fx-991es','fx-991es-plus','fx-991es-plus-c'];
const common=['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR'];
const cOnly=['INEQ','VERIF','DIST'];
const editionOnly=['ineq','verif','dist','recurring','dual-table'];
for(const model of models){
 const original=model==='fx-991es',c=model==='fx-991es-plus-c';
 for(const mode of common)test(model+' mode '+mode,()=>assert.equal(P.supports(model,mode),true));
 for(const mode of cOnly)test(model+' C mode '+mode,()=>assert.equal(P.supports(model,mode),c));
 for(const feature of editionOnly)test(model+' C feature '+feature,
  ()=>assert.equal(P.hasFeature(model,feature),c));
 test(model+' random base',()=>assert.equal(P.hasFeature(model,'ran'),true));
 test(model+' random integer availability',()=>assert.equal(P.hasFeature(model,'ranint'),!original));
 test(model+' model E/F register',()=>assert.equal(P.hasRegister(model,'E'),!original));
 test(model+' model F register',()=>assert.equal(P.hasRegister(model,'F'),!original));
 test(model+' original random fraction',()=>assert.equal(M.evaluate('Ran#',{model,random:()=>0.512}),0.512));
 test(model+' RanInt execution',()=>{
  if(original)assert.throws(()=>M.evaluate('RanInt#(1,4)',{model,random:()=>0.2}),/Argument ERROR/);
  else assert.equal(M.evaluate('RanInt#(1,4)',{model,random:()=>0.2}),1);
 });
 test(model+' random integer direct synonym',()=>{
  if(original)assert.throws(()=>M.evaluate('RanInt(1,4)',{model,random:()=>0.2}),/Argument ERROR/);
  else assert.equal(M.evaluate('RanInt(1,4)',{model,random:()=>0.2}),1);
 });
 test(model+' basic arithmetic stable',()=>assert.equal(M.evaluate('2+3*4',{model}),14));
 test(model+' unknown model feature fail-closed',()=>assert.equal(P.hasFeature('unknown','ranint'),false));
}
for(const mode of common.concat(cOnly))
 test('unknown model rejects mode '+mode,()=>assert.equal(P.supports('unknown',mode),false));
for(const source of ['RanInt#(1,5)','RanInt(1,5)','2+RanInt#(1,5)'])
 test('original pasted expression '+source,()=>assert.throws(
  ()=>M.evaluate(source,{model:'fx-991es',random:()=>0}),/Argument ERROR/));
for(const fragment of [
 "MODELS.hasFeature(state.model,'ranint')",
 "MODELS.hasFeature(state.model,'recurring')",
 "MODELS.hasFeature(state.model,'ran')",
 "if(!MODELS.supports(state.model,mode))",
 "function alphaKey(key)",
 "function shifted(key)",
 "function advancedMode(mode)",
 "function setMode(mode)",
 "throw Error('Argument ERROR')"
])test('controller edition source '+fragment,()=>assert.ok(APP.includes(fragment),fragment));
test('pasted recurring notation is restricted to PLUS C',()=>{
 const evaluation=APP.slice(APP.indexOf('function evaluate(){'),APP.indexOf('function advanceStatements(){'));
 assert.ok(evaluation.includes("!MODELS.hasFeature(state.model,'recurring')"));
 assert.ok(evaluation.includes('RPT'));
});
test('controller evaluates model guard before parser',()=>{
 const evaluation=APP.slice(APP.indexOf('function evaluate(){'),APP.indexOf('function advanceStatements(){'));
 assert.ok(evaluation.indexOf("MODELS.hasFeature(state.model,'ranint')")<
  evaluation.indexOf('ERRORS.checkStack(source,state.mode)'));
});
test('original RanInt blocked before decimal fast path',()=>{
 const engine=fs.readFileSync(path.join(__dirname,'../js/math-engine.js'),'utf8');
 const start=engine.indexOf('function evaluate(source,opts={})'),end=engine.indexOf('// REA-038',start);
 const block=engine.slice(start,end);
 assert.ok(block.indexOf("opts.model==='fx-991es'")<block.indexOf('global.FreshDecimal'));
});
test('keyboard routes physical keys without inventing direct modes',()=>{
 const context={mode:'COMP',screen:'edit',model:'fx-991es'};
 for(const [key,expected] of [['F1','SHIFT'],['F2','ALPHA'],['F3','MODE'],['F4','ON'],['Enter','EQUAL']]){
  const e={key,target:{closest:()=>null}};
  assert.deepEqual(K.translate(e,context).keys,[expected]);
 }
});
test('keyboard preserves browser focus and ctrl shortcuts',()=>{
 const e={key:'a',target:{closest:q=>q.includes('input')?{}:null}};
 assert.equal(K.translate(e,{model:'fx-991es',mode:'COMP',screen:'edit'}),null);
});
console.log('REA-098 PASS '+passed+' edition-gating and keyboard/source checks; browser/hardware unverified');
