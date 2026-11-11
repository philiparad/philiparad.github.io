'use strict';
const assert = require('node:assert/strict');
const Stat = require('../../js/stat-regression.js');
const paired = (rows, frequency=false) => ({paired:true,frequency,rows});
const near = (actual, expected, relative=1e-12) => {
    assert.ok(Math.abs(actual-expected) <= relative*Math.max(1,Math.abs(expected)),
        `expected ${expected}, got ${actual}`);
};
const extreme = Stat.summary(paired([
    {X:1e50,Y:1,FREQ:1},
    {X:-1e50,Y:2,FREQ:1}
]));
near(extreme.meanX,0);
near(extreme.sdX,1e50);
near(extreme.meanY,1.5);
near(extreme.sdY,0.5);
near(extreme.sampleSDX,Math.SQRT2*1e50);
assert.equal(extreme.minX,-1e50);
assert.equal(extreme.maxX,1e50);
assert.ok(Stat.varLines(extreme,true).some(line => line.startsWith('Sigma X = ')));
// REA-111: unavailable sums are marked per-entry; valid results remain selectable.
assert.equal(Stat.sumLines(extreme,true)[0], 'Sum X2 = Math ERROR');
assert.equal(Stat.sumLines(extreme,true)[1], 'Sum X = 0');
// A normal paired STAT table remains usable for sums and descriptive statistics.
const normal=Stat.summary(paired([
    {X:1,Y:2,FREQ:1},{X:3,Y:4,FREQ:1}
]));
near(normal.meanX,2); near(normal.meanY,3);
near(normal.sdX,1); near(normal.sdY,1);
assert.ok(Stat.sumLines(normal,true).includes('Sum X = 4'));
assert.ok(Stat.sumLines(normal,true).includes('Sum XY = 14'));
// Frequency and zero-weight semantics must remain intact.
const weighted=Stat.summary(paired([
    {X:1,Y:10,FREQ:3},{X:5,Y:30,FREQ:1},
    {X:1e90,Y:1e90,FREQ:0}
],true));
assert.equal(weighted.n,4);
near(weighted.meanX,2); near(weighted.meanY,15);
near(weighted.sdX,Math.sqrt(3)); near(weighted.sdY,Math.sqrt(75));
assert.equal(weighted.maxX,5); assert.equal(weighted.maxY,30);
// Large valid paired table must not depend on spreading 100000 arguments.
const rows=Array.from({length:100000},(_,i)=>({X:i%3,Y:(i%3)+2,FREQ:1}));
const large=Stat.summary(paired(rows));
assert.equal(large.n,100000);
assert.equal(large.minX,0); assert.equal(large.maxX,2);
assert.equal(large.minY,2); assert.equal(large.maxY,4);
console.log('REA-107 paired STAT regression checks passed');
