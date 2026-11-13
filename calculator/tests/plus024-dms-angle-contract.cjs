#!/usr/bin/env node
/* PLUS-024: DMS and DRG angle regression corpus for the single PLUS model.
 * Simulator-only: no native physical LCD or keylog parity assertion.
 */
'use strict';
const A=require('node:assert/strict');
const S=require('../js/sexagesimal.js');
require('../js/number-format.js');
require('../js/decimal-core.js');
const M=require('../js/math-engine.js');
let checks=0;
function eq(actual,expected,label){A.equal(actual,expected,label);checks++}
function near(actual,expected,label,tol=1e-10){
 A.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),label+' '+actual+' != '+expected);
 checks++;
}
function reject(fn,pattern,label){A.throws(fn,pattern,label);checks++}
const state=angle=>({angle,mode:'COMP',math:false,memory:{},ans:0});
eq(S.parseComponents('2','30','0'),2.5,'ordinary DMS');
eq(S.parseComponents('0','0','1'),1/3600,'one second');
eq(S.parseComponents('9999999','59','59'),9999999+59/60+59/3600,'largest DMS');
for(const pair of [['2°30′0″','(2.5)'],['-2°30′0″','-(2.5)'],
 ['-0°30′0″','-(0.5)'],['2°30′0″+1','(2.5)+1'],
 ['3°4′5″','(3.06805555555556)']]){
 eq(S.normalize(pair[0]),pair[1],pair[0]+' normalized');
 eq(S.hasDMS(pair[0]),true,pair[0]+' recognized');
}
for(const [source,want] of [['2°60′0″',/Argument ERROR/],
 ['2°0′60″',/Argument ERROR/],['10000000°0′0″',/Argument ERROR/],
 ['2°30′',/Syntax ERROR/],['2°30',/Syntax ERROR/],
 ['2°30′0.1″XYZ',/Syntax ERROR/],['2°30′0″_abc',/Syntax ERROR/]]){
 reject(()=>S.normalize(source),want,source);
}
for(const [n,want] of [[0,'0°0′0″'],[1.5,'1°30′0″'],
 [-1.5,'-1°30′0″'],[-1/3600,'-0°0′1″'],
 [9999999+59/60+59/3600,'9999999°59′59″']])
 eq(S.format(n),want,'DMS display '+n);
eq(S.format(10000000),null,'out-of-range DMS display');
eq(S.nextSeparator('2'),'°','degree separator');
eq(S.nextSeparator('2°30'),'′','minute separator');
eq(S.nextSeparator('2°30′0'),'″','second separator');
eq(S.nextSeparator('2°30′0″'),null,'full DMS group');
eq(S.nextSeparator('2°30′0″+4'),'°','next arithmetic operand');
eq(S.nextSeparator(''),null,'empty operand');
for(const [expr,angle,want] of [
 ['sin(90°)','RAD',1],['sin((pi/2)r)','DEG',1],
 ['cos(100g)','DEG',0],['(pi/2)r','DEG',90],
 ['180°','RAD',Math.PI],['100g','DEG',90],
 ['-30°','RAD',-Math.PI/6],['2°30′0″','DEG',2.5],
 ['-2°30′0″','DEG',-2.5],['sin(90)','DEG',1],
 ['sin(100)','GRAD',1],['sin(pi/2)','RAD',1],
 ['90°','GRAD',100],['200g','RAD',Math.PI],
 ['-100g','DEG',-90],['sin(-90°)','GRAD',-1]
])near(M.evaluate(expr,state(angle)),want,expr+' in '+angle);
for(const [value,unit,want] of [[180,'DEG',Math.PI],
 [200,'GRAD',Math.PI],[Math.PI,'RAD',Math.PI]])
 near(M.toRadians(value,unit),want,'toRadians '+unit);
for(const [value,unit,want] of [[Math.PI,'DEG',180],
 [Math.PI,'GRAD',200],[Math.PI,'RAD',Math.PI]])
 near(M.fromRadians(value,unit),want,'fromRadians '+unit);
console.log('PLUS-024 PASS: '+checks+' DMS parsing, negative angles, DRG conversions, rounding, suffixes and domain boundaries (unit-only)');
