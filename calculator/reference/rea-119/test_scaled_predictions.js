'use strict';
const assert=require('node:assert/strict');
const REG=require('../../js/stat-regression.js');
const pred=(type,A,B,x)=>REG.estimateY({type,A,B},x);
const near=(got,want,tol=1e-11)=>{
 assert.ok(Number.isFinite(got),'expected finite');
 assert.ok(Math.abs(got-want)<=tol*Math.max(Math.abs(want),1e-300),
  'expected '+want+', got '+got);
};
// An intermediate EXP factor overflows, but the scaled value fits the display.
near(pred('EXP',1e-300,1,800),Math.exp(800+Math.log(1e-300)));
near(pred('EXP',-1e-300,1,800),-Math.exp(800+Math.log(1e-300)));
near(pred('EXP',1e99,-1,800),Math.exp(-800+Math.log(1e99)));
assert.ok(pred('EXP',1e99,-1,800)>0);
// The A*B^x model has the same hidden overflow and underflow.
near(pred('ABEXP',1e-300,Math.E,800),Math.exp(800+Math.log(1e-300)));
near(pred('ABEXP',1e99,Math.E,-800),Math.exp(-800+Math.log(1e99)));
near(pred('ABEXP',-1e-300,Math.E,800),-Math.exp(800+Math.log(1e-300)));
// Powers can overflow or underflow independently of A.
near(pred('POWER',1e-300,4,1e90),1e60);
near(pred('POWER',1e99,-4,1e90),1e-261);
near(pred('POWER',-1e-300,4,1e90),-1e60);
assert.ok(pred('POWER',1e99,-4,1e90)>0);
// Maintain ordinary arithmetic and negative base behavior.
near(pred('EXP',2,0.5,3),2*Math.exp(1.5));
near(pred('ABEXP',3,2,4),48);
near(pred('POWER',3,2,4),48);
assert.equal(pred('EXP',0,1,800),0);
assert.equal(pred('ABEXP',0,Math.E,800),0);
assert.equal(pred('POWER',0,4,1e90),0);
assert.equal(pred('ABEXP',2,-2,3),-16);
assert.equal(pred('ABEXP',2,-2,2),8);
assert.throws(()=>pred('POWER',1,2,-1),/Math ERROR/);
assert.throws(()=>pred('EXP',1e99,1,800),/Math ERROR/);
assert.throws(()=>pred('POWER',1e99,4,1e90),/Math ERROR/);
// Other regression prediction types are unchanged.
near(REG.estimateY({type:'LIN',A:3e16,B:-3},1e16+2),-6);
near(REG.estimateY({type:'QUAD',A:1e16,B:-2e8,C:1},1e8+1),1);
const fitted=REG.fit({paired:true,frequency:false,rows:[
 {X:0,Y:2,FREQ:1},{X:1,Y:2*Math.E,FREQ:1},{X:2,Y:2*Math.E**2,FREQ:1}
]},'EXP');
near(fitted.A,2);near(fitted.B,1);
near(REG.estimateY(fitted,3),2*Math.exp(3));
console.log('REA-119 exponential and power scaling tests passed');
