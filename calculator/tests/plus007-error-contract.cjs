#!/usr/bin/env node
/* PLUS-007: official fx-991ES PLUS error classes and locator semantics. */
'use strict';
const assert=require('node:assert/strict');
const E=require('../js/error-handling.js');
const Solve=require('../js/solve-session.js');
let tests=0;
for(const [message,context,label] of [
 ['division by zero','COMP','Math ERROR'],
 ['Math ERROR','COMP','Math ERROR'],
 ['Stack ERROR','COMP','Stack ERROR'],
 ['maximum call stack','COMP','Stack ERROR'],
 ['Syntax ERROR','COMP','Syntax ERROR'],
 ['Argument ERROR','COMP','Argument ERROR'],
 ['Variable ERROR','SOLVE','Variable ERROR'],
 ['Variable ERROR: X','SOLVE','Variable ERROR'],
 ['Variable ERROR: X','COMP','Syntax ERROR'],
 ["Can't Solve",'SOLVE',"Can't Solve"],
 ['Insufficient MEM','TABLE','Insufficient MEM'],
 ['Time Out','COMP','Time Out'],
 ['Dimension ERROR','MATRIX','Dimension ERROR']
]){
 assert.equal(E.classify(message,context),label,message);
 tests++;
}
for(const [input,problem,at] of [
 ['14/0*2','Math ERROR',3],
 ['1..2','Syntax ERROR',2],
 ['1+','Syntax ERROR',2],
 ['2+3','Variable ERROR',3],
 ['sin(30)','Variable ERROR',7],
 ['X+2','Variable ERROR',0]
]){
 assert.equal(E.location(input,problem),at,input);
 tests++;
}
assert.throws(()=>E.checkStack('('.repeat(25)),/Stack ERROR/);tests++;
assert.throws(()=>E.checkStack('1)2'),/Syntax ERROR/);tests++;
assert.equal(E.checkStack('1+(2*3)').commandDepth,0);tests++;
const scan=(source,registers)=>registers.filter(name=>source.includes(name));
assert.throws(()=>Solve.prepare('2+3',['X'],{},scan),/Variable ERROR/);tests++;
assert.equal(Solve.prepare('X-2',['X'],{X:0},scan).fields[0].id,'guess');tests++;
console.log('PLUS-007 PASS: '+tests+' error classification, SOLVE and caret checks');
