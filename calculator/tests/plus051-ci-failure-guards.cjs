#!/usr/bin/env node
/* PLUS-051: regression guard for failures observed in GitHub Actions run
 * 43566624952. Source-level contract, not a completed browser test.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=n=>fs.readFileSync(path.join(__dirname,n),'utf8');
const app=read('../js/app.js');
const standalone=read('../fx991_fresh_standalone.html');
const numberFormat=read('../js/number-format.js');
const stat=read('plus035-constants-stat-table-browser.py');
const numeric=read('plus037-numeric-browser.py');
const solver=read('plus047-solve-calc-browser.py');
const interruptions=read('plus050-power-numeric-browser.py');
A.ok(stat.includes('output_lines=s["outputLines"]'),
 'STAT output must not shadow pathlib output directory');
A.ok(stat.includes('output / filename')===false || !stat.includes('output=s["outputLines"]'),
 'old output/list shadow reintroduced');
A.ok(numeric.includes('s["flow"]["fieldId"]=="X"'),
 'CALC must inspect the public getState() fieldId');
A.ok(solver.includes('prompted["flow"]["fieldId"]=="X"'));
A.ok(solver.includes('prompted["flow"]["fieldId"]=="guess"'));
A.ok(!numeric.includes('s["flow"]["fields"]'),
 'public flow snapshot has no fields collection');
A.ok(!solver.includes('prompted["flow"]["fields"]'),
 'public flow snapshot exposes only fieldId and fieldCount');
A.ok(app.includes("state.editor=STRUCT.create();state.input='';state.cursor=0;"),
 'AC must clear stale calculator expression');
const begin=app.indexOf("if(state.screen==='calculating'){");
const end=app.indexOf("if(state.vectorCopySource)",begin);
A.ok(begin>0&&end>begin);
const cancel=app.slice(begin,end);
A.ok(cancel.includes("cancelNumeric()")&&cancel.includes("state.editor=STRUCT.create()"),
 'AC cancellation must discard abandoned structured template');
A.ok(interruptions.includes('"sum-to-integral"'));
A.ok(interruptions.includes('"integral-to-sum"'));
for(const [file,source] of [
 ['js/app.js',app],['js/number-format.js',numberFormat]]){
 const begin='<script data-source="'+file+'">\n';
 const i=standalone.indexOf(begin),j=standalone.indexOf('\n</script>',i+begin.length);
 A.ok(i>=0&&j>=0);
 A.equal(standalone.slice(i+begin.length,j),source.replace(/\n+$/,''),
  'stale standalone module '+file);
}
console.log('PLUS-051 PASS: 5 Actions failure contracts and number-format sync, public flow projection, AC clearing and standalone app parity');
