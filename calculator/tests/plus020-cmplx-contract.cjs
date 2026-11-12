#!/usr/bin/env node
/* PLUS-020: CMPLX manufacturer examples, polar/rectangular, Ans and limits.
 * Unit-level simulator evidence only; no hardware or UI mode-transition claim.
 * https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/cmplx.html
 */
'use strict';
const A=require('node:assert/strict');
const C=require('../js/complex-engine.js');
let checks=0;
const near=(x,y,label)=>A.ok(Math.abs(x-y)<=2e-11*Math.max(1,Math.abs(y)),label+': '+x+' != '+y);
function z(expression,re,im=0,options={}){
 const result=C.evaluate(expression,options);
 near(result.re,re,expression+' (real)');
 near(result.im,im,expression+' (imag)');
 checks++;return result;
}
function fail(expression,pattern,options={}){
 A.throws(()=>C.evaluate(expression,options),pattern,expression);checks++;
}
// Manufacturer CMPLX examples: rectangular division, powers, conjugate, arg.
z('(2+6i)/(2i)',3,-1);
z('(1+i)^2+(1-i)^2',0);
z('Conjg(2+3i)',2,-3);
z('Abs(1+i)',Math.sqrt(2));
z('Arg(1+i)',45);
z('Arg(1+i)',Math.PI/4,0,{angle:'RAD'});
z('Arg(-1-i)',-135);
z('Arg(-1-i)',-150,0,{angle:'GRAD'});
z('1/(1-i)',.5,.5);
// CASIO angle is normalized to (-180°, 180°].
near(C.normalizedAngle(-1,0,'DEG'),180,'negative real axis');
near(C.normalizedAngle(1,-1,'DEG'),-45,'fourth quadrant');checks+=2;
z('2∠45',Math.SQRT2,Math.SQRT2);
z('2∠90',0,2);
z('3∠100',0,3,{angle:'GRAD'});
z('3∠1.5707963267948966',0,3,{angle:'RAD'});
z('sqrt(-1)',0,1);
z('sqrt(-4)',0,2);
z('(-1)^0.5',0,1);
z('sqrt(-i)',Math.SQRT1_2,-Math.SQRT1_2);
// Small legitimate real components must not be erased by axis snapping.
z('1e-14+i',1e-14,1);
A.equal(C.format(C.evaluate('sqrt(-1)')),'i');checks++;
A.equal(C.format(C.evaluate('(2+6i)/(2i)')),'3-i');checks++;
A.equal(C.format({re:Math.SQRT2,im:Math.SQRT2},'DEG','polar'),'2∠45');checks++;
A.deepEqual(C.components({re:3,im:-1},'DEG','rectangular'),['3','-1i']);checks++;
// Result-format command overrides; the evaluator returns the same value.
A.deepEqual(C.splitDisplayCommand('1+i►r∠θ'),{expression:'1+i',format:'polar'});checks++;
A.deepEqual(C.splitDisplayCommand('2∠45→a+bi'),{expression:'2∠45',format:'rectangular'});checks++;
z('Ans+1',3,3,{ans:{re:2,im:3}});
z('A+i',5,1,{memory:{A:5}});
z('PreAns-i',2,-3,{preAns:{re:2,im:-2}});
z('(1e99+1e99i)/(1e99+1e99i)',1);
// Reject invalid mathematical and command forms.
fail('Arg(0)',/Math ERROR/);
fail('1/0',/Math ERROR/);
fail('2∠90►r∠θ+1',/Syntax ERROR/);
fail('0∠90►a+bi►r∠θ',/Syntax ERROR/);
fail('Unknown+i',/Variable ERROR/);
fail('Conjg(1,2)',/Syntax ERROR/);
console.log('PLUS-020 PASS: '+checks+' CMPLX complex-arithmetic, principal-root, polar, argument, memory and rejection contracts (unit-only)');
