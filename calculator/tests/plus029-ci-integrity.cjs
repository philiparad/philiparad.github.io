#!/usr/bin/env node
/* PLUS-029: release-workflow completeness and source-only evidence guard.
 * Ensures all calculator test/tool/reference edits trigger CI and that
 * claimed verifications are represented by actual execution commands.
 */
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'../..');
const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/rea100-standalone-sync.yml'),'utf8');
const sections=workflow.split(/\n  pull_request:\n/);
assert.equal(sections.length,2,'workflow must have push and PR event sections');
const [push,rest]=sections;
const pull=rest.split(/\n  workflow_dispatch:\n/)[0];
for(const [name,block] of [['push',push],['pull_request',pull]]){
 for(const filter of ['calculator/js/**','calculator/tests/**','calculator/tools/**',
                       'calculator/reference/**','calculator/fx991_fresh_standalone.html',
                       '.github/workflows/rea100-standalone-sync.yml']){
   assert.ok(block.includes("'"+filter+"'"),name+' does not watch '+filter);
 }
}
const required=[
 'calculator/tests/plus025-keyboard-focus.cjs',
 'calculator/tests/plus026-full-key-matrix.cjs',
 'calculator/tests/plus028-casio-manual-examples.cjs',
 'calculator/tests/plus025-keyboard-browser.py',
 'calculator/tests/plus026-matrix-browser.py',
 'calculator/tests/plus028-reference-browser.py',
 'calculator/tests/test_plus028_hardware_evidence.py',
 'calculator/tools/plus028_compare_hardware.py',
 'calculator/tools/plus028_reference_report.py'
];
for(const name of required){
 const actual=path.join(ROOT,name);
 assert.ok(fs.existsSync(actual),'missing file '+name);
 const invocation=workflow.split(name).length-1;
 assert.ok(invocation>=2,name+' is missing workflow execution or compile/test references');
}
for(const name of [
 'calculator/tools/build_standalone.py --check',
 'calculator/tests/rea100_browser_parity.py',
 'calculator/tests/plus028-reference-browser.py',
 'calculator/tests/plus028-casio-manual-examples.cjs',
 'calculator/tests/plus026-full-key-matrix.cjs',
 'calculator/tools/plus028_reference_report.py'
])assert.ok(workflow.includes(name),'required release check missing: '+name);
assert.ok(workflow.includes('actions/upload-artifact@v4'),
 'reference evidence artifacts are not uploaded');
assert.ok(workflow.includes('BLOCKED_NO_DEVICE_EVIDENCE'),
 'hardware-unverified state must be tested rather than claimed');
const commands=[...workflow.matchAll(/\bnode (calculator\/tests\/[a-zA-Z0-9_.-]+\.cjs)/g)]
 .map(match=>match[1]);
assert.equal(commands.length,new Set(commands).size,'duplicate node test commands');
for(const cmd of commands)assert.ok(fs.existsSync(path.join(ROOT,cmd)),
 'CI node target does not exist: '+cmd);
const pyPaths=[...workflow.matchAll(/(?:python -m py_compile |python -m unittest[^\n]*|run: python |\s+python )(calculator\/[a-zA-Z0-9_./-]+\.py)/g)]
 .map(match=>match[1]);
for(const file of pyPaths)assert.ok(fs.existsSync(path.join(ROOT,file)),
 'CI python target does not exist: '+file);
// PLUS-038: independent checks must report their actual outcomes. A
// continue-on-error step cannot silently turn a failed release green.
const gated=[...workflow.matchAll(/^      - name: ([^\n]+)\n        id: (plus038_check_\d+)\n        continue-on-error: true\n        run: /gm)];
assert.ok(gated.length>=25,'too few independently gated checks');
const ids=gated.map(entry=>entry[2]);
assert.equal(ids.length,new Set(ids).size,'duplicate verification step ids');
const gate=workflow.indexOf('      - name: PLUS-038 final release quality gate');
assert.ok(gate>workflow.lastIndexOf('id: '+ids[ids.length-1]),
 'final gate must follow all verification steps');
const body=workflow.slice(gate);
assert.ok(body.includes('if: always()'),'final gate must run after failed tests');
assert.ok(body.includes('exit 1'),'final gate must fail the release');
for(const id of ids)
 assert.ok(body.includes('steps.'+id+'.outcome'),'final gate omits '+id);
console.log('PLUS-029 PASS: push/PR scopes, '+required.length+
 ' critical release files, '+commands.length+' unique node commands, reference artifacts and explicit hardware limitation');
