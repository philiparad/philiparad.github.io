'use strict';
/* Manual-based mathematical and model-profile regression.
 * These are source-level expectations, not physical-device measurements.
 */
const assert=require('node:assert/strict');
const M=require('../../js/math-engine.js');
const C=require('../../js/coordinates.js');
const Z=require('../../js/complex-engine.js');
const N=require('../../js/stat-normal.js');
const REG=require('../../js/stat-regression.js');
const PROFILES=require('../../js/model-profiles.js');
const CASES=require('./cases.json');

let checks=0;
function near(actual,expected,rel=1e-9){
 checks++;
 assert.ok(Number.isFinite(actual),'nonfinite result '+actual);
 assert.ok(Math.abs(actual-expected)<=rel*Math.max(1,Math.abs(expected)),
  'expected '+expected+', got '+actual);
}
function throws(fn,re){
 checks++;
 assert.throws(fn,re);
}
const common=[
 ['2+3*4',14],['(2+3)*4',20],['1/4',.25],['3^2',9],['2^10',1024],
 ['sqrt(9)',3],['sqrt(144)',12],['(2+3)^2',25],
 ['9-4',5],['3*4-5',7],['1/(2+3)',.2],['0.1+0.2',.3],
 ['5!',120],['5 nCr 2',10],['5 nPr 2',20],
 ['sin(0)',0],['sin(30)',.5],['cos(60)',.5],['tan(45)',1],
 ['log(100)',2],['ln(1)',0],['ln(e)',1],['exp(1)',Math.E],
 ['Abs(-5)',5],['3/2+1/2',2],['(3^2-1)/4',2],['sin(90)',1],
 ['cos(0)',1],['(1+2+3+4)/4',2.5],['sqrt(16)+sqrt(9)',7]
];
for(const model of Object.keys(CASES.models)){
 assert.equal(PROFILES.get(model).hardwareVerified,false);
 for(const [expr,want] of common)near(M.evaluate(expr,{model,angle:'DEG'}),want);
 near(M.evaluate('sin(100)',{model,angle:'GRAD'}),1);
 near(M.evaluate('sin(pi/2)',{model,angle:'RAD'}),1);
 throws(()=>M.evaluate('1/0',{model}),/Math ERROR/);
 throws(()=>M.evaluate('sqrt(-1)',{model}),/Math ERROR/);
}
throws(()=>M.evaluate('RanInt(1,6)',{model:'fx-991es'}),/Argument ERROR/);
for(const model of ['fx-991es-plus','fx-991es-plus-c']){
 const value=M.evaluate('RanInt(1,6)',{model});
 checks++;assert.ok(value>=1&&value<=6);
}
near(M.factorial(5),120);
near(M.combination(10,3),120);
near(M.permutation(5,2),20);
throws(()=>M.factorial(-1),/Math ERROR/);
throws(()=>M.combination(3,5),/Math ERROR/);
near(M.summation(k=>k,1,10),55);
near(M.summation(k=>k*k,1,3),14);
near(M.derivative(x=>x*x,3),6,1e-7);
near(M.integrate(x=>x*x,0,2),8/3,1e-7);
near(M.solve(x=>x*x-4,1),2,1e-7);
near(M.matrixSolve([[2,1,5],[1,-1,1]])[0],2);
near(M.matrixSolve([[2,1,5],[1,-1,1]])[1],1);
const pol=C.coordinate('Pol',3,4,'DEG');
near(pol.first,5);near(pol.second,53.13010235415598);
const rec=C.coordinate('Rec',5,pol.second,'DEG');
near(rec.first,3);near(rec.second,4);
const z=Z.evaluate('(2+3i)*(1-2i)',{});
near(z.re,8);near(z.im,-1);
const dist=N.probabilities(1);
near(dist.P,0.8413447460685429);
near(dist.Q,0.3413447460685429);
near(dist.R,0.15865525393145707);
near(N.calculate('P',0),.5);
near(N.calculate('Q',0),0);
near(N.calculate('R',0),.5);
const stats=REG.summary({paired:false,frequency:true,rows:[
 {X:1,Y:null,FREQ:1},{X:3,Y:null,FREQ:2}]});
near(stats.n,3);near(stats.meanX,7/3);
near(stats.minX,1);near(stats.maxX,3);
const lin=REG.fit({paired:true,frequency:false,rows:[
 {X:1,Y:3,FREQ:1},{X:2,Y:5,FREQ:1},{X:3,Y:7,FREQ:1}]},'LIN');
near(lin.A,1);near(lin.B,2);near(REG.estimateY(lin,4),9);
console.log('Scientific feature and 3-model source tests passed:',checks,'numerical/model checks + assertions');
