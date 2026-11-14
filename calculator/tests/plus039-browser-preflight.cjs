#!/usr/bin/env node
/* PLUS-039: browser regression preflight. No Chromium or device evidence
 * required. Verify scenario inventory, physical-key IDs, CI registration
 * and artifact collection before expensive browser checks begin.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const A=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');
const K=require('../js/keypad.js');
const valid=new Set(K.keys.map(x=>x.id));
const workflow=read('.github/workflows/rea100-standalone-sync.yml');
const suites=[
 ['plus028-reference-browser.py','PLUS028_WEB_CAPTURE_DIR','plus028-web-captures'],
 ['plus033-key-functions-browser.py','PLUS033_CAPTURE_DIR','plus033-browser-captures'],
 ['plus034-memory-dms-setup-browser.py','PLUS034_CAPTURE_DIR','plus034-browser-captures'],
 ['plus035-constants-stat-table-browser.py','PLUS035_CAPTURE_DIR','plus035-browser-captures'],
 ['plus036-matrix-vector-eqn-browser.py','PLUS036_CAPTURE_DIR','plus036-browser-captures'],
 ['plus037-numeric-browser.py','PLUS037_CAPTURE_DIR','plus037-browser-captures'],
 ['plus047-solve-calc-browser.py','PLUS047_CAPTURE_DIR','plus047-browser-captures']
];
let sequences=0,presses=0;
for(const [file,env,folder] of suites){
 const relative='calculator/tests/'+file;
 const src=read(relative);
 A.ok(src.includes('async def main('),file+' missing browser entrypoint');
 A.ok(src.includes('async_playwright'),file+' missing Playwright');
 A.ok(src.includes('hardware')||src.includes('physical'),file+' missing evidence scope');
 A.ok(src.includes(env),file+' missing artifact environment');
 A.ok(src.includes(folder),file+' missing artifact path');
 A.ok(workflow.includes('run: python '+relative),file+' is not executed in CI');
 A.ok(workflow.includes(relative),file+' missing from CI compile list');
 A.ok(workflow.includes('path: /tmp/'+folder+'/'),file+' artifacts are not uploaded');
 const cases=[...src.matchAll(/"keys"\s*:\s*\(([^)]*)\)/gs)];
 if(file==='plus037-numeric-browser.py')
  cases.push(...src.matchAll(/^(?:SOLVE|CALC)\s*=\s*\(([^)]*)\)/gm));
 A.ok(cases.length>0,file+' missing keypad scenarios');
 for(const match of cases){
  const physical=[...match[1].matchAll(/["']([A-Z0-9]+)["']/g)].map(x=>x[1]);
  A.ok(physical.length>0,file+' empty key sequence');
  for(const key of physical)A.ok(valid.has(key),file+' unknown key id '+key);
  sequences++;presses+=physical.length;
 }
 A.ok(src.includes('getState()'),file+' missing calculator state read');
 A.ok(src.includes('#keys button[data-key='),file+' not using physical DOM keys');
}
A.equal(suites.length,7);
A.ok(sequences>=42,'unexpectedly few covered sequences');
A.ok(presses>=340,'unexpectedly low key coverage');
A.ok(workflow.includes('PLUS-038 final release quality gate'),
 'browser checks missing consolidated release gate');
A.ok(workflow.includes('if: always()'),'expected persistent CI artifacts');
console.log('PLUS-039 PASS: '+suites.length+' browser suites, '+
 sequences+' scenario input sequences, '+presses+
 ' valid physical keypresses, CI execution and artifact registrations');
