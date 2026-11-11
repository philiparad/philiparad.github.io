'use strict';
const assert=require('node:assert/strict');
const Stat=require('../../js/stat-regression.js');
function near(actual,expected,relative=1e-12){
 assert.ok(Number.isFinite(actual),'non-finite root');
 assert.ok(Math.abs(actual-expected)<=relative*Math.max(Math.abs(expected),1e-300),
  'expected '+expected+' but received '+actual);
}
const roots=(A,B,C,y=0)=>Stat.estimateX({type:'QUAD',A,B,C},y);
let r=roots(1,1e90,1);
near(r[0],-1e90);near(r[1],-1e-90);
assert.notEqual(r[1],0,'small negative root must not vanish');
r=roots(1,-1e90,1);
near(r[0],1e-90);near(r[1],1e90);
assert.notEqual(r[0],0,'small positive root must not vanish');
r=roots(-6,-1,1);
near(r[0],-2);near(r[1],3);
r=roots(6,-5,1);
near(r[0],2);near(r[1],3);
r=roots(1,-2,1);
near(r[0],1);near(r[1],1);
r=roots(0,0,1);
near(r[0],0);near(r[1],0);
r=roots(0,0,-1);
near(r[0],0);near(r[1],0);
r=roots(0,2,0);
assert.deepEqual(r,[0]);
r=roots(1,0,1,2);
near(r[0],-1);near(r[1],1);
r=roots(0,4,2);
near(r[0],-2);near(r[1],0);
assert.throws(()=>roots(1,0,1),/Math ERROR/);
assert.throws(()=>roots(1,0,0),/Math ERROR/);
assert.throws(()=>roots(1,1e100,1),/Math ERROR/);
const weighted={paired:true,frequency:true,rows:[
 {X:-1,Y:1,FREQ:1},{X:0,Y:0,FREQ:2},{X:1,Y:1,FREQ:1}]};
const fit=Stat.fit(weighted,'QUAD');
near(fit.A,0);near(fit.B,0);near(fit.C,1);
r=Stat.estimateX(fit,1);
near(r[0],-1);near(r[1],1);
console.log('REA-109 stable inverse quadratic test passed');
