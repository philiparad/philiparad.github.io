/* REA-086: STAT regression model numerical and source-level validation.
 * node calculator/tests/rea086-stat-regression.cjs
 * No physical calculator parity is claimed by these tests.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const R=require('../js/stat-regression.js');
const E=require('../js/stat-editor.js');
const P=require('../js/stat-parameters.js');
let passed=0;
function check(name,fn){try{fn();passed++}catch(e){e.message=name+': '+e.message;throw e}}
function near(actual,expected,tol=2e-10){
 assert.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),
  actual+' differs from '+expected);
}
function table(xs,ys,weights){
 const t=E.create(true,!!weights);
 t.rows=xs.map((X,i)=>({X,Y:ys[i],FREQ:weights?weights[i]:1}));
 return t;
}
const xs=[1,2,3,4,5];
const models=[
 ['LIN',x=>2+3*x,{A:2,B:3}],
 ['QUAD',x=>1+2*x+0.5*x*x,{A:1,B:2,C:0.5}],
 ['LOG',x=>2+3*Math.log(x),{A:2,B:3}],
 ['EXP',x=>2*Math.exp(0.3*x),{A:2,B:0.3}],
 ['ABEXP',x=>2*Math.pow(1.3,x),{A:2,B:1.3}],
 ['POWER',x=>2*Math.pow(x,1.5),{A:2,B:1.5}],
 ['INV',x=>2+3/x,{A:2,B:3}]
];
check('eight STAT types including 1VAR',()=>assert.deepEqual(
 R.TYPES.map(t=>t.id),['1VAR','LIN','QUAD','LOG','EXP','ABEXP','POWER','INV']));
for(const [type,fn,expected] of models){
 const t=table(xs,xs.map(fn));
 check(type+' coefficient names and order',()=>{
  const fit=R.fit(t,type);
  for(const [k,want] of Object.entries(expected))near(fit[k],want);
  assert.deepEqual(R.regLines(fit).map(s=>s.split(' = ')[0]),
    type==='QUAD'?['A','B','C']:['A','B','r']);
 });
 check(type+' yHat interpolates synthetic exact fit',()=>near(R.estimateY(R.fit(t,type),2),fn(2)));
 check(type+' xHat reconstructs y',()=>{
  const fit=R.fit(t,type);
  const roots=R.estimateX(fit,fn(2));
  assert.ok(roots.some(v=>Math.abs(v-2)<1e-9));
  for(const root of roots)near(R.estimateY(fit,root),fn(2));
 });
 check(type+' frequency equivalence to duplicated observations',()=>{
  const weighted=table(xs,xs.map(fn),[1,2,3,2,1]);
  const duplicatesX=xs.flatMap((x,i)=>Array([1,2,3,2,1][i]).fill(x));
  const expanded=table(duplicatesX,duplicatesX.map(fn));
  const a=R.fit(weighted,type),b=R.fit(expanded,type);
  for(const key of Object.keys(expected))near(a[key],b[key]);
 });
}
check('quadratic xHat exposes both roots',()=>{
 const m=R.fit(table(xs,xs.map(x=>1+2*x+0.5*x*x)),'QUAD');
 const roots=R.estimateX(m,7);
 assert.equal(roots.length,2);near(roots[0],-6);near(roots[1],2);
});
check('quadratic negative discriminant Math ERROR',()=>assert.throws(
 ()=>R.estimateX({type:'QUAD',A:0,B:0,C:1},-1),/Math ERROR/));
check('quadratic three distinct x required',()=>assert.throws(
 ()=>R.fit(table([1,1,2,2],[1,2,3,4]),'QUAD'),/Math ERROR/));
check('linear single unique x rejected',()=>assert.throws(
 ()=>R.fit(table([1,1],[2,3]),'LIN'),/Math ERROR/));
check('empty table rejected',()=>assert.throws(
 ()=>R.fit(E.create(true),'LIN'),/Argument ERROR/));
check('one-variable table cannot regress',()=>assert.throws(
 ()=>R.fit(E.create(false),'LIN'),/Argument ERROR/));
check('log x nonpositive rejected',()=>assert.throws(
 ()=>R.fit(table([0,1,2],[1,2,3]),'LOG'),/Math ERROR/));
check('power x nonpositive rejected',()=>assert.throws(
 ()=>R.fit(table([-1,1,2],[1,2,3]),'POWER'),/Math ERROR/));
check('power y nonpositive rejected',()=>assert.throws(
 ()=>R.fit(table([1,2,3],[1,0,3]),'POWER'),/Math ERROR/));
check('exponential nonpositive y rejected',()=>assert.throws(
 ()=>R.fit(table([1,2,3],[1,-2,3]),'EXP'),/Math ERROR/));
check('AB exponential nonpositive y rejected',()=>assert.throws(
 ()=>R.fit(table([1,2,3],[1,0,3]),'ABEXP'),/Math ERROR/));
check('inverse x zero rejected',()=>assert.throws(
 ()=>R.fit(table([0,1,2],[1,2,3]),'INV'),/Math ERROR/));
check('inverse estimated x zero rejected',()=>assert.throws(
 ()=>R.estimateX({type:'INV',A:1,B:0},2),/Math ERROR/));
check('log yHat invalid x rejected',()=>assert.throws(
 ()=>R.estimateY({type:'LOG',A:1,B:2},0),/Math ERROR/));
check('negative frequency rejected',()=>assert.throws(
 ()=>R.fit(table([1,2],[3,4],[1,-1]),'LIN'),/Argument ERROR/));
check('zero frequency row ignored',()=>{
 const t=table([1,2,3],[5,8,100],[1,1,0]);
 const fit=R.fit(t,'LIN');near(fit.A,2);near(fit.B,3);
});
check('weighted summary n, sums, means, SD',()=>{
 const s=R.summary(table([1,3],[2,6],[1,3]));
 assert.equal(s.n,4);near(s.sumX,10);near(s.sumY,20);
 near(s.meanX,2.5);near(s.meanY,5);
 near(s.sdX,Math.sqrt(.75));near(s.sampleSDX,1);
 near(s.sumXY,56);near(s.sumX2,28);near(s.sumY2,112);
});
check('no accidental mutation of STAT rows',()=>{
 const t=table(xs,xs.map(x=>2+3*x));
 const before=JSON.stringify(t);
 R.fit(t,'LIN');R.summary(t);assert.equal(JSON.stringify(t),before);
});
check('source retains STAT controller and parameter resolver wiring',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(app,/REG\.fit\(/);
 assert.match(app,/REG\.estimateX\(/);
 assert.match(app,/REG\.estimateY\(/);
 assert.ok(html.indexOf('js/stat-regression.js')>=0);
 assert.ok(html.indexOf('js/stat-regression.js')<html.indexOf('js/app.js'));
});
check('model-specific xHat1 xHat2 and cancel paths remain',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const block=app.slice(app.indexOf('function originalStatEstimate('),app.indexOf('function statMenu(){'));
 assert.match(block,/item\.root>=results\.length/);
 assert.match(block,/stat-original-estimate/);
 assert.match(app,/releaseModifier\(/);
});
console.log('REA-086 PASS '+passed+' source-level regression checks; physical reference and browser traces pending');
