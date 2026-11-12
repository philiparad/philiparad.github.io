#!/usr/bin/env node
/* PLUS-013 — 30-row TABLE boundaries, undefined cells, navigation. */
'use strict';
const A=require('node:assert/strict'),T=require('../js/table-engine.js');
const checks=[[0,.3,.1,4],[0,2.9,.1,30],[0,2.99999999999,.1,30],[-1,1,.5,5],[0,.2,.5,1]];
for(const [a,b,step,want] of checks)A.equal(T.countRows(a,b,step,30),want);
A.throws(()=>T.countRows(0,3,.1,30),/Insufficient MEM/);
A.throws(()=>T.countRows(0,30,1,30),/Insufficient MEM/);
for(const values of [[1,1,1],[1,0,1],[0,1,0],[0,1,-1]])A.throws(()=>T.countRows(...values,30),/Argument ERROR/);
const t=T.generate({model:'fx-991es-plus',start:0,end:2,step:1,f:x=>1/(x-1)});
A.equal(t.rows.length,3);
A.equal(t.rows[1].f,null);
A.equal(T.format(t.rows[1].f),'ERROR');
A.equal(T.detail(t),'X = 0');
T.navigate(t,1,1);
A.equal(t.row,1);A.equal(t.col,1);A.equal(T.detail(t),'F(X) = ERROR');
T.navigate(t,999,999);A.equal(t.row,2);A.equal(t.col,1);
T.navigate(t,-999,-999);A.equal(t.row,0);A.equal(t.col,0);
const single=T.generate({model:'fx-991es-plus',start:0,end:.2,step:.5,f:x=>x*x});
A.equal(single.rows.length,1);
const fractional=T.generate({model:'fx-991es-plus',start:-1,end:1,step:.5,f:x=>x*x});
A.equal(fractional.rows.length,5);A.deepEqual(fractional.rows.map(r=>r.f),[1,.25,0,.25,1]);
const near=T.generate({model:'fx-991es-plus',start:0,end:2.99999999999,step:.1,f:x=>x});
A.equal(near.rows.length,30);A.ok(near.rows[29].x<near.end);
console.log('PLUS-013 PASS: fractional row bounds, one-row case, invalid cells and navigation');
