'use strict';
const assert=require('node:assert/strict');
const Stat=require('../../js/stat-regression.js');
const point=(X,Y,FREQ=1)=>({X,Y,FREQ});
function approx(actual,expected,tolerance=1e-8){
 assert.ok(Number.isFinite(actual),'nonfinite coefficient');
 assert.ok(Math.abs(actual-expected)<=tolerance*Math.max(1e-200,Math.abs(expected),1),
   'expected '+expected+', received '+actual);
}
function fit(rows,frequency=false){
 return Stat.fit({paired:true,frequency,rows},'QUAD');
}
// Regression for valid points that failed the former absolute pivot cutoff.
for(const delta of [1e-5,1e-6,1e-7,1e-8]){
 const model=fit([point(0,0),point(delta,delta*delta),point(1,1)]);
 approx(model.C,1,2e-7);
 approx(model.B,0,2e-7);
 approx(model.A,0,2e-7);
}
// Large but representable x range, small coefficient C.
const huge=fit([point(-1e90,1),point(0,0),point(1e90,1)]);
approx(huge.A,0);approx(huge.B,0);
assert.ok(Math.abs(huge.C-1e-180)<=1e-190);
// Ordinary exact quadratic, with frequencies and a skipped outlier.
const weighted=fit([
 point(1,6,2),point(2,11,4),point(3,18,2),point(4,27,1),
 point(9e99,-9e99,0)
],true);
approx(weighted.A,3);approx(weighted.B,2);approx(weighted.C,1);
const constant=fit([point(1,7),point(2,7),point(3,7)]);
approx(constant.A,7);approx(constant.B,0);approx(constant.C,0);
assert.throws(()=>fit([point(1,2),point(1,2),point(3,4)]),/Math ERROR/);
assert.throws(()=>fit([point(1,2),point(2,3)]),/Math ERROR/);
const normalLinear=Stat.fit({paired:true,frequency:false,rows:[
 point(0,2),point(1,4),point(2,6)
]},'LIN');
approx(normalLinear.A,2);approx(normalLinear.B,2);
const many=Array.from({length:20000},(_,i)=>{
 const x=(i%11)-5;
 return point(x,3+2*x+x*x);
});
const large=fit(many);
approx(large.A,3);approx(large.B,2);approx(large.C,1);
console.log('REA-110 weighted QR test passed');
