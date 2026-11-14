#!/usr/bin/env node
/* PLUS-044: protect reference-browser precision from tolerance scaling.
 * Source and oracle checks only; no Chromium or hardware claims.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const C=require('../js/scientific-constants.js');
const V=require('../js/metric-conversions.js');
const p=fs.readFileSync(path.join(__dirname,'plus035-constants-stat-table-browser.py'),'utf8');
A.ok(p.includes('import math'), 'finite number validation is required');
A.ok(p.includes('math.isfinite(actual)'), 'NaN and Infinity must fail');
A.ok(p.includes('case.get("abs_tolerance",1e-10)'),
 'numeric reference tests must use absolute tolerance');
A.ok(!p.includes('case.get("tolerance",1e-10)*max('),
 'relative tolerance makes exact physical constants too permissive');
const speedCase=p.match(/"id":"constant-speed-light",([\s\S]*?)\},/);
A.ok(speedCase,'missing speed of light case');
A.ok(speedCase[1].includes('"number":299792458,"abs_tolerance":1e-9'),
 'speed-of-light reference must have strict absolute accuracy');
const gravCase=p.match(/"id":"constant-gravity",([\s\S]*?)\},/);
A.ok(gravCase,'missing gravity case');
A.ok(gravCase[1].includes('"abs_tolerance":1e-12'),
 'standard-gravity reference must have strict absolute accuracy');
const speed=C.select('fx-991es-plus','28').value;
A.equal(speed,299792458,'manufacturer constant value changed');
const offset=0.02;
const oldTolerance=1e-10*Math.max(1,Math.abs(speed));
A.ok(offset<oldTolerance,'reproduce old false-positive threshold');
A.ok(offset>1e-9,'new tolerance must reject wrong significant value');
const cmToIn=V.convert(5,V.select('fx-991es-plus','02'));
A.ok(Math.abs(cmToIn-1.968503937)<=1e-9,
 'documented 5 cm conversion oracle');
A.equal(C.select('fx-991es-plus','35').value,9.80665);
console.log('PLUS-044 PASS: strict absolute reference bounds, non-finite rejection and official constants');
