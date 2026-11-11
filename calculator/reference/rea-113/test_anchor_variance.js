'use strict';
const assert=require('node:assert/strict');
const STAT=require('../../js/stat-regression.js');
const table=(xs,ys=null,weights=null)=>({
 paired:ys!==null,frequency:weights!==null,
 rows:xs.map((X,i)=>({X,Y:ys===null?null:ys[i],FREQ:weights===null?1:weights[i]}))
});
const near=(actual,expected,relative=1e-12)=>{
 assert.ok(Number.isFinite(actual),'nonfinite result');
 assert.ok(Math.abs(actual-expected)<=relative*Math.max(1,Math.abs(expected)),
  'expected '+expected+' but received '+actual);
};
const offset=STAT.summary(table([1e16,1e16+2]));
assert.equal(offset.meanX,1e16); // the actual midpoint cannot be represented
near(offset.sdX,1);near(offset.sampleSDX,Math.SQRT2);
near(offset.varianceX,1);
const shifted=STAT.summary(table([1e15,1e15+1]));
near(shifted.meanX,1e15+0.5);near(shifted.sdX,0.5);
const weighted=STAT.summary(table([1e16,1e16+2,9e99],null,[3,1,0]));
near(weighted.sdX,Math.sqrt(0.75));
near(weighted.sampleSDX,1);
assert.equal(weighted.n,4);
assert.equal(weighted.maxX,1e16+2);
const paired=STAT.summary(table([1e16,1e16+2],[1e16+2,1e16],[1,1]));
near(paired.sdX,1);near(paired.sdY,1);
near(paired.sampleSDX,Math.SQRT2);
near(paired.sampleSDY,Math.SQRT2);
const identical=STAT.summary(table([1e16,1e16]));
near(identical.sdX,0);
near(identical.meanX,1e16);
const opposite=STAT.summary(table([-1e90,1e90]));
near(opposite.meanX,0);near(opposite.sdX,1e90);
const range=STAT.summary(table([9e99,-9e99]));
near(range.sdX,9e99);
assert.equal(STAT.varLines(range,false)[3],'s X = Math ERROR');
assert.equal(STAT.sumLines(range,false)[0],'Sum X2 = Math ERROR');
assert.equal(STAT.sumLines(range,false)[1],'Sum X = 0');
const normal=STAT.summary(table([1,2,3]));
near(normal.meanX,2);near(normal.sdX,Math.sqrt(2/3));
const rows=Array.from({length:100000},(_,i)=>i%2?1e16+2:1e16);
const many=STAT.summary(table(rows));
assert.equal(many.n,100000);near(many.sdX,1);
console.log('REA-113 anchored weighted variance checks passed');
