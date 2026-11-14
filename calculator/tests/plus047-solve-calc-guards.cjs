#!/usr/bin/env node
/* PLUS-047: independent CALC/SOLVE numerical oracle and browser invariant guard.
 * Source-engine regression checks only, NOT a completed Chromium/device run.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const M=require('../js/math-engine.js');
const SOLVE=require('../js/solve-session.js');
const CALC=require('../js/calc-substitution.js');
const browser=fs.readFileSync(path.join(__dirname,
 'plus047-solve-calc-browser.py'),'utf8');
const workflow=fs.readFileSync(path.join(__dirname,
 '../../.github/workflows/rea100-standalone-sync.yml'),'utf8');
const registrations=['CALC','SOLVE','cancel-ac','cancel-mode'];
for(const word of registrations)
 A.ok(browser.includes(word),'missing CALC/SOLVE scenario '+word);
for(const check of [
 'session["residual"]','session["source"]=="X-2"',
 'session["value"]-2','final["memory"]["X"]',
 'final["ans"]==original_ans',
 'session["statementResults"]','results[0]["value"]',
 'window.__plus047Workers[0].terminated',
 'w.onmessage({','late["memory"]["X"]==original_x',
 'late["solveSession"] is None','final["flow"] is None'
])A.ok(browser.includes(check),'missing numerical invariant '+check);
A.ok(browser.includes('math.isfinite(actual)'),
 'numeric assertions must reject nonfinite values');
A.ok(workflow.includes('run: python calculator/tests/plus047-solve-calc-browser.py'),
 'browser suite absent from release CI');
A.ok(workflow.includes('path: /tmp/plus047-browser-captures/'),
 'failure artifacts must be uploaded');
A.ok(workflow.includes('steps.plus038_check_29.outcome'),
 'new browser suite is absent from final release gate');
const registers=['A','B','C','D','E','F','M','X','Y'];
const solve=SOLVE.prepare('X-2',registers,{X:0},CALC.scan);
A.deepEqual(solve.names,[]);
A.equal(solve.fields.length,1);
A.equal(solve.fields[0].id,'guess');
const params=SOLVE.resolve(solve,{guess:'0'},M,{memory:{X:0}});
const f=x=>M.evaluate(params.expression,{memory:{...params.memory,X:x}});
const root=SOLVE.iterate(f,M,params.guess);
A.equal(root.status,'solved');
A.ok(Math.abs(root.value-2)<1e-9,'wrong independent numerical root');
A.ok(Math.abs(root.residual)<=1e-10,'SOLVE residual out of bound');
const output=SOLVE.result('X-2',root.value,root.residual,String);
A.equal(output.kind,'solve');
A.equal(output.lines.length,3);
A.ok(output.lines[2].startsWith('L-R= '));
const session=CALC.prepare('X+3',registers,'COMP',{X:0});
A.deepEqual(session.names,['X']);
const calc=CALC.evaluate(session,{X:'4'},{
  memory:{X:0},math:M,angle:'DEG',model:'fx-991es-plus',
  ans:0,preAns:0
});
A.equal(calc.kind,'calc-substitution');
A.equal(calc.value,7);
A.equal(calc.changes.X,4);
A.equal(calc.statementResults.length,1);
A.equal(calc.statementResults[0].value,7);
console.log('PLUS-047 PASS: numerical root/residual, CALC atomic substitution, cancellation guards and 29th CI gate');
