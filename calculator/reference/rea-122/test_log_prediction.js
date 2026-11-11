'use strict';
const assert=require('node:assert/strict');
const REG=require('../../js/stat-regression.js');
const predict=(A,B,x)=>REG.estimateY({type:'LOG',A,B},x);
const near=(actual,expected,tol=1e-12)=>{
 assert.ok(Number.isFinite(actual),'result must be finite');
 assert.ok(Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),
  'expected '+expected+' got '+actual);
};
// Double-double reference: for cancellation of a separately rounded
// binary64 product, representable low-order residuals must survive.
const cases=[
 [2,-6931471805599453,-0.1377323601700482],
 [3,-10986122886681098,-0.17891782413062174],
 [5,-16094379124341002,0.8179994242236717],
 [7,-19459101490553132,0.31869490664394107],
 [10,-23025850929940460,-0.9890638620709069]
];
for(const [x,A,expected] of cases){
 near(predict(A,1e16,x),expected);
 near(predict(-A,-1e16,x),-expected);
 assert.notEqual(predict(A,1e16,x),0);
}
for(const x of [0.1,0.5,1,2,3,10,100]){
 near(predict(1,2,x),1+2*Math.log(x));
 near(predict(4,0,x),4);
}
near(predict(0,1,Math.E),1);
near(predict(0,0,1),0);
assert.throws(()=>predict(1,2,0),/Math ERROR/);
assert.throws(()=>predict(1,2,-1),/Math ERROR/);
assert.throws(()=>predict(1e99,1e99,1e99),/Math ERROR/);
// Other modes, inverse LOG and fitted LOG remain compatible.
near(REG.estimateY({type:'LIN',A:3e16,B:-3},1e16+2),-6);
near(REG.estimateY({type:'QUAD',A:1e16,B:-2e8,C:1},1e8+1),1);
near(REG.estimateX({type:'LOG',A:1,B:2},5)[0],Math.E**2);
const t={paired:true,frequency:false,rows:[
 {X:1,Y:1,FREQ:1},{X:Math.E,Y:3,FREQ:1},{X:Math.E**2,Y:5,FREQ:1}
]};
const fit=REG.fit(t,'LOG');
near(fit.A,1);near(fit.B,2);
near(REG.estimateY(fit,Math.E**3),7);
console.log('REA-122 compensated LOG prediction tests passed');
