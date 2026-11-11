'use strict';
const assert=require('node:assert/strict');
const R=require('../../js/stat-regression.js');
const roots=(A,B,C,y=0)=>R.estimateX({type:'QUAD',A,B,C},y);
const approx=(actual,expected,rel=1e-12)=>{
 assert.ok(Number.isFinite(actual),'nonfinite root '+actual);
 assert.ok(Math.abs(actual-expected)<=rel*Math.max(1,Math.abs(expected)),
  'expected '+expected+', got '+actual);
};
for(const base of [1e7,1e8,1e9,1e10]){
 for(const target of [1,4,9]){
  const got=roots(base*base,-2*base,1,target);
  approx(got[0],base-Math.sqrt(target));
  approx(got[1],base+Math.sqrt(target));
  assert.ok(got[0]<got[1],'the distinct roots must not collapse');
 }
}
for(const base of [1e7,1e8,1e9]){
 const double=roots(base*base,-2*base,1,0);
 approx(double[0],base);approx(double[1],base);
 assert.throws(()=>roots(base*base,-2*base,1,-1),/Math ERROR/);
}
let x=roots(1,1e90,1);
approx(x[0],-1e90);approx(x[1],-1e-90,1e-12);
x=roots(1,-1e90,1);
approx(x[0],1e-90);approx(x[1],1e90);
x=roots(-6,-1,1);
approx(x[0],-2);approx(x[1],3);
assert.deepEqual(roots(0,2,0),[0]);
assert.throws(()=>roots(1,0,1),/Math ERROR/);
assert.throws(()=>roots(1,0,0),/Math ERROR/);
const data={paired:true,frequency:true,rows:[
 {X:-1,Y:1,FREQ:1},{X:0,Y:0,FREQ:2},{X:1,Y:1,FREQ:1}]};
const fit=R.fit(data,'QUAD');
approx(fit.C,1);
const fitted=R.estimateX(fit,1);
approx(fitted[0],-1);approx(fitted[1],1);
const base=1e9;
approx(R.estimateY({type:'QUAD',A:base*base,B:-2*base,C:1},base+2),4);
approx(R.estimateY({type:'LIN',A:3e16,B:-3},1e16+2),-6);
console.log('REA-118 compensated inverse discriminant tests passed');
