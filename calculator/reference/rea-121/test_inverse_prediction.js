'use strict';
const assert=require('node:assert/strict');
const REG=require('../../js/stat-regression.js');
const estimate=(A,B,x)=>REG.estimateY({type:'INV',A,B},x);
const near=(actual,expected,relative=1e-12)=>{
 assert.ok(Number.isFinite(actual),'result must be finite');
 assert.ok(Math.abs(actual-expected)<=relative*Math.max(1,Math.abs(expected)),
  'expected '+expected+', received '+actual);
};
// Exactly representable A/B/X can produce a fractional cancellation
// result smaller than one binary64 ULP of the individual B/X quotient.
near(estimate(-3333333333333333,1e16,3),1/3);
near(estimate(-3333333333333333.5,1e16,3),-1/6);
near(estimate(-3333333333333334,1e16,3),-2/3);
near(estimate(3333333333333333,-1e16,3),-1/3);
near(estimate(3333333333333333.5,-1e16,3),1/6);
near(estimate(-3333333333333333,-1e16,-3),1/3);
// Conventional INV predictions, zero coefficients and signed X.
for(const x of [-10,-4,-2,-1,1,2,4,10]){
 near(estimate(2,3,x),2+3/x);
 near(estimate(-2,0,x),-2);
 near(estimate(0,3,x),3/x);
}
near(estimate(0,1e-300,1e-300),1);
near(estimate(1e99,0,1e-300),1e99);
assert.throws(()=>estimate(2,3,0),/Math ERROR/);
assert.throws(()=>estimate(1e99,1e99,1e-99),/Math ERROR/);
// Preserve inverse X and earlier prediction paths.
near(REG.estimateX({type:'INV',A:2,B:3},2.75)[0],4);
near(REG.estimateY({type:'LIN',A:3e16,B:-3},1e16+2),-6);
near(REG.estimateY({type:'QUAD',A:1e16,B:-2e8,C:1},1e8+1),1);
const t={paired:true,frequency:false,rows:[
 {X:1,Y:3,FREQ:1},{X:2,Y:2,FREQ:1},{X:4,Y:1.5,FREQ:1}
]};
const fit=REG.fit(t,'INV');
near(fit.A,1);near(fit.B,2);
near(REG.estimateY(fit,4),1.5);
console.log('REA-121 compensated INV prediction checks passed');
