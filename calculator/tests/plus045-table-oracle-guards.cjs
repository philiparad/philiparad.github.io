#!/usr/bin/env node
/* PLUS-045: ensure TABLE regression tests cannot pass from correct F(X)
 * values on wrong X coordinates or from truncated zip() oracles.
 * Source-level simulation only, not a browser/hardware certification.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const TABLE=require('../js/table-engine.js');
const source=fs.readFileSync(path.join(__dirname,
 'plus035-constants-stat-table-browser.py'),'utf8');

A.ok(source.includes('"x_values":(-1,-.5,0,.5,1)'),
 'square TABLE needs full X oracle');
A.ok(source.includes('"x_values":(0,1,2)'),
 'linear TABLE needs full X oracle');
A.ok(source.includes('len(rows)==len(expected_x)==len(expected_f)==case["rows"]'),
 'row counts and oracle lengths must be checked before zip');
A.ok(source.includes('abs(actual_x-want_x)<=1e-12'),
 'every X coordinate must be checked');
A.ok(source.includes('abs(actual_f-want_f)<=1e-10'),
 'every TABLE result must be checked');
A.ok(source.includes('math.isfinite(actual_x)')&&
 source.includes('math.isfinite(actual_f)'),
 'invalid TABLE coordinates and values must fail');
A.ok(source.includes('s["memory"]["X"]-expected_x[-1]'),
 'TABLE must preserve expected final X register');
const examples=[
 {start:-1,end:1,step:.5,fn:x=>x*x,
  xs:[-1,-.5,0,.5,1],ys:[1,.25,0,.25,1]},
 {start:0,end:2,step:1,fn:x=>x,
  xs:[0,1,2],ys:[0,1,2]}
];
for(const item of examples){
 const table=TABLE.generate({model:'fx-991es-plus',count:1,start:item.start,
  end:item.end,step:item.step,f:item.fn});
 A.equal(table.rows.length,item.xs.length);
 A.deepEqual(table.rows.map(row=>row.x),item.xs);
 A.deepEqual(table.rows.map(row=>row.f),item.ys);
 const broken=table.rows.map(row=>({...row,x:0}));
 A.deepEqual(broken.map(row=>row.f),item.ys,
  'wrong-coordinate table illustrates old false positive');
 A.notDeepEqual(broken.map(row=>row.x),item.xs,
  'new independent X oracle must reject the wrong coordinates');
}
console.log('PLUS-045 PASS: complete TABLE X/F(X) oracles, finite checks, X register and false-positive mutation');
