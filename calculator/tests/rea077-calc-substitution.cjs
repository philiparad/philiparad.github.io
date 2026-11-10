/* REA-077: complete CALC prompt selection, repeated substitutions, atomic memory.
 * Run: node calculator/tests/rea077-calc-substitution.cjs
 * This is an independent source-level correctness test, not hardware parity.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const C=require('../js/calc-substitution.js'),M=require('../js/math-engine.js');
const Z=require('../js/complex-engine.js'),MODELS=require('../js/model-profiles.js');
let passed=0;
function test(name,fn){
 try{fn();passed++}catch(e){e.message=name+': '+e.message;throw e}
}
function ctx(mode='COMP'){
 return {mode,math:M,complex:Z,angle:'DEG',ans:0,preAns:0,
  complexAns:{re:0,im:0},complexMemory:{},complexFormat:'rectangular',
  memory:{A:0,B:0,C:0,D:0,E:0,F:0,X:0,Y:0,M:0}};
}
function execute(source,inputs,model='fx-991es-plus-c',mode='COMP',context=ctx(mode)){
 const session=C.prepare(source,MODELS.registers(model),mode,context.memory);
 return {session,result:C.evaluate(session,inputs,context)};
}
test('scans two registers in appearance order',()=>{
 assert.deepEqual(C.scan('3A+B',MODELS.registers('fx-991es')),['A','B']);
});
test('deduplicates repeated references',()=>{
 assert.deepEqual(C.scan('X*X+Y+X',MODELS.registers('fx-991es')),['X','Y']);
});
test('ignores built-ins and function names',()=>{
 assert.deepEqual(C.scan('sin(X)+cos(Y)+pi+Ans+e+exp(X)',MODELS.registers('fx-991es')),['X','Y']);
});
test('allows original M independent memory register',()=>{
 assert.deepEqual(C.scan('M+A+M',MODELS.registers('fx-991es')),['M','A']);
});
test('original rejects E or F',()=>{
 assert.throws(()=>C.prepare('A+E',MODELS.registers('fx-991es')),/Variable ERROR/);
 assert.throws(()=>C.prepare('F+2',MODELS.registers('fx-991es')),/Variable ERROR/);
});
test('PLUS accepts E and F',()=>{
 assert.deepEqual(C.prepare('E+F',MODELS.registers('fx-991es-plus')).names,['E','F']);
});
test('CALC uses referenced variable names as prompt fields',()=>{
 const s=C.prepare('3A+B',MODELS.registers('fx-991es'), 'COMP',{A:1,B:2});
 assert.deepEqual(s.fields,[{id:'A',label:'A?',value:'1'},{id:'B',label:'B?',value:'2'}]);
});
test('manual first evaluation 3A+B gives 25',()=>{
 const {result}=execute('3A+B',{A:'5',B:'10'});
 assert.equal(result.value,25);
 assert.deepEqual(result.changes,{A:5,B:10});
});
test('manual second evaluation same expression gives 41',()=>{
 const {result}=execute('3A+B',{A:'7',B:'20'});
 assert.equal(result.value,41);
});
test('substitution accepts arithmetic entry',()=>{
 const {result}=execute('3A+B',{A:'2+3',B:'5*2'});
 assert.equal(result.value,25);
});
test('multiple referenced variable order follows source',()=>{
 const {session,result}=execute('3Y+2X+Y',{Y:'4',X:'2'});
 assert.deepEqual(session.names,['Y','X']);
 assert.equal(result.value,20);
});
test('adjacent register tokens are product',()=>{
 const {result}=execute('2AX+3BX+C',{A:'2',X:'3',B:'4',C:'5'});
 assert.equal(result.value,53);
});
test('multi-statements evaluate sequentially',()=>{
 const {session,result}=execute('X+Y:X(X+Y)',{X:'2',Y:'3'});
 assert.deepEqual(session.names,['X','Y']);
 assert.deepEqual(result.output,['5','10']);
 assert.equal(result.value,10);
});
test('equation output variable is not prompted for',()=>{
 const {session,result}=execute('Y=X^2+X+3',{X:'2'});
 assert.deepEqual(session.names,['X']);
 assert.equal(result.value,9);
 assert.deepEqual(result.changes,{X:2});
});
test('equation input A=B+C prompts B and C',()=>{
 const {session,result}=execute('A=B+C',{B:'3',C:'4'});
 assert.deepEqual(session.names,['B','C']);
 assert.equal(result.value,7);
});
test('invalid input rejected before source memory touched',()=>{
 const context=ctx(),prior=JSON.stringify(context.memory);
 assert.throws(()=>execute('A+B',{A:'12',B:'sqrt(-1)'},'fx-991es','COMP',context));
 assert.equal(JSON.stringify(context.memory),prior);
});
test('division failure rejected without source-memory changes',()=>{
 const context=ctx(),prior=JSON.stringify(context.memory);
 assert.throws(()=>execute('A/(B-B)',{A:'4',B:'2'},'fx-991es','COMP',context));
 assert.equal(JSON.stringify(context.memory),prior);
});
test('missing prompted field rejected',()=>{
 assert.throws(()=>execute('A+B',{A:'2'},'fx-991es'),/Variable ERROR: B/);
});
test('empty prompt rejected',()=>{
 assert.throws(()=>execute('A+B',{A:'',B:'1'},'fx-991es'),/Syntax ERROR/);
});
test('negative substitution value',()=>{
 const {result}=execute('A^2+B',{A:'-3',B:'2'});
 assert.equal(result.value,11);
});
test('unknown expression identifier raises error',()=>{
 assert.throws(()=>C.prepare('Ghost(X)',MODELS.registers('fx-991es')),/Variable ERROR/);
});
test('CALC rejects unsupported modes',()=>{
 assert.throws(()=>C.prepare('X+2',MODELS.registers('fx-991es'),'STAT'),/Argument ERROR/);
});
test('CALC rejects malformed multistatement source',()=>{
 assert.throws(()=>execute('X+:Y',{X:'1',Y:'2'},'fx-991es'), /Syntax ERROR/);
});
test('CALC complex A+Bi',()=>{
 const {session,result}=execute('A+Bi',{A:'sqrt(3)',B:'1'},'fx-991es-plus-c','CMPLX');
 assert.deepEqual(session.names,['A','B']);
 assert.ok(Math.abs(result.value.re-Math.sqrt(3))<1e-12);
 assert.equal(result.value.im,1);
});
test('CALC complex replay with new inputs',()=>{
 const {result}=execute('A+Bi',{A:'1',B:'sqrt(3)'},'fx-991es-plus-c','CMPLX');
 assert.equal(result.value.re,1);
 assert.ok(Math.abs(result.value.im-Math.sqrt(3))<1e-12);
});
test('CALC complex source display command',()=>{
 const {result}=execute('A+Bi►r∠θ',{A:'sqrt(3)',B:'1'},'fx-991es-plus-c','CMPLX');
 assert.equal(result.formatOverride,'polar');
 assert.equal(result.value.im,1);
});
test('CALC leaves context complex memory unchanged until caller commits',()=>{
 const context=ctx('CMPLX'),initial=JSON.stringify(context.complexMemory);
 execute('A+Bi',{A:'2',B:'1'},'fx-991es-plus-c','CMPLX',context);
 assert.equal(JSON.stringify(context.complexMemory),initial);
});
test('frontend uses per-variable CALC form',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/fieldForm\('CALC '\+session\.source,session\.fields,run\)/);
 assert.match(app,/state\.calcSession=\{source:output\.source,mode:output\.mode\}/);
 assert.match(app,/if\(key==='EQUAL'&&state\.screen==='result'&&state\.calcSession/);
 assert.match(app,/if\(output&&output\.kind==='calc-substitution'\)/);
 assert.doesNotMatch(app,/CALC — substitute a variable/);
 new Function(app);
});
test('frontend registers module before app',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 const a=html.indexOf('src="js/calc-substitution.js"');
 const b=html.indexOf('src="js/app.js"');
 assert.ok(a>0&&b>a);
});
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 test(model+' calculator contains legal X and Y prompts',()=>{
  const s=C.prepare('2X+3Y',MODELS.registers(model));
  assert.deepEqual(s.names,['X','Y']);
 });
}
console.log('REA-077 PASS '+passed+' CALC variables/repeat/equality/multistatement/memory checks; not native parity');
