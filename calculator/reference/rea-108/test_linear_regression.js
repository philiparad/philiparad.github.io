'use strict';
const assert=require('node:assert/strict');
const Stat=require('../../js/stat-regression.js');
const data=(rows,frequency=false)=>({paired:true,frequency,rows});
const row=(X,Y,FREQ=1)=>({X,Y,FREQ});
function close(actual,expected,tol=1e-12){
 assert.ok(Number.isFinite(actual),`expected finite ${expected}; received ${actual}`);
 assert.ok(Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),
  `expected ${expected}, received ${actual}`);
}
function fit(rows,mode='LIN',frequency=false){return Stat.fit(data(rows,frequency),mode)}
// Previously correlation erroneously returned 0: xx*yy overflowed.
const large=fit([row(-1e90,-1e90),row(1e90,1e90)]);
close(large.A,0);close(large.B,1);close(large.correlation,1);
const negative=fit([row(-1e90,1e90),row(1e90,-1e90)]);
close(negative.A,0);close(negative.B,-1);close(negative.correlation,-1);
const mixed=fit([row(-1e90,-1),row(1e90,1)]);
close(mixed.B,1e-90);close(mixed.correlation,1);
close(mixed.A,0);
// Standard values and weighted regression.
const standard=fit([row(1,3),row(2,5),row(3,7)]);
close(standard.A,1);close(standard.B,2);close(standard.correlation,1);
const weighted=fit([row(0,2,2),row(4,10,1),row(900,900,0)],'LIN',true);
close(weighted.A,2);close(weighted.B,2);close(weighted.correlation,1);
const horizontal=fit([row(1,5),row(2,5),row(3,5)]);
close(horizontal.A,5);close(horizontal.B,0);
assert.equal(horizontal.correlation,null);
assert.throws(()=>fit([row(2,1),row(2,3)]),/Math ERROR/);
assert.throws(()=>fit([row(1e-90,1e50),row(2e-90,2e50)]),/Math ERROR/);
// Original regression transforms must continue to use the shared linear fit.
const logarithmic=fit([row(1,2),row(Math.E,5)],'LOG');
close(logarithmic.A,2);close(logarithmic.B,3);close(logarithmic.correlation,1);
const inverse=fit([row(1,3),row(2,2)],'INV');
close(inverse.A,1);close(inverse.B,2);close(inverse.correlation,1);
const many=Array.from({length:100000},(_,i)=>row(i%2,(i%2)*2+3));
const largeCount=fit(many);
close(largeCount.A,3);close(largeCount.B,2);close(largeCount.correlation,1);
console.log('REA-108: native linear regression tests passed');
