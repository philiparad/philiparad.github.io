'use strict';
const assert=require('node:assert/strict');
const REG=require('../../js/stat-regression.js');
const estimate=(A,B,x)=>REG.estimateY({type:'LIN',A,B},x);
const approx=(value,expected,rel=1e-12)=>{
 assert.ok(Number.isFinite(value),'result must be finite');
 assert.ok(Math.abs(value-expected)<=rel*Math.max(1,Math.abs(expected)),
  'expected '+expected+', received '+value);
};
// Regression for cancellation in LIN yHat where B*x loses low-order digits.
for(const scale of [1e16,1e17]){
 for(const B of [-3,-5,-7,3,5,7]){
  for(const delta of [2,4,6,-2,-4,-6]){
   const x=scale+delta;
   // Reference expected uses the represented x difference rather than
   // assuming decimal inputs survived binary64 conversion.
   const actualOffset=x-scale;
   approx(estimate(-B*scale,B,x),B*actualOffset);
  }
 }
}
// Normal slope/intercept and constant regression remain unchanged.
for(const x of [-100,-2,-1,0,1,2,100]){
 approx(estimate(3,2,x),3+2*x);
}
approx(estimate(7,0,1e90),7);
approx(estimate(0,0,0),0);
approx(estimate(0,1,1e-90),1e-90);
assert.throws(()=>estimate(1e99,1e99,1e99),/Math ERROR/);
assert.throws(()=>estimate(1,2,Infinity),/Math ERROR/);
// REA-116 quadratic cancellation behavior must remain intact.
const base=1e9;
approx(REG.estimateY({type:'QUAD',A:base*base,B:-2*base,C:1},base+2),4);
// LIN fitted coefficients and inverse estimation still use original paths.
const rows=[{X:1,Y:3,FREQ:1},{X:2,Y:5,FREQ:1},{X:3,Y:7,FREQ:1}];
const fit=REG.fit({paired:true,frequency:false,rows},'LIN');
approx(fit.A,1);approx(fit.B,2);
approx(REG.estimateY(fit,4),9);
approx(REG.estimateX(fit,9)[0],4);
console.log('REA-117 compensated LIN prediction tests passed');
