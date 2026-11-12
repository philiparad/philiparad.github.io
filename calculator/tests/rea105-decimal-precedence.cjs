/* PLUS-only fast/general/precise arithmetic comparison. */
'use strict';
const assert=require('node:assert/strict');
const M=require('../js/math-engine.js'),DEC=require('../js/decimal-core.js'),RAT=require('../js/rational.js');
const model='fx-991es-plus',opts={model,mode:'COMP'};
let count=0;const tests=[['8/2(2+2)',1],['12/3(1+3)',1],['18/3(2+1)',2],['16/4(2+2)',1],['6/3(1+1)',1],['(1+2)3',9],['2(3+4)',14],['8/2*4',16],['-2^2',-4],['2^3^2',512],['0.1+0.2',0.3],['(0.5+0.25)4',3]];
for(const [expr,want] of tests){
 const math=M.evaluate(expr,opts),actual=DEC.evaluate(expr,opts),rat=RAT.evaluate(expr,opts);
 assert.ok(Math.abs(math-want)<1e-10,expr+' math: '+math);
 if(actual!==null)assert.ok(Math.abs(actual-want)<1e-10,expr+' decimal: '+actual);
 if(rat)assert.ok(Math.abs(RAT.toNumber(rat)-want)<1e-10,expr+' rational');
 count++;
}
console.log('fx-991ES PLUS decimal precedence:',count,'cases PASS');
