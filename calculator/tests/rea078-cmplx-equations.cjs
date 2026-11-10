/* REA-078 — CALC CMPLX, complex-valued substitutions, named equalities.
 * Run: node calculator/tests/rea078-cmplx-equations.cjs
 * These are independent web calculations, NOT physical CASIO ROM parity.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../js/calc-substitution.js');
const Z=require('../js/complex-engine.js');
const M=require('../js/math-engine.js');
const MODELS=require('../js/model-profiles.js');
let checks=0;
function test(name,fn){
 try{fn();checks++}catch(e){e.message=name+': '+e.message;throw e}
}
function close(a,b,tol=1e-10){
 assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),a+' != '+b);
}
function context(model='fx-991es-plus-c',mode='CMPLX'){
 return {model,mode,math:M,complex:Z,angle:'DEG',ans:0,preAns:0,
  complexAns:{re:0,im:0},preComplexAns:{re:0,im:0},
  memory:{A:0,B:0,C:0,D:0,E:0,F:0,M:0,X:0,Y:0},
  complexMemory:{},complexFormat:'rectangular'};
}
function run(source,inputs,options=context()){
 const session=C.prepare(source,MODELS.registers(options.model),options.mode,
  {...options.memory,...options.complexMemory});
 return {session,out:C.evaluate(session,inputs,options)};
}
function result(source,inputs,re,im=0){
 const {out}=run(source,inputs);
 close(out.value.re,re);close(out.value.im,im);
 assert.equal(out.mode,'CMPLX');
 assert.equal(out.statementResults.length,1);
}
test('Casio CMPLX CALC: sqrt3 + i gives 2 angle30',()=>{
 const {session,out}=run('A+Bi►r∠θ',{A:'sqrt(3)',B:'1'});
 assert.deepEqual(session.names,['A','B']);
 close(out.value.re,Math.sqrt(3));close(out.value.im,1);
 assert.equal(out.output[0],'2∠30');
 assert.equal(out.formatOverride,'polar');
});
test('Casio repeated CMPLX CALC: 1 + sqrt3 i gives 2 angle60',()=>{
 const {out}=run('A+Bi►r∠θ',{A:'1',B:'sqrt(3)'});
 assert.equal(out.output[0],'2∠60');
 close(out.value.im,Math.sqrt(3));
});
test('explicit rectangular output overrides polar setup',()=>{
 const cfg=context();cfg.complexFormat='polar';
 const {out}=run('A+Bi►a+bi',{A:'3',B:'4'},cfg);
 assert.equal(out.formatOverride,'rectangular');
 assert.equal(out.output[0],'3+4i');
});
test('complex expression with imaginary input values',()=>{
 const {out}=run('A+Bi',{A:'1+2i',B:'3-i'});
 close(out.value.re,2);close(out.value.im,5);
 assert.deepEqual(out.changes.A,{re:1,im:2});
 assert.deepEqual(out.changes.B,{re:3,im:-1});
});
test('complex input values may reuse previously entered variable',()=>{
 const {out}=run('A+Bi',{A:'1+i',B:'A+2'});
 close(out.changes.B.re,3);close(out.changes.B.im,1);
 close(out.value.re,0);close(out.value.im,4);
});
test('complex input values may use Ans',()=>{
 const cfg=context();cfg.complexAns={re:2,im:3};
 const {out}=run('A+i',{A:'Ans+1'},cfg);
 close(out.value.re,3);close(out.value.im,4);
});
test('complex input values may use polar form',()=>{
 const {out}=run('A+Bi',{A:'2∠0',B:'1'},context());
 close(out.value.re,2);close(out.value.im,1);
});
test('complex numerator denominator arithmetic',()=>{
 const {out}=run('A/B',{A:'2+6i',B:'2i'});
 close(out.value.re,3);close(out.value.im,-1);
});
test('complex formula can include literal i',()=>result('A+i',{A:'2'},2,1));
test('original model supports CMPLX A and B',()=>{
 const cfg=context('fx-991es');
 const {out}=run('A+Bi',{A:'1',B:'2'},cfg);
 close(out.value.re,1);close(out.value.im,2);
});
test('original model rejects unsupported E output equality label',()=>{
 assert.throws(()=>C.prepare('E=A+B',MODELS.registers('fx-991es'),'CMPLX'),/Variable ERROR: E/);
});
test('original model rejects unsupported E on right side',()=>{
 assert.throws(()=>C.prepare('A=E+B',MODELS.registers('fx-991es'),'CMPLX'),/Variable ERROR: E/);
});
test('PLUS profile accepts E equation label',()=>{
 const {session,out}=run('E=A+B',{A:'1',B:'2'});
 assert.deepEqual(session.names,['A','B']);
 assert.equal(out.statementResults[0].target,'E');
 close(out.value.re,3);
});
test('CMPLX equation label is NOT a substitution variable',()=>{
 const {session,out}=run('Y=A+Bi',{A:'2',B:'3'});
 assert.deepEqual(session.names,['A','B']);
 assert.deepEqual(out.statementResults.map(x=>x.target),['Y']);
 assert.equal(out.statementResults[0].text,'2+3i');
 assert.equal(Object.prototype.hasOwnProperty.call(out.changes,'Y'),false);
});
test('COMP equality output uses named LHS without assignment',()=>{
 const cfg=context();cfg.mode='COMP';
 const {session,out}=run('Y=X^2+X+3',{X:'2'},cfg);
 assert.deepEqual(session.names,['X']);
 assert.equal(out.value,9);
 assert.deepEqual(out.statementResults.map(x=>x.target),['Y']);
 assert.equal(Object.prototype.hasOwnProperty.call(out.changes,'Y'),false);
});
test('COMP A=B+C equality',()=>{
 const cfg=context();cfg.mode='COMP';
 const {session,out}=run('A=B+C',{B:'3',C:'4'},cfg);
 assert.deepEqual(session.names,['B','C']);
 assert.equal(out.value,7);
 assert.equal(out.statementResults[0].target,'A');
});
test('COMP multi-statement result metadata retained',()=>{
 const cfg=context();cfg.mode='COMP';
 const {out}=run('X+Y:X(X+Y)',{X:'2',Y:'3'},cfg);
 assert.deepEqual(out.output,['5','10']);
 assert.deepEqual(out.statementResults.map(x=>x.text),['5','10']);
 assert.equal(out.value,10);
});
test('CMPLX multi-statement updates internal Ans',()=>{
 const {out}=run('A+Bi:Ans*i',{A:'2',B:'3'});
 close(out.statementResults[0].value.re,2);
 close(out.statementResults[0].value.im,3);
 close(out.value.re,-3);close(out.value.im,2);
 assert.equal(out.statementResults.length,2);
});
test('CMPLX multi-statement mixture of equality and expression',()=>{
 const {out}=run('Y=A+Bi:Ans+2',{A:'1',B:'2'});
 assert.deepEqual(out.statementResults.map(x=>x.target),['Y',null]);
 close(out.value.re,3);close(out.value.im,2);
});
test('CMPLX multi-statement second statement failure atomic',()=>{
 const cfg=context(),snapshot=JSON.stringify(cfg.memory),zs=JSON.stringify(cfg.complexMemory);
 assert.throws(()=>run('A+Bi:1/(B-B)',{A:'1',B:'2'},cfg),/Math ERROR/);
 assert.equal(JSON.stringify(cfg.memory),snapshot);
 assert.equal(JSON.stringify(cfg.complexMemory),zs);
});
test('invalid complex prompt remains transactional',()=>{
 const cfg=context(),snapshot=JSON.stringify(cfg.memory);
 assert.throws(()=>run('A+Bi',{A:'2+i',B:'1/(2-2)'},cfg),/Math ERROR/);
 assert.equal(JSON.stringify(cfg.memory),snapshot);
});
test('division by zero rejects complex calculation',()=>{
 assert.throws(()=>run('A/B',{A:'1+i',B:'0'}),/Math ERROR/);
});
test('missing complex value rejected',()=>{
 assert.throws(()=>run('A+Bi',{A:'1'}),/Variable ERROR: B/);
});
test('empty complex prompt rejected',()=>{
 assert.throws(()=>run('A+Bi',{A:'1',B:''}),/Syntax ERROR/);
});
test('invalid equality with compound left expression fails',()=>{
 assert.throws(()=>C.prepare('A+B=C',MODELS.registers('fx-991es-plus-c'),'CMPLX'),/Syntax ERROR/);
});
test('invalid equality with multiple equals fails',()=>{
 assert.throws(()=>C.prepare('A=B=C',MODELS.registers('fx-991es-plus-c'),'CMPLX'),/Syntax ERROR/);
});
test('unsupported CALC mode throws',()=>{
 assert.throws(()=>C.prepare('A+Bi',MODELS.registers('fx-991es-plus-c'),'EQN'),/Argument ERROR/);
});
test('unknown expression register fails',()=>{
 assert.throws(()=>C.prepare('A+T',MODELS.registers('fx-991es-plus-c'),'CMPLX'),/Variable ERROR: T/);
});
test('CMPLX display format command is ignored during scanner pass',()=>{
 const names=C.prepare('A+Bi►r∠θ',MODELS.registers('fx-991es-plus-c'),'CMPLX').names;
 assert.deepEqual(names,['A','B']);
});
test('CMPLX explicit format applies to last statement',()=>{
 const {out}=run('A+Bi:A+Bi►r∠θ',{A:'1',B:'1'});
 assert.equal(out.statementResults.length,2);
 assert.equal(out.formatOverride,'polar');
 assert.equal(out.statementResults[0].text,'1+i');
});
test('CMPLX preserves complex register snapshots without writes',()=>{
 const cfg=context();cfg.complexMemory.A={re:7,im:9};
 const old=JSON.stringify(cfg.complexMemory);
 const {out}=run('A+Bi',{A:'2+i',B:'1'},cfg);
 close(out.value.re,2);close(out.value.im,2);
 assert.equal(JSON.stringify(cfg.complexMemory),old);
});
test('controller saves CALC statement result metadata',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(code,/statementResults:output\.statementResults/);
 assert.match(code,/if\(output&&output\.kind==='calc-substitution'\)/);
 assert.match(code,/state\.calcSession=\{source:output\.source,mode:output\.mode/);
 assert.match(code,/if\(key==='AC'\)\{state\.flow=null;state\.calcSession=null/);
 new Function(code);
});
test('CMPLX prompt accepts keypad i and polar-angle keys',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(code,/state\.mode==='CMPLX'&&key==='ENG'\)addition='i'/);
 assert.match(code,/state\.mode==='CMPLX'&&state\.shift&&key==='NEG'\)addition='∠'/);
});
test('ALPHA CALC inserts an equation equal sign',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(code,/if\(key==='CALC'\)return insert\('='/);
});
test('CMPLX evaluation propagates original model',()=>{
 const source=fs.readFileSync(path.join(__dirname,'../js/calc-substitution.js'),'utf8');
 assert.match(source,/preAns:context\.preComplexAns\|\|0,model:context\.model/);
});
console.log('REA-078 PASS '+checks+' complex/equality/transaction tests; native hardware not verified');
