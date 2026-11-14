#!/usr/bin/env node
/* PLUS-046: distinct numerical STAT commands must have distinct output
 * contracts. Source-level verification; not a browser/hardware certification.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const REG=require('../js/stat-regression.js');
const test=fs.readFileSync(path.join(__dirname,
 'plus035-constants-stat-table-browser.py'),'utf8');
const mean=test.match(/"id":"stat-mean",([\s\S]*?)\},/);
const menu=test.match(/"id":"stat-variance-menu",([\s\S]*?)\},/);
A.ok(mean&&menu,'STAT test cases are required');
A.ok(mean[1].includes('"CALC"'),'summary case must use CALC');
A.ok(menu[1].includes('"SHIFT","1","5","2"'),
 'variance selection must use SHIFT 1 5 2');
A.ok(mean[1].includes('"output_contains":("n = 3","Mean X = 2","Sigma X = ")'),
 'summary output must identify n, mean and standard deviation');
A.ok(menu[1].includes('"output_equals":("Mean X = 2",)'),
 'variance-menu result must be one exact line');
A.ok(test.includes('s["outputLines"]==list(case["output_equals"])'),
 'menu selection must compare complete output');
A.ok(test.includes('for expected in case["output_contains"]'),
 'summary must validate every expected line');
const stats={n:3,meanX:2,sdX:Math.sqrt(2/3),sampleSDX:1};
const lines=REG.varLines(stats,false);
A.equal(lines.length,4);
A.equal(lines[0],'n = 3');
A.equal(lines[1],'Mean X = 2');
A.ok(lines[2].startsWith('Sigma X = '));
A.notDeepEqual(lines,['Mean X = 2'],
 'summary and menu selections must remain distinguishable');
console.log('PLUS-046 PASS: distinct STAT CALC summary and exact variance menu display oracles');
