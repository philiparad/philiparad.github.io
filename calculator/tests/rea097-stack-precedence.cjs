/* PLUS-only precedence, numeric stack and input errors. */
'use strict';
const assert=require('node:assert/strict');
const M=require('../js/math-engine.js'),ERR=require('../js/error-handling.js');
const tests=[['8/2(2+2)',1],['12/3(1+3)',1],['18/3(2+1)',2],['8/(2(2+2))',1],['2(3+4)',14],['(1+2)3',9],['2pi/2',Math.PI],['2+3*4',14],['-2^2',-4],['(-2)^2',4],['5!',120],['5nPr2',20],['5nCr2',10],['2^3^2',512]];
let count=0;
for(const [source,expected] of tests){const actual=M.evaluate(source,{model:'fx-991es-plus'});assert.ok(Math.abs(actual-expected)<1e-9,source+': '+actual+' != '+expected);count++}
for(const source of ['1/0','sqrt(-1)']){assert.throws(()=>M.evaluate(source,{model:'fx-991es-plus'}),/Math ERROR/);count++}
for(const source of ['('.repeat(25)+'1'+')'.repeat(25),'-'.repeat(26)+'1','1^'.repeat(25)+'1']){assert.throws(()=>M.evaluate(source,{model:'fx-991es-plus'}),/Stack ERROR/);count++}
assert.equal(ERR.checkStack('1','CMPLX').numericLimit,5);count++;
assert.equal(ERR.checkStack('1','COMP').numericLimit,10);count++;
assert.throws(()=>ERR.checkStack('2+3)'),/Syntax ERROR/);count++;
console.log('fx-991ES PLUS stack and precedence:',count,'checks PASS');
