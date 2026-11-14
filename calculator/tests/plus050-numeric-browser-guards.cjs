#!/usr/bin/env node
/* PLUS-050: physical keypad scenario and CI contract.
 * Source-level validation only, not a Chromium or device result.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const K=require('../js/keypad.js');
const E=require('../js/structured-editor.js');
const browser=fs.readFileSync(path.join(__dirname,'plus050-power-numeric-browser.py'),'utf8');
const workflow=fs.readFileSync(path.join(__dirname,'../../.github/workflows/rea100-standalone-sync.yml'),'utf8');
const keys=new Set(K.keys.map(k=>k.id));
const sequences={};
for(const match of browser.matchAll(/^(SOLVE|SUM|INTEGRAL)=\(([^)]*)\)/gm)){
 const sequence=[...match[2].matchAll(/"([A-Z0-9]+)"/g)].map(m=>m[1]);
 A.ok(sequence.length>5,'empty physical sequence '+match[1]);
 for(const key of sequence)A.ok(keys.has(key),'unknown physical key '+key);
 sequences[match[1]]=sequence;
}
A.equal(Object.keys(sequences).length,3);
A.deepEqual(sequences.SOLVE,['ALPHA','LP','SUB','2','SHIFT','CALC','EQUAL']);
A.deepEqual(sequences.SUM,['SHIFT','LOGBASE','ALPHA','LP','RIGHT','1','RIGHT','3','RIGHT','EQUAL']);
A.deepEqual(sequences.INTEGRAL,['INTEGRAL','ALPHA','LP','RIGHT','0','RIGHT','1','RIGHT','EQUAL']);
const cases=[...browser.matchAll(/"id":"([^"]+)",\s*"keys":/g)].map(m=>m[1]);
A.equal(cases.length,6,'six required browser stress cases');
A.equal(new Set(cases).size,6);
for(const name of ['solve-on-restart','solve-off-on','solve-mode-restart',
 'solve-rapid-ac','sum-to-integral','integral-to-sum'])
 A.ok(cases.includes(name),'missing scenario '+name);
A.ok(browser.includes('"interrupt":("AC","SHIFT","AC","ON")'),
 'power OFF/ON must use physical SHIFT AC and ON');
A.ok(browser.includes('window.__plus050Workers[0].terminated'),
 'cancelled worker must be terminated');
A.ok(browser.includes('after_stale["screen"]=="calculating"'),
 'late callback must not finish the newer calculation');
A.ok(browser.includes('await late(page,0,987654321)'),
 'browser test must inject a late response');
A.ok(browser.includes('ImageChops.difference'),
 'browser must compare LCD pixels across builds');
for(const [type,expected] of [['summation','Sum(X,1,3)'],
                              ['integral','Integral(X,0,1)']]){
 const editor=E.create();E.template(editor,type);E.insert(editor,'X');
 E.navigate(editor,'RIGHT');E.insert(editor,type==='summation'?'1':'0');
 E.navigate(editor,'RIGHT');E.insert(editor,type==='summation'?'3':'1');
 E.navigate(editor,'RIGHT');
 A.equal(E.serialize(editor,true),expected,'structured input drift '+type);
}
A.ok(workflow.includes('run: python calculator/tests/plus050-power-numeric-browser.py'),
 'PLUS-050 browser suite must execute in CI');
A.ok(workflow.includes('id: plus038_check_30'));
A.ok(workflow.includes('steps.plus038_check_30.outcome'));
A.ok(workflow.includes('path: /tmp/plus050-browser-captures/'));
console.log('PLUS-050 PASS: 6 physical-key scenarios, SUM/integral editor paths, late worker and CI gate contracts');
