#!/usr/bin/env node
/* PLUS-017: simulator-only decimal precision and display contracts. */
'use strict';
const assert=require('node:assert/strict');
const D=require('../js/decimal-core.js');
const F=require('../js/number-format.js');
assert.equal(D.PRECISION,15);
let checks=0;
function calc(expr,want){assert.equal(D.evaluate(expr),want,expr);checks++}
function fmt(n,settings,want){assert.equal(F.format(n,settings),want,JSON.stringify({n,settings}));checks++}
calc('0.1+0.2',0.3);
calc('1/4',0.25);
calc('100000000000000+1',100000000000001);
calc('9.99999999999999+0.00000000000001',10);
calc('1e-99/10',0);
fmt(9.9999999995,{format:'Norm2'},'10');
fmt(99.999999995,{format:'Norm2'},'100');
fmt(-9.9999999995,{format:'Norm1'},'-10');
fmt(0.009999999999,{format:'Norm1'},'9.999999999×10^-3');
fmt(1e-9,{format:'Norm2'},'0.000000001');
fmt(1e-9,{format:'Norm1'},'1×10^-9');
fmt(1e-10,{format:'Norm2'},'1×10^-10');
fmt(1.005,{format:'Fix',digits:2},'1.01');
fmt(2.675,{format:'Fix',digits:2},'2.68');
fmt(12.5,{format:'Fix',digits:2,decimalSeparator:'comma'},'12,50');
fmt(1234.5678,{format:'Sci',digits:4},'1.235×10^3');
fmt(0,{format:'Fix',digits:3},'0.000');
fmt(0,{format:'Sci',digits:3},'0.00×10^0');
fmt(9999999999,{format:'Norm2'},'9999999999');
fmt(99999999999,{format:'Norm2'},'1×10^11');
assert.throws(()=>D.evaluate('1/0'),/Math ERROR/);checks++;
assert.throws(()=>D.evaluate('1e99*10'),/Math ERROR/);checks++;
console.log('PLUS-017 PASS: '+checks+' decimal, Norm/Fix/Sci, overflow and underflow unit contracts');
