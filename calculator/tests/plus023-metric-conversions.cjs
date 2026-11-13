#!/usr/bin/env node
/* PLUS-023: 40 fx-991ES PLUS (2nd edition) conversion codes.
 * Official examples: 5 cm->in, 100 g->oz, -31 C->F.
 * https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/function_calculations/metric_conversion.html
 * Unit-level validation; physical keypad and LCD parity remain open.
 */
'use strict';
const A=require('node:assert/strict');
const C=require('../js/metric-conversions.js');
const M=require('../js/math-engine.js');
const model='fx-991es-plus';
let checks=0;
const forward=[
 ['in','cm'],['ft','m'],['yd','m'],['mile','km'],['n mile','m'],
 ['acre','m²'],['gal (US)','L'],['gal (UK)','L'],['pc','km'],
 ['km/h','m/s'],['oz','g'],['lb','kg'],['atm','Pa'],['mmHg','Pa'],
 ['hp','kW'],['kgf/cm²','Pa'],['kgf·m','J'],['lbf/in²','kPa'],
 ['°F','°C'],['J','cal']
];
A.equal(C.ITEMS.length,40);checks++;
for(let index=0;index<20;index++){
 const code=String(index*2+1).padStart(2,'0');
 const reverseCode=String(index*2+2).padStart(2,'0');
 const first=C.select(model,code),second=C.select(model,reverseCode);
 A.equal(first.code,code);A.equal(second.code,reverseCode);
 A.equal(first.from,forward[index][0]);A.equal(first.to,forward[index][1]);
 A.equal(second.from,first.to);A.equal(second.to,first.from);
 A.equal(first.reverse,false);A.equal(second.reverse,true);
 A.ok(index===18||first.factor>0,'positive forward factor '+code);
 const probe=index===18?100:1.75;
 const converted=C.convert(probe,first);
 A.ok(Number.isFinite(converted),code+' conversion finite');
 const reverted=C.convert(converted,second);
 A.ok(Math.abs(reverted-probe)<=1e-10*Math.max(1,Math.abs(probe)),
   code+'/'+reverseCode+' round-trip');
 const edit=C.editor();
 A.equal(C.digit(edit,code[0],model),null);
 A.equal(C.digit(edit,code[1],model).code,code);
 checks+=12;
}
function near(actual,expected,eps,label){A.ok(Math.abs(actual-expected)<=eps,label+' '+actual+' vs '+expected);checks++;}
near(C.convert(5,C.select(model,'02')),1.968503937,6e-10,'CASIO 5 cm to inches');
near(C.convert(100,C.select(model,'22')),3.527396584,6e-10,'CASIO 100 g to oz');
near(C.convert(-31,C.select(model,'38')),-23.8,1e-10,'CASIO -31 C to F');
near(C.convert(32,C.select(model,'37')),0,1e-12,'freezing point');
near(C.convert(212,C.select(model,'37')),100,1e-12,'boiling point');
near(C.convert(100,C.select(model,'38')),212,1e-12,'C to F');
near(C.convert(1,C.select(model,'39')),1/4.1858,1e-13,'J to cal');
near(C.convert(1,C.select(model,'40')),4.1858,1e-13,'cal to J');
const decimalSettings={mode:'COMP',angle:'DEG',math:false,memory:{},ans:0};
for(const item of C.ITEMS){
 const entry=C.select(model,item.code);
 const expression=C.literal(entry,'5');
 const parsed=M.evaluate(expression,decimalSettings);
 const actual=C.convert(5,entry);
 A.ok(Math.abs(parsed-actual)<=1e-11*Math.max(1,Math.abs(actual)),
  item.code+' inserted expression computes same result');
 checks++;
}
A.deepEqual(C.suffix('2+(5+3)'),{prefix:'2+',operand:'(5+3)',suffix:''});checks++;
A.deepEqual(C.suffix('2+-31'),{prefix:'2+',operand:'-31',suffix:''});checks++;
A.equal(C.insert('2+5',C.select(model,'02')),'2+((5)/2.54)');checks++;
A.equal(C.suffix('1E-3').operand,'1E-3');checks++;
A.equal(C.suffix('2*Ans').operand,'Ans');checks++;
A.throws(()=>C.suffix(''),/Syntax ERROR/);checks++;
A.throws(()=>C.suffix('2+'),/Syntax ERROR/);checks++;
A.throws(()=>C.select(model,'00'),/Argument ERROR/);checks++;
A.throws(()=>C.select(model,'41'),/Argument ERROR/);checks++;
A.throws(()=>C.select('bad-model','02'),/Argument ERROR/);checks++;
A.throws(()=>C.convert(Infinity,C.select(model,'01')),/Math ERROR/);checks++;
const ed=C.editor();
A.equal(C.digit(ed,'2',model),null);
C.backspace(ed);A.equal(ed.buffer,'');checks+=2;
A.equal(C.digit(ed,'2',model),null);
A.equal(C.digit(ed,'2',model).code,'22');checks+=2;
A.throws(()=>C.digit(ed,'0',model),/Syntax ERROR/);checks++;
console.log('PLUS-023 PASS: '+checks+' code, round-trip, offset, calculator-example, suffix and expression checks (unit-only)');
