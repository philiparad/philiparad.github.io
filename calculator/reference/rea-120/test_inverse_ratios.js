'use strict';
const assert=require('node:assert/strict');
const REG=require('../../js/stat-regression.js');
const inv=(type,A,B,y)=>REG.estimateX({type,A,B},y)[0];
const near=(actual,expected,relative=1e-11)=>{
 assert.ok(Number.isFinite(actual),'expected finite inverse result');
 assert.ok(Math.abs(actual-expected)<=relative*Math.max(Math.abs(expected),1e-300),
  'expected '+expected+', received '+actual);
};
const high=Math.log(1e99)-Math.log(1e-300);
const low=-high;
// Intermediate y/A overflows or underflows, but the inverse fits.
near(inv('EXP',1e-300,1,1e99),high);
near(inv('EXP',1e99,1,1e-300),low);
near(inv('EXP',1e-300,-2,1e99),-high/2);
near(inv('EXP',1e99,-2,1e-300),-low/2);
near(inv('ABEXP',1e-300,Math.E,1e99),high);
near(inv('ABEXP',1e99,Math.E,1e-300),low);
near(inv('ABEXP',1e-300,2,1e99),high/Math.log(2));
near(inv('ABEXP',1e99,0.5,1e-300),low/Math.log(0.5));
near(inv('POWER',1e-300,5,1e99),Math.exp(high/5));
near(inv('POWER',1e99,5,1e-300),Math.exp(low/5));
near(inv('POWER',1e-300,-5,1e99),Math.exp(-high/5));
near(inv('POWER',1e99,-5,1e-300),Math.exp(-low/5));
// Ordinary inverse behavior and domain semantics remain unchanged.
near(inv('EXP',2,1,2*Math.E),1);
near(inv('ABEXP',2,3,18),2);
near(inv('POWER',2,3,16),2);
near(inv('POWER',2,-2,0.5),2);
assert.throws(()=>inv('EXP',0,1,2),/Math ERROR/);
assert.throws(()=>inv('EXP',2,0,2),/Math ERROR/);
assert.throws(()=>inv('EXP',2,1,0),/Math ERROR/);
assert.throws(()=>inv('ABEXP',2,1,2),/Math ERROR/);
assert.throws(()=>inv('ABEXP',2,-2,2),/Math ERROR/);
assert.throws(()=>inv('POWER',2,0,2),/Math ERROR/);
assert.throws(()=>inv('POWER',2,2,-1),/Math ERROR/);
assert.throws(()=>inv('POWER',1e-300,1,1e99),/Math ERROR/);
// Other regression inverse and prediction paths remain intact.
near(REG.estimateX({type:'LIN',A:1,B:2},9)[0],4);
const roots=REG.estimateX({type:'QUAD',A:1e16,B:-2e8,C:1},1);
near(roots[0],99999999);near(roots[1],100000001);
near(REG.estimateY({type:'EXP',A:1e-300,B:1},800),Math.exp(Math.log(1e-300)+800));
const table={paired:true,frequency:false,rows:[
 {X:0,Y:2,FREQ:1},{X:1,Y:2*Math.E,FREQ:1},{X:2,Y:2*Math.E**2,FREQ:1}]};
const fitted=REG.fit(table,'EXP');
near(REG.estimateX(fitted,2*Math.exp(3))[0],3);
console.log('REA-120 inverse regression ratio tests passed');
