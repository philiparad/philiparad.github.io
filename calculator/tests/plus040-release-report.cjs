#!/usr/bin/env node
/* PLUS-040: release outcome parser and final gate unit contract.
 * No GitHub Actions run, browser pass, or physical-device evidence implied.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {build}=require('../tools/plus040-release-report.cjs');
const workflow=fs.readFileSync(path.resolve(__dirname,
  '../../.github/workflows/rea100-standalone-sync.yml'),'utf8');
const ids=[...workflow.matchAll(/id: (plus038_check_\d{2})/g)].map(m=>m[1]);
A.equal(ids.length,30,'expected 30 independent release checks');
A.equal(new Set(ids).size,ids.length,'duplicate check IDs');
const tsv=ids.map((id,i)=>[id,'success','Check '+(i+1)].join('\t')).join('\n');
const green=build(tsv,{commit:'abc',run_id:'123'});
A.equal(green.status,'PASS_WEB_AND_SOURCE_ONLY');
A.equal(green.passed,30);
A.equal(green.failed,0);
A.equal(green.checks.length,30);
A.match(green.sha256,/^[a-f0-9]{64}$/);
const red=build(tsv.replace('plus038_check_14\tsuccess',
 'plus038_check_14\tfailure'));
A.equal(red.status,'FAIL');
A.equal(red.failed,1);
A.equal(red.passed,29);
const skipped=build(tsv.replace('plus038_check_14\tsuccess',
 'plus038_check_14\tskipped'));
A.equal(skipped.failed,1);
A.equal(skipped.status,'FAIL');
A.throws(()=>build('plus038_check_01\tsuccess\tX\nplus038_check_01\tfailure\tX'),
 /Duplicate check/);
A.throws(()=>build('plus038_check_01\tunexpected\tX'),
 /Invalid check outcome/);
const lines=[...workflow.matchAll(/printf '%s\\t%s\\t%s\\n' '(plus038_check_\d{2})' '\$\{\{ steps\.(plus038_check_\d{2})\.outcome \}\}'/g)];
A.equal(lines.length,30,'incomplete Actions reporter input');
for(let i=0;i<ids.length;i++){
 A.equal(lines[i][1],ids[i],'wrong input row ID');
 A.equal(lines[i][2],ids[i],'wrong step expression');
}
A.ok(workflow.includes('node calculator/tools/plus040-release-report.cjs --input'));
A.ok(workflow.includes('name: plus040-release-outcome-report'));
A.ok(workflow.includes('PLUS-038 final release quality gate'));
console.log('PLUS-040 PASS: 30 explicit outcomes, green/red/skipped gates, malformed input rejection and artifact wiring');
