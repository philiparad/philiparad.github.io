#!/usr/bin/env node
/* PLUS-041: guard against two previously undetected browser regression faults.
 * These are source-level tests, not Chromium or hardware verification.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const E=require('../js/structured-editor.js');
const MATRIX=require('../js/matrix-registers.js');
const root=path.resolve(__dirname);
const sqrtBrowser=fs.readFileSync(path.join(root,'plus033-key-functions-browser.py'),'utf8');
const matrixBrowser=fs.readFileSync(path.join(root,'plus036-matrix-vector-eqn-browser.py'),'utf8');
const sqrt=sqrtBrowser.match(/"id": "sqrt81", "keys": \(([^)]*)\)/);
A.ok(sqrt,'sqrt browser test absent');
A.ok(sqrt[1].includes('"RIGHT"'),'natural square root must exit its field with RIGHT');
A.ok(!sqrt[1].includes('"RP"'),'natural square root must not insert extra closing )');
// PLUS-042: empty substring assertions always pass and cannot prove AC cleared
// a failed calculation. Require exact input equality and an empty error field.
const clearCase=sqrtBrowser.match(/"id": "error-clear",([\s\S]*?)\},/);
A.ok(clearCase,'AC error-recovery case missing');
A.ok(clearCase[1].includes('"input_equals": ""'),
 'AC must require an exact empty input');
A.ok(clearCase[1].includes('"error": ""'),
 'AC must require a cleared error');
A.ok(sqrtBrowser.includes('s["input"] == case["input_equals"]'),
 'browser must compare exact input rather than substring');
A.ok(!clearCase[1].includes('"contains": ""'),
 'vacuous empty substring must not return');
const rootEditor=E.create();
E.template(rootEditor,'squareRoot');
E.insert(rootEditor,'8');E.insert(rootEditor,'1');
A.equal(E.serialize(rootEditor,true),'sqrt(81)');
E.navigate(rootEditor,'RIGHT');
A.equal(E.serialize(rootEditor,true),'sqrt(81)');
A.equal(E.cursor(rootEditor).path.length,0,'cursor must leave radical');
const mismatched=E.create();
E.template(mismatched,'squareRoot');
E.insert(mismatched,'8');E.insert(mismatched,'1');E.insert(mismatched,')');
A.equal(E.serialize(mismatched,true),'sqrt(81))',
 'old sequence contained an unmatched extra parenthesis');
const transposeCase=matrixBrowser.match(/"id":"matrix-transpose",([\s\S]*?)\},\s*\{"id":"vector-add"/);
A.ok(transposeCase,'transpose browser case missing');
A.ok(transposeCase[1].includes('"matrix":[[2,1],[3,4]]'),
 'transpose expected matrix must remain non-symmetric');
A.ok(transposeCase[1].includes('"2","EQUAL","3","EQUAL","1","EQUAL","4","EQUAL"'),
 'input matrix must match the expected transpose');
const source={rows:2,cols:2,data:[[2,3],[1,4]]};
const transformed=MATRIX.transpose(source);
A.deepEqual(transformed.data,[[2,1],[3,4]]);
A.notDeepEqual(transformed.data,source.data,
 'the source matrix must be non-symmetric to detect a no-op transpose');
console.log('PLUS-041 PASS: natural square-root keylog and non-symmetric MATRIX transpose regression guards');
