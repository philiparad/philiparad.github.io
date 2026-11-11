'use strict';
const assert=require('node:assert/strict');
const STAT=require('../../js/stat-regression.js');
const approx=(actual,expected,relative=1e-12)=>{
 assert.ok(Number.isFinite(actual),'expected finite result, got '+actual);
 assert.ok(Math.abs(actual-expected)<=relative*Math.max(1,Math.abs(expected)),
  'expected '+expected+', got '+actual);
};
const yHat=(A,B,C,x)=>STAT.estimateY({type:'QUAD',A,B,C},x);
// Exact coefficients, severe cancellation: (x-base)^2.
for(const base of [1e7,1e8,1e9,1e10]){
 for(const delta of [0,1,2,3,-1,-2,-3]){
  approx(yHat(base*base,-2*base,1,base+delta),delta*delta);
 }
}
// Ordinary polynomial and symmetric x.
for(const x of [-5,-1,0,1,2,5]){
 approx(yHat(3,2,1,x),x*x+2*x+3);
}
approx(yHat(7,0,0,900),7);
approx(yHat(0,0,0,0),0);
approx(yHat(0,0,1,1e-45),1e-90);
approx(yHat(0,1,0,1e50),1e50);
assert.throws(()=>yHat(0,0,1e99,1e99),/Math ERROR/);
assert.throws(()=>yHat(0,0,1,Infinity),/Math ERROR/);
// QUAD fitting and inverse roots must retain their existing pathways.
const points=[-1,0,1,2].map(X=>({X,Y:3+2*X+X*X,FREQ:1}));
const model=STAT.fit({paired:true,frequency:false,rows:points},'QUAD');
approx(model.A,3);approx(model.B,2);approx(model.C,1);
approx(STAT.estimateY(model,3),18);
const two=STAT.estimateX({type:'QUAD',A:-6,B:-1,C:1},0);
approx(two[0],-2);approx(two[1],3);
console.log('REA-116 compensated QUAD prediction tests passed');
