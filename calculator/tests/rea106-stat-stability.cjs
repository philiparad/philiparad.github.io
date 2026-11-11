/* REA-106: stable 1-VAR population and sample statistics.
 * Run: node calculator/tests/rea106-stat-stability.cjs
 * Mathematical source checks, not physical CASIO parity.
 */
'use strict';
const assert=require('node:assert/strict');
const REG=require('../js/stat-regression.js');
const NORMAL=require('../js/stat-normal.js');
const M=require('../js/math-engine.js');
const PARAM=require('../js/stat-parameters.js');
let count=0;
function check(label,action){try{action();count++}catch(e){e.message=label+': '+e.message;throw e}}
function near(actual,expected,eps=2e-12){
 assert.ok(Number.isFinite(actual));
 assert.ok(Math.abs(actual-expected)<=eps*Math.max(1,Math.abs(expected)),
  actual+' differs from '+expected);
}
function sample(xs,weights=null){
 return {paired:false,regressionType:'1VAR',frequency:!!weights,
  rows:xs.map((X,i)=>({X,Y:null,FREQ:weights?weights[i]:1}))};
}
const examples=[
 {name:'symmetric very large',data:sample([1e50,-1e50]),mean:0,sd:1e50},
 {name:'symmetric extreme',data:sample([1e90,-1e90]),mean:0,sd:1e90},
 {name:'same large values',data:sample([1e50,1e50]),mean:1e50,sd:0},
 {name:'ordinary',data:sample([2,4,6]),mean:4,sd:Math.sqrt(8/3)},
 {name:'fractional',data:sample([0.1,0.2,0.3]),mean:0.2,sd:Math.sqrt(2/300)},
 {name:'weighted ordinary',data:sample([1,3,5],[1,3,2]),
  mean:10/3,sd:Math.sqrt(17/9)},
 {name:'zero frequency ignored',data:sample([2,4,6,1e90],[1,1,1,0]),
  mean:4,sd:Math.sqrt(8/3)},
 {name:'large weighted',data:sample([1e50,-1e50],[3,1]),
  mean:5e49,sd:Math.sqrt(3)*5e49},
 {name:'near large offset',data:sample([1e60,1e60+1e50]),
  mean:(1e60+(1e60+1e50))/2,
  sd:Math.abs((1e60+1e50)-1e60)/2}
];
for(const test of examples){
 const table=test.data;
 const stat=REG.summary(table);
 check(test.name+' mean',()=>near(stat.meanX,test.mean));
 check(test.name+' population SD',()=>near(stat.sdX,test.sd,1e-10));
 check(test.name+' sample SD',()=>near(stat.sampleSDX,
  test.sd*Math.sqrt(stat.n/(stat.n-1)),1e-10));
 check(test.name+' normal field',()=>assert.equal(stat.n,
  table.rows.reduce((sum,r)=>sum+(r.X===null?0:table.frequency?r.FREQ:1),0)));
 check(test.name+' no mutation',()=>{
  const before=JSON.stringify(table);REG.summary(table);assert.equal(JSON.stringify(table),before);
 });
}
for(const test of examples.filter(x=>x.sd>0)){
 const stat=REG.summary(test.data),opts={model:'fx-991es',mode:'STAT',
  statOriginalDistr:true,statSummary:stat};
 const x=test.data.rows.find(r=>r.FREQ>0).X;
 const want=(x-stat.meanX)/stat.sdX;
 check(test.name+' normalized ▶t',()=>near(M.evaluate('X▶t',{...opts,memory:{X:x}}),want));
 check(test.name+' P normalized',()=>near(
  M.evaluate('P(X▶t)',{...opts,memory:{X:x}}),NORMAL.calculate('P',want)));
 check(test.name+' R normalized',()=>near(
  M.evaluate('R(X▶t)',{...opts,memory:{X:x}}),NORMAL.calculate('R',want)));
}
for(const xs of [[1e50,-1e50],[1e90,-1e90]]){
 const stat=REG.summary(sample(xs));
 check('valid Var lines independent of unrepresentable Sum X2',()=>{
  assert.ok(REG.varLines(stat,false).some(s=>s.includes('Sigma X')));
 });
 check('Sum X2 raises Math ERROR on display',()=>{
  assert.throws(()=>REG.sumLines(stat,false),/Math ERROR/);
 });
}
check('weighted count can reach STAT capacity',()=>{
 const rows=Array.from({length:100000},(_,i)=>({X:i%2?-1:1,Y:null,FREQ:1}));
 const stat=REG.summary({paired:false,frequency:false,rows});
 assert.equal(stat.n,100000);assert.equal(stat.meanX,0);assert.equal(stat.sdX,1);
});
check('weighted count 100001 denied',()=>{
 const rows=Array.from({length:100001},(_,i)=>({X:i%2?-1:1,Y:null,FREQ:1}));
 assert.throws(()=>REG.summary({paired:false,frequency:false,rows}),/Data Full/);
});
check('one datum has null sample SD',()=>{
 const stat=REG.summary(sample([3]));
 assert.equal(stat.sampleSDX,null);assert.equal(stat.sdX,0);
});
check('frequency edit immediately affects variance',()=>{
 const t=sample([1,3,5],[1,1,1]),old=REG.summary(t);
 t.rows[1].FREQ=5;
 const updated=REG.summary(t);
 assert.notEqual(updated.sdX,old.sdX);
});
check('paired regression remains operational',()=>{
 const t={paired:true,frequency:false,regressionType:'LIN',rows:[
  {X:1,Y:3,FREQ:1},{X:2,Y:5,FREQ:1},{X:3,Y:7,FREQ:1}]};
 const stat=REG.summary(t);
 near(stat.meanX,2);near(stat.meanY,5);
 const fit=REG.fit(t,'LIN');near(fit.A,1);near(fit.B,2);
});
check('original Var menu resolves extreme Sigma X',()=>{
 const t=sample([1e50,-1e50]);
 assert.equal(PARAM.resolve('StatSDX',t,REG).StatSDX,1e50);
});
check('original Sum menu rejects extreme Sum X2',()=>{
 const t=sample([1e50,-1e50]);
 assert.throws(()=>PARAM.resolve('StatSumX2',t,REG),/Math ERROR/);
});
check('original Sum X still resolves representable zero',()=>{
 const t=sample([1e50,-1e50]);
 assert.equal(PARAM.resolve('StatSumX',t,REG).StatSumX,0);
});
check('original Sum X2 still resolves ordinary data',()=>{
 const t=sample([2,4,6]);
 assert.equal(PARAM.resolve('StatSumX2',t,REG).StatSumX2,56);
});
check('large Sum X rejects while mean remains valid',()=>{
 const t=sample([9e99,9e99]);
 assert.equal(PARAM.resolve('StatMeanX',t,REG).StatMeanX,9e99);
 assert.throws(()=>PARAM.resolve('StatSumX',t,REG),/Math ERROR/);
});
check('oversized sample SD does not block valid population SD',()=>{
 const t=sample([8e99,-8e99]);
 const stat=REG.summary(t);
 assert.equal(stat.sdX,8e99);
 assert.ok(stat.sampleSDX>9.999999999e99);
 assert.equal(PARAM.resolve('StatSDX',t,REG).StatSDX,8e99);
 assert.throws(()=>PARAM.resolve('StatSampleSDX',t,REG),/Math ERROR/);
});
console.log('REA-106 PASS '+count+' isolated STAT numerical and model regression checks; hardware unverified');
