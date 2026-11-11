'use strict';
const assert=require('node:assert/strict');
const REG=require('../../js/stat-regression.js');
const table=(xs,ys,weights=null)=>({paired:true,frequency:weights!==null,
 rows:xs.map((X,i)=>({X,Y:ys[i],FREQ:weights===null?1:weights[i]}))});
const fit=(xs,ys,weights=null,mode='LIN')=>REG.fit(table(xs,ys,weights),mode);
function approx(got,expected,tol=1e-12){
 assert.ok(Number.isFinite(got),'expected finite regression coefficient');
 assert.ok(Math.abs(got-expected)<=tol*Math.max(1,Math.abs(expected)),
  'expected '+expected+' received '+got);
}
let model=fit([1e16,1e16+2],[0,2]);
approx(model.B,1);approx(model.A,-1e16);approx(model.correlation,1);
model=fit([1e16,1e16+2],[1e16,1e16+2]);
approx(model.B,1);approx(model.A,0);approx(model.correlation,1);
model=fit([1e16,1e16+2],[2,0]);
approx(model.B,-1);approx(model.correlation,-1);
model=fit([1e16,1e16+2,1e16+4],[0,2,4]);
approx(model.B,1);approx(model.correlation,1);
model=fit([1e16,1e16+2,9e99],[0,2,9e99],[3,1,0]);
approx(model.B,1);approx(model.correlation,1);approx(model.A,-1e16);
model=fit([1,2,3],[3,5,7]);
approx(model.A,1);approx(model.B,2);approx(model.correlation,1);
model=fit([-1e90,1e90],[-1e90,1e90]);
approx(model.B,1);approx(model.correlation,1);
model=fit([1,2,3],[5,5,5]);
approx(model.A,5);approx(model.B,0);assert.equal(model.correlation,null);
assert.throws(()=>fit([2,2],[1,3]),/Math ERROR/);
assert.throws(()=>fit([1,2],[9e99,-9e99]),/Math ERROR/);
const log=fit([1,Math.E],[2,5],null,'LOG');
approx(log.A,2);approx(log.B,3);approx(log.correlation,1);
const inv=fit([1,2],[3,2],null,'INV');
approx(inv.A,1);approx(inv.B,2);approx(inv.correlation,1);
const many=Array.from({length:100000},(_,i)=>i%2);
const big=fit(many,many.map(x=>3+2*x));
approx(big.A,3);approx(big.B,2);approx(big.correlation,1);
console.log('REA-114 anchored linear regression checks passed');
