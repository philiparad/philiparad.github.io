#!/usr/bin/env node
/* PLUS-018: source-backed symbolic result contracts, not CASIO hardware parity. */
'use strict';
const A=require('node:assert/strict');
require('../js/number-format.js');
require('../js/exact-symbolic.js');
const R=require('../js/result-format.js');
const X=require('../js/exact-symbolic.js');
const Q=require('../js/eqn-exact.js');
const C=require('../js/complex-engine.js');
let checks=0;
function symbolic(source,value,expected){
 const result=R.calculate(value,source,{math:true,format:'Norm2'});
 A.equal(result.chosen.text,expected,source);A.equal(result.chosen.exact,true);checks++;
}
function rational(source,value,expected){
 const exact=X.rational(source,value);
 A.ok(exact,'provenance unavailable for '+source);
 const result=R.calculate(value,source,{math:true,format:'Norm2'},{exactRational:exact});
 A.equal(result.chosen.text,expected,source);checks++;
}
symbolic('pi',Math.PI,'π');
symbolic('-pi',-Math.PI,'-π');
symbolic('2*pi',Math.PI*2,'2π');
symbolic('pi/2',Math.PI/2,'π/2');
symbolic('sqrt(8)',Math.sqrt(8),'2√2');
symbolic('sqrt(2)+sqrt(8)',3*Math.sqrt(2),'3√2');
symbolic('sqrt(2)*sqrt(3)',Math.sqrt(6),'√6');
symbolic('1+sqrt(2)',1+Math.sqrt(2),'1+√2');
symbolic('sqrt(2)-sqrt(8)',-Math.sqrt(2),'-√2');
rational('1/2+1/3',5/6,'5/6');
rational('sqrt(2)^2',2,'2');
rational('sqrt(2)/sqrt(2)',1,'1');
const approximate=R.calculate(Math.PI,'Ans',{math:true,format:'Norm2'},{allowApproxRational:false});
A.equal(approximate.chosen.kind,'decimal','unproven decimal must stay decimal');checks++;
A.equal(R.calculate(Math.sqrt(2),'sqrt(3)',{math:true,format:'Norm2'}).chosen.kind,'decimal','mismatched provenance');checks++;
A.equal(R.calculate(Math.PI,'pi',{math:false,format:'Norm2'}).chosen.kind,'decimal');checks++;
A.equal(R.calculate(Math.PI,'pi',{math:true,format:'Fix',digits:4}).chosen.kind,'decimal');checks++;
A.equal(Q.fraction(4,6),'2/3');checks++;
A.equal(Q.fraction(-4,6),'-2/3');checks++;
const roots={type:'QUAD',solutions:[{value:-1},{value:1}]};
Q.decorate(roots,[1,0,-1]);
A.equal(roots.solutions[0].exact,'-1');A.equal(roots.solutions[1].exact,'1');checks++;
const z=C.add(C.complex(2,3),C.complex(4,-3));
A.equal(z.re,6);A.equal(z.im,0);checks++;
const quotient=C.div(C.complex(1,1),C.complex(1,1));
A.equal(quotient.re,1);A.equal(quotient.im,0);checks++;
console.log('PLUS-018 PASS: '+checks+' exact symbolic, rational, equation and complex contracts (unit-only)');
