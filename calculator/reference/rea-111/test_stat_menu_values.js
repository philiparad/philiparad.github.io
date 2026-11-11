'use strict';
const assert=require('node:assert/strict');
const STAT=require('../../js/stat-regression.js');
const table=(xs,ys=null,frequency=false,weights=[])=>({
 paired:ys!==null,
 frequency,
 rows:xs.map((X,i)=>({X,Y:ys===null?null:ys[i],FREQ:weights[i]??1}))
});
// The menu must still open when a sum is outside the numeric result range.
const one=STAT.summary(table([1e50,-1e50]));
assert.deepEqual(STAT.sumLines(one,false),[
 'Sum X2 = Math ERROR',
 'Sum X = 0'
]);
assert.deepEqual(STAT.varLines(one,false).slice(0,2),['n = 2','Mean X = 0']);
// Sample sigma can be out of range while population sigma remains valid.
const nearLimit=STAT.summary(table([9e99,-9e99]));
const vars=STAT.varLines(nearLimit,false);
assert.deepEqual(vars,['n = 2','Mean X = 0','Sigma X = 9e+99','s X = Math ERROR']);
assert.deepEqual(STAT.minMaxLines(nearLimit,false),['minX = -9e+99','maxX = 9e+99']);
// Paired STAT must keep available Y sums and both means when X2 overflows.
const paired=STAT.summary(table([1e50,-1e50],[3,5]));
const sums=STAT.sumLines(paired,true);
assert.equal(sums.length,8);
assert.equal(sums[0],'Sum X2 = Math ERROR');
assert.equal(sums[1],'Sum X = 0');
assert.equal(sums[2],'Sum Y2 = 34');
assert.equal(sums[3],'Sum Y = 8');
assert.equal(sums[4],'Sum XY = -2e+50');
assert.equal(sums[5],'Sum X3 = 0');
assert.equal(sums[6],'Sum X2Y = Math ERROR');
assert.equal(sums[7],'Sum X4 = Math ERROR');
const pv=STAT.varLines(paired,true);
assert.ok(pv.includes('Mean Y = 4'));
assert.ok(pv.includes('Sigma Y = 1'));
// FREQ zero rows are ignored; unrelated failures don't mask valid sums.
const weighted=STAT.summary(table([9e99,-9e99,9e99],[1,1,1],true,[1,1,0]));
assert.equal(STAT.sumLines(weighted,true)[1],'Sum X = 0');
assert.equal(STAT.varLines(weighted,true)[6],'Sigma Y = 0');
// Preserve normal results, missing values and string formatting.
const normal=STAT.summary(table([1,3]));
assert.deepEqual(STAT.sumLines(normal,false),['Sum X2 = 10','Sum X = 4']);
assert.deepEqual(STAT.varLines(normal,false),['n = 2','Mean X = 2','Sigma X = 1','s X = 1.41421356237']);
assert.ok(STAT.regLines({type:'LIN',A:1,B:2,correlation:null}).includes('r = N/A'));
// app.js's existing selected-value logic rejects the unavailable entry.
const select=(line)=>{
 const raw=Number(line.split(' = ')[1]);
 if(!Number.isFinite(raw))throw Error('Math ERROR');
 return STAT.format(raw);
};
assert.throws(()=>select(sums[0]),/Math ERROR/);
assert.throws(()=>select(vars[3]),/Math ERROR/);
assert.equal(select(sums[1]),'0');
assert.equal(select(sums[3]),'8');
console.log('REA-111 per-result STAT menus passed');
