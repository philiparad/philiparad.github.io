#!/usr/bin/env node
/* PLUS-021: SOLVE/CALC prompts, convergence and register-commit contracts.
 * These are simulator-level tests, not hardware Newton/keylog parity.
 */
'use strict';
const A=require('node:assert/strict');
const S=require('../js/solve-session.js');
const C=require('../js/calc-substitution.js');
const M=require('../js/math-engine.js');
const regs=['A','B','C','D','E','F','X','Y','M'];
let checks=0;
function check(fn){fn();checks++}
function near(a,b,tolerance=1e-7){A.ok(Math.abs(a-b)<=tolerance, a+' != '+b)}
function solve(fn,guess,steps=20){
 let resume=null,out;
 for(let i=0;i<8;i++){
  out=S.iterate(fn,M,guess,resume,steps);
  if(out.status==='solved')return out;
  A.equal(out.status,'continue');
  resume=out.resume;
 }
 throw Error('SOLVE did not finish');
}
check(()=>{const s=S.prepare('X^2=4',regs,{X:3},C.scan);A.deepEqual(s.names,[]);A.equal(s.fields[0].value,'3')});
check(()=>{const s=S.prepare('AX=8',regs,{A:2,X:0},C.scan);A.deepEqual(s.names,['A']);A.deepEqual(s.fields.map(x=>x.id),['A','guess'])});
check(()=>{const s=S.prepare('BA+X=0',regs,{A:1,B:2},C.scan);A.deepEqual(s.names,['B','A'])});
check(()=>A.throws(()=>S.prepare('1+2',regs,{},C.scan),/Variable ERROR/));
check(()=>A.throws(()=>S.prepare('X=1=2',regs,{},C.scan),/Syntax ERROR/));
check(()=>A.throws(()=>S.prepare('X=',regs,{},C.scan),/Syntax ERROR/));
check(()=>A.throws(()=>S.prepare('Integral(X,0,1)',regs,{},C.scan),/Syntax ERROR/));
check(()=>{const session=S.prepare('AX=8',regs,{A:2,X:0},C.scan);const before={A:2,X:0};const r=S.resolve(session,{A:'4',guess:'3'},M,{memory:before});A.equal(r.changes.A,4);A.equal(r.guess,3);A.equal(before.A,2);A.equal(r.memory.A,4)});
check(()=>{const session=S.prepare('AX=8',regs,{A:2},C.scan);A.throws(()=>S.resolve(session,{A:'',guess:'1'},M,{memory:{A:2}}),/Argument ERROR/)});
check(()=>{const session=S.prepare('X=1',regs,{X:0},C.scan);A.throws(()=>S.resolve(session,{guess:''},M,{memory:{X:0}}),/Argument ERROR/)});
check(()=>{const session=S.prepare('X=1',regs,{X:0},C.scan);A.throws(()=>S.resolve(session,{guess:'1e10'},M,{memory:{X:0}}),/Argument ERROR/)});
check(()=>{const s=solve(x=>2*x-8,0);near(s.value,4);A.ok(Math.abs(s.residual)<=1e-10)});
check(()=>{const s=solve(x=>x*x-4,3);near(s.value,2);A.ok(Math.abs(s.residual)<=1e-10)});
check(()=>{const s=solve(x=>x*x-4,-3);near(s.value,-2);A.ok(Math.abs(s.residual)<=1e-10)});
check(()=>{const s=solve(x=>x*x-4,2);A.equal(s.iterations,0);A.equal(s.residual,0)});
check(()=>{const s=solve(x=>x-1e6+0.00005,1e6);near(s.value,999999.99995);A.ok(Math.abs(s.residual)<=1e-10)});
check(()=>A.throws(()=>S.iterate(x=>x-1e9+.05,M,1e9),/Can't Solve/));
check(()=>A.throws(()=>solve(x=>x*x+1,0),/Can't Solve/));
check(()=>{const result=S.result('X^2=4',2,0,String);A.equal(result.kind,'solve');A.equal(result.lines[1],'X= 2');A.equal(result.lines[2],'L-R= 0')});
check(()=>{const original={A:2,B:3};const session=C.prepare('A+B',regs,'COMP',original);A.deepEqual(session.names,['A','B']);A.equal(original.A,2)});
check(()=>{const session=C.prepare('A+B',regs,'COMP',{A:2,B:3});A.throws(()=>C.evaluate(session,{A:'5',B:''},{math:M,memory:{A:2,B:3},ans:0,preAns:0}),/Syntax ERROR/)});
check(()=>{const session=C.prepare('A+B',regs,'COMP',{A:2,B:3});const result=C.evaluate(session,{A:'5',B:'4'},{math:M,memory:{A:2,B:3},ans:0,preAns:0});A.equal(result.value,9);A.deepEqual(result.changes,{A:5,B:4})});
check(()=>{const s=C.prepare('X^2+3',regs,'COMP',{X:4});const r=C.evaluate(s,{X:'4'},{math:M,memory:{X:4},ans:0,preAns:0});A.equal(r.value,19)});
check(()=>{const s=C.prepare('A+B',regs,'COMP',{A:1,B:2});A.equal(s.fields[0].value,'1');A.equal(s.fields[1].value,'2')});
check(()=>A.throws(()=>C.prepare('X+1',regs,'BASE-N',{}),/Argument ERROR/));
console.log('PLUS-021 PASS: '+checks+' SOLVE/CALC prompt, convergence, multi-root, failure, and atomic substitution contracts (unit-only)');
