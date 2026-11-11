'use strict';
const assert=require('node:assert/strict');
const STAT=require('../../js/stat-regression.js');
const table=(xs,ys=null,weights=null)=>({
 paired:ys!==null,frequency:weights!==null,
 rows:xs.map((X,i)=>({X,Y:ys===null?null:ys[i],FREQ:weights===null?1:weights[i]}))
});
const near=(actual,expected,tol=1e-12)=>{
 assert.ok(Number.isFinite(actual),'expected finite value');
 assert.ok(Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),
  'expected '+expected+', got '+actual);
};
const sample=STAT.summary(table([1e90,1,-1e90]));
assert.equal(sample.sumX,1);
near(sample.meanX,1/3);
assert.equal(STAT.sumLines(sample,false)[1],'Sum X = 1');
const reordered=STAT.summary(table([1e90,-1e90,1]));
assert.equal(reordered.sumX,1);
near(reordered.meanX,1/3);
const negative=STAT.summary(table([1e90,-7,-1e90]));
assert.equal(negative.sumX,-7);
near(negative.meanX,-7/3);
const weighted=STAT.summary(table([1e90,1,-1e90,9e99],null,[1,3,1,0]));
assert.equal(weighted.sumX,3);
near(weighted.meanX,3/5);
assert.equal(weighted.n,5);
const paired=STAT.summary(table([1e90,1,-1e90],[1e90,2,-1e90]));
assert.equal(paired.sumX,1);
assert.equal(paired.sumY,2);
near(paired.meanX,1/3);
near(paired.meanY,2/3);
assert.equal(paired.sumXY,2e180);
const pairedSmall=STAT.summary(table([1e40,1,-1e40],[1e40,1,-1e40]));
assert.equal(pairedSmall.sumX,1);
assert.equal(pairedSmall.sumY,1);
// Explicitly out-of-range aggregates remain unavailable without blocking other Sum items.
const overflow=STAT.summary(table([1e50,-1e50]));
assert.equal(STAT.sumLines(overflow,false)[0],'Sum X2 = Math ERROR');
assert.equal(STAT.sumLines(overflow,false)[1],'Sum X = 0');
const offset=STAT.summary(table([1e16,1e16+2]));
assert.equal(offset.meanX,1e16);
near(offset.sdX,1);
near(offset.sampleSDX,Math.SQRT2);
const ordinary=STAT.summary(table([1,2,3]));
assert.equal(ordinary.sumX,6);
assert.equal(ordinary.sumX2,14);
near(ordinary.sdX,Math.sqrt(2/3));
// Valid data remain order independent and FREQ-weighted.
for(const xs of [[1e90,1,-1e90],[1,1e90,-1e90],[-1e90,1,1e90]]){
 assert.equal(STAT.summary(table(xs)).sumX,1);
}
const many=Array.from({length:100000},(_,i)=>i%2?1e90:-1e90);
const large=STAT.summary(table([...many.slice(0,50000),1,...many.slice(50001)]));
assert.equal(large.n,100000);
console.log('REA-115 compensated sums tests passed');
