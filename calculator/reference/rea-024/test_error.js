/* REA-024 error classification and recovery-position regression. */
'use strict';
const assert=require('node:assert/strict');
const E=require('../../js/error-handling.js');
const R=require('../../js/rational.js');
require('../../js/decimal-core.js');
const M=require('../../js/math-engine.js');
let count=0;
for(const [message,mode,expected] of [
 ['Math ERROR','COMP','Math ERROR'],
 ['Stack ERROR','COMP','Stack ERROR'],
 ['Maximum call stack size exceeded','COMP','Stack ERROR'],
 ['Syntax ERROR: bad token','COMP','Syntax ERROR'],
 ['Argument ERROR','COMP','Argument ERROR'],
 ['Dimension ERROR','MATRIX','Dimension ERROR'],
 ['Variable ERROR: X','SOLVE','Variable ERROR'],
 ['Variable ERROR: X','COMP','Syntax ERROR'],
 ['Cannot Solve','SOLVE',"Can't Solve"],
 ["Can't Solve Error",'SOLVE',"Can't Solve"],
 ['Insufficient MEM Error','TABLE','Insufficient MEM'],
 ['Time Out Error','COMP','Time Out'],
 ['Input limit','COMP','Math ERROR']
]){
 assert.equal(E.classify(message,mode),expected,message);count++;
}
for(const [source,message,position] of [
 ['14/0*2','Math ERROR',3],
 ['2+','Syntax ERROR',2],
 ['(2+3','Syntax ERROR',0],
 ['sqrt(-1)','Math ERROR',0],
 ['2..3','Syntax ERROR',2],
 ['3+)','Syntax ERROR',2]
]){
 assert.equal(E.location(source,message),position,source);count++;
}
assert.doesNotThrow(()=>E.checkStack('('.repeat(40)+'1'+')'.repeat(40)));count++;
assert.throws(()=>E.checkStack('('.repeat(41)+'1'+')'.repeat(41)),/Stack ERROR/);count++;
assert.throws(()=>R.evaluate('14/0*2'),/Math ERROR/);count++;
assert.throws(()=>M.evaluate('2+'),/Syntax ERROR/);count++;
assert.throws(()=>M.evaluate('sqrt(-1)'),/Math ERROR/);count++;
assert.throws(()=>M.evaluate('RanInt(4,1)'),/Argument ERROR/);count++;
assert.deepEqual(E.LABELS,[
 'Math ERROR','Stack ERROR','Syntax ERROR','Argument ERROR','Dimension ERROR',
 'Variable ERROR',"Can't Solve",'Insufficient MEM','Time Out'
]);count++;
console.log('REA-024: '+count+' error and recovery-position assertions passed');
