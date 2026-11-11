/* REA-097 — precedence and numeric/command stack regression checks.
 * Run: node calculator/tests/rea097-stack-precedence.cjs
 * Source-level JavaScript checks; browser and hardware parity remain separate.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const M=require('../js/math-engine.js'),ERR=require('../js/error-handling.js');
let passed=0;
function check(name,fn){try{fn();passed++}catch(e){e.message=name+': '+e.message;throw e}}
function near(actual,want){assert.ok(Number.isFinite(actual)&&Math.abs(actual-want)<1e-10*Math.max(1,Math.abs(want)),actual+' != '+want)}
const examples=[
 ['8/(2(2+2))',1],
 ['2(3+4)',14],['(1+2)3',9],
 ['2pi/2',Math.PI],
 ['2+3*4',14],['2+3(4+1)',17],
 ['-2^2',-4],['(-2)^2',4],
 ['-3!',-6],['(-3)^2',9],['5!',120],
 ['5nPr2',20],['5nCr2',10],
 ['2*5nCr2',20],['5nCr2*3',30],
 ['2^3^2',512],['2^3!',64],
 ['3^2+1',10],['2^3*4',32],
 ['1+2+3+4+5+6+7+8+9+10+11',66]
];
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 for(const [expr,value] of examples)
  check(model+' precedence '+expr,()=>near(M.evaluate(expr,{model}),value));
 // REA-105: original omitted-sign multiplication = explicit ×/÷,
 // whereas PLUS and PLUS C give omitted multiplication higher priority.
 const original=model==='fx-991es';
 const editionExamples=[
  ['8/2(2+2)',original?16:1],
  ['12/3(1+3)',original?16:1],
  ['18/3(2+1)',original?18:2],
  ['16/4(2+2)',original?16:1],
  ['6/3(1+1)',original?4:1],
  ['2/2pi',original?Math.PI:1/Math.PI]
 ];
 for(const [expr,value] of editionExamples)
  check(model+' manufacturer precedence '+expr,()=>near(M.evaluate(expr,{model}),value));
 for(const expr of ['5nPr6','5nCr6','-3!','sqrt(-1)'])
  if(expr!=='-3!')check(model+' mathematical error '+expr,()=>assert.throws(
   ()=>M.evaluate(expr,{model}),/Math ERROR/));
 for(const expr of ['('.repeat(25)+'1'+')'.repeat(25),'-'.repeat(26)+'1','1^'.repeat(25)+'1'])
  check(model+' stack limit',()=>assert.throws(()=>M.evaluate(expr,{model}),/Stack ERROR/));
 check(model+' 24 parentheses preflight',()=>ERR.checkStack('('.repeat(24)+'1'+')'.repeat(24),model));
 check(model+' 25 parentheses fail',()=>assert.throws(
  ()=>ERR.checkStack('('.repeat(25)+'1'+')'.repeat(25),model),/Stack ERROR/));
}
check('parenthesis underflow is syntax error',()=>assert.throws(()=>ERR.checkStack('2+3)'),/Syntax ERROR/));
check('stack error classifier',()=>assert.equal(ERR.classify('Stack ERROR'),'Stack ERROR'));
check('numeric stack model CMPLX 5',()=>assert.equal(ERR.checkStack('1','CMPLX').numericLimit,5));
check('numeric stack COMP 10',()=>assert.equal(ERR.checkStack('1','COMP').numericLimit,10));
check('command stack cap 24',()=>assert.equal(ERR.checkStack('1','COMP').commandLimit,24));
check('error source does not update Ans',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const start=app.indexOf('function error(message,source=state.input)'),end=app.indexOf('function setComplexResult(',start);
 const section=app.slice(start,end);assert.ok(start>=0&&end>start);
 assert.doesNotMatch(section,/state\.ans\s*=|state\.memory\s*=/);
});
check('controller uses model-aware error preflight',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/ERRORS\.checkStack\(source,state\.mode\)/);
});
console.log('REA-097 PASS '+passed+' isolated precedence/stack/source checks; physical parity unverified');
