#!/usr/bin/env node
/* PLUS-032: independently computed arithmetic, trigonometric, DMS,
 * and conversion regression oracles. Source-level conformance, not
 * physical CASIO firmware parity.
 */
'use strict';
const A=require('node:assert/strict');
const M=require('../js/math-engine.js');
const B=require('../js/base-n.js');
const S=require('../js/sexagesimal.js');
const C=require('../js/metric-conversions.js');
let checks=0;
function near(label,actual,expected,tolerance=2e-11){
 A.ok(Number.isFinite(actual)&&Math.abs(actual-expected)<=
  tolerance*Math.max(1,Math.abs(expected)),
  label+': '+actual+' != '+expected);checks++;
}
function same(label,actual,expected){A.equal(actual,expected,label);checks++}
function rejected(label,fn,pattern){A.throws(fn,pattern,label);checks++}
const config=(angle='DEG')=>({angle,math:false,mode:'COMP'});
// Independent integer arithmetic: expected values computed with BigInt,
// never by invoking the calculator's expression engine.
for(let a=-6;a<=6;a++){
 for(let b=-6;b<=6;b++){
  const lhs=BigInt(a),rhs=BigInt(b);
  near('integer add '+a+','+b,M.evaluate('('+a+')+('+b+')',config()),Number(lhs+rhs));
  near('integer mul '+a+','+b,M.evaluate('('+a+')*('+b+')',config()),Number(lhs*rhs));
 }
}
for(let a=1;a<=9;a++)for(let b=1;b<=9;b++){
 const expression=a+'+('+b+'*3)';
 near('precedence '+a+','+b,M.evaluate(expression,config()),a+b*3);
}
for(let n=0;n<=8;n++){
 const factorial=Array.from({length:n},(_,i)=>BigInt(i+1))
  .reduce((x,y)=>x*y,1n);
 same('factorial '+n,M.evaluate(n+'!',config()),Number(factorial));
}
function choose(n,k){
 let out=1n;for(let i=1;i<=k;i++)out=out*BigInt(n-i+1)/BigInt(i);
 return Number(out);
}
for(let n=2;n<=10;n++)for(let k=0;k<=n;k++){
 near('combination '+n+','+k,M.evaluate(n+' nCr '+k,config()),choose(n,k));
}
for(let n=2;n<=9;n++)for(let k=0;k<=Math.min(4,n);k++){
 let out=1;for(let i=0;i<k;i++)out*=n-i;
 near('permutation '+n+','+k,M.evaluate(n+' nPr '+k,config()),out);
}
for(const [angle,unit] of [['DEG',90],['GRAD',100],['RAD',Math.PI/2]]){
 for(const q of [-4,-3,-2,-1,0,1,2,3,4]){
  const x=q*unit;
  const expression=angle==='RAD'?q+'*pi/2':String(x);
  near('sin '+angle+','+q,M.evaluate('sin('+expression+')',config(angle)),[0,1,0,-1][((q%4)+4)%4]);
  near('cos '+angle+','+q,M.evaluate('cos('+expression+')',config(angle)),[1,0,-1,0][((q%4)+4)%4]);
 }
}
for(const [literal,decimal,rendered] of [
 ['2°30′0″',2.5,'2°30′0″'],
 ['-2°30′0″',-2.5,'-2°30′0″'],
 ['0°0′1″',1/3600,'0°0′1″'],
 ['-0°30′0″',-.5,'-0°30′0″']
]){
 near('DMS '+literal,M.evaluate(literal,config()),decimal);
 same('DMS formatted '+literal,S.format(decimal),rendered);
}
for(const [from,to,code] of [
 ['cm','in','02'],['g','oz','22'],['F','C','37'],['C','F','38'],
 ['J','cal','39'],['cal','J','40']
]){
 const entry=C.select('fx-991es-plus',code);
 for(const x of [-40,0,1,100]){
  const converted=C.convert(x,entry);
  near('CONV literal '+from+'->'+to+' '+x,
   M.evaluate(C.literal(entry,String(x)),config()),converted);
 }
}
for(const [input,code,expected] of [
 [32,'37',0],[212,'37',100],[0,'38',32],[100,'38',212],
 [100,'22',3.5273965837869565],[5,'02',1.968503937007874]
]){
 near('CASIO conversion '+code+' '+input,
  C.convert(input,C.select('fx-991es-plus',code)),expected);
}
for(const [expression,base,expected] of [
 ['1010 and 1100','BIN',8n],['1010 or 1100','BIN',14n],
 ['1010 xor 1100','BIN',6n],['Not(0)','BIN',-1n],
 ['1F+1','HEX',32n],['7+1','OCT',8n]
]){
 same('BASE-N '+expression,B.evaluate(expression,base),expected);
}
rejected('division by zero',()=>M.evaluate('1/0',config()),/Math ERROR/);
rejected('sqrt negative',()=>M.evaluate('sqrt(-1)',config()),/Math ERROR/);
rejected('undefined tangent',()=>M.evaluate('tan(90)',config()),/Math ERROR/);
rejected('invalid DMS minute',()=>S.normalize('2°60′0″'),/Argument ERROR/);
rejected('invalid DMS trailing token',()=>S.normalize('2°30′0″XYZ'),/Syntax ERROR/);
console.log('PLUS-032 PASS: '+checks+' independent arithmetic, angle, DMS, BASE-N and conversion checks (unit-only)');
