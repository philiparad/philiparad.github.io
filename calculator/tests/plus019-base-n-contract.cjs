#!/usr/bin/env node
/* PLUS-019: fx-991ES PLUS (2nd edition) BASE-N manufacturer-example
 * and signed-integer contracts. Hardware captures/keylogs are not asserted.
 * Reference: https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/base-n_calculations.html
 */
'use strict';
const A=require('node:assert/strict');
const B=require('../js/base-n.js');
let checked=0;
function value(base,expression,expected){
 A.equal(B.evaluate(expression,base),BigInt(expected),base+' '+expression);
 checked++;
}
function output(base,value,expected){
 A.equal(B.format(BigInt(value),base),expected,base+' '+value);
 checked++;
}
function failure(base,expression,pattern){
 A.throws(()=>B.evaluate(expression,base),pattern,base+' '+expression);
 checked++;
}
A.equal(B.bits('BIN'),16);checked++;
for(const b of ['DEC','HEX','OCT']){A.equal(B.bits(b),32);checked++;}
value('BIN','11+1',4);
output('BIN',4,'0000000000000100');
value('HEX','1F+1',32);
output('HEX',32,'00000020');
value('OCT','7+1',8);
output('OCT',8,'00000000010');
value('DEC','-2147483648',-2147483648);
value('DEC','2147483647',2147483647);
failure('DEC','2147483648',/Math ERROR/);
failure('DEC','-2147483649',/Math ERROR/);
value('BIN','0111111111111111',32767);
value('BIN','1000000000000000',-32768);
value('BIN','1111111111111111',-1);
output('BIN',-1,'1111111111111111');
output('BIN',-32768,'1000000000000000');
failure('BIN','10000000000000000',/Math ERROR/);
failure('BIN','2',/Syntax ERROR/);
value('HEX','7FFFFFFF',2147483647);
value('HEX','80000000',-2147483648);
value('HEX','FFFFFFFF',-1);
output('HEX',-1,'FFFFFFFF');
failure('HEX','100000000',/Math ERROR/);
value('OCT','17777777777',2147483647);
value('OCT','20000000000',-2147483648);
value('OCT','37777777777',-1);
output('OCT',-1,'37777777777');
failure('OCT','40000000000',/Math ERROR/);
value('DEC','h:FF+d:1',256);
value('HEX','d:10+h:A',20);
value('DEC','b:1010+o:7',17);
value('DEC','8/3',2);
value('DEC','-8/3',-2);
value('DEC','Not(0)',-1);
value('HEX','Neg(1)',-1);
value('HEX','F and 3',3);
value('HEX','F or 3',15);
value('HEX','F xor 3',12);
value('HEX','F xnor 3',-13);
failure('DEC','1/0',/Math ERROR/);
failure('HEX','1G',/Syntax ERROR/);
failure('DEC','1.5',/Syntax ERROR/);
A.equal(B.inputRadix('h:A','DEC'),'HEX');checked++;
A.equal(B.inputRadix('b:101','HEX'),'BIN');checked++;
A.equal(B.inputRadix('o:7','DEC'),'OCT');checked++;
A.equal(B.inputRadix('d:10','HEX'),'DEC');checked++;
A.equal(B.inputRadix('1+2','DEC'),'DEC');checked++;
A.throws(()=>B.format(32768n,'BIN'),/Math ERROR/);checked++;
A.throws(()=>B.convert(-32769n,'BIN'),/Math ERROR/);checked++;
A.throws(()=>B.bits('BIN','unsupported-model'),/Argument ERROR/);checked++;
console.log('PLUS-019 PASS: '+checked+' BASE-N documented examples, signed widths, bitwise operators and rejection contracts (unit-only)');
