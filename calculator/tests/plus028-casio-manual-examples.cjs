#!/usr/bin/env node
/* PLUS-028/ALT: manufacturer-documented reference cases, not native device captures.
 * Independent oracle values transcribed from the CASIO 2nd edition guide:
 * EQN https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/equation_calculations.html
 * CMPLX https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/cmplx.html
 * BASE-N https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/using_calculation_modes/base-n_calculations.html
 * Precision https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/technical_informatoin/calculation_ranges.html
 */
'use strict';
const A=require('node:assert/strict');
const E=require('../js/equation-engine.js');
const C=require('../js/complex-engine.js');
const B=require('../js/base-n.js');
const M=require('../js/math-engine.js');
const V=require('../js/metric-conversions.js');
let cases=0;
const close=(value,expected,name,tol=1e-10)=>{
 A.ok(Number.isFinite(value)&&Math.abs(value-expected)<=tol*Math.max(1,Math.abs(expected)),
  name+': expected '+expected+' got '+value);
};
function check(name,action){try{action();cases++}catch(error){throw Error(name+': '+error.message)}}
// EQN examples 1, 2, 3, 4, 5 — CASIO user guide.
check('EQN linear 2 unknowns, example 1',()=>{
 const out=E.systems([[1,2,3],[2,3,4]]);
 A.deepEqual(out.solutions.map(s=>[s.label,s.value]),[['X',-1],['Y',2]]);
});
check('EQN linear 3 unknowns, example 2',()=>{
 const out=E.systems([[1,-1,1,2],[1,1,-1,0],[-1,1,1,4]]);
 A.deepEqual(out.solutions.map(s=>[s.label,s.value]),[['X',1],['Y',2],['Z',3]]);
});
check('EQN quadratic complex roots, example 3',()=>{
 const out=E.quadratic([1,1,.75]);
 A.equal(out.nonRealCount,2);
 close(out.solutions[0].complex.re,-.5,'root 1 re');
 close(out.solutions[0].complex.im,Math.SQRT1_2,'root 1 im');
 close(out.solutions[1].complex.re,-.5,'root 2 re');
 close(out.solutions[1].complex.im,-Math.SQRT1_2,'root 2 im');
});
check('EQN repeated surd root, example 4',()=>{
 const out=E.quadratic([1,-2*Math.SQRT2,2]);
 A.equal(out.solutions.length,1);
 close(out.solutions[0].value,Math.SQRT2,'repeated root');
});
check('EQN cubic roots and CASIO ordering, example 5',()=>{
 const out=E.cubic([1,-2,-1,2]);
 A.equal(out.solutions.length,3);
 for(let i=0;i<3;i++)close(out.solutions[i].value,[-1,2,1][i],'cubic '+i);
});
// CMPLX published examples.
for(const [name,expression,re,im] of [
 ['rectangular division','(2+6i)/(2i)',3,-1],
 ['polar input in Deg','2∠45',Math.SQRT2,Math.SQRT2],
 ['complex inverse','(1-i)^(-1)',.5,.5],
 ['squares cancellation','(1+i)^2+(1-i)^2',0,0],
 ['conjugate','Conjg(2+3i)',2,-3],
 ['absolute magnitude','Abs(1+i)',Math.SQRT2,0],
 ['argument Deg','Arg(1+i)',45,0]
]){
 check('CMPLX '+name,()=>{
  const z=C.evaluate(expression,{angle:'DEG'});
  close(z.re,re,name+' real');close(z.im,im,name+' imaginary');
 });
}
check('CMPLX polar display published example',()=>{
 A.equal(C.format(C.evaluate('2∠45',{angle:'DEG'}),'DEG','polar'),'2∠45');
});
check('CMPLX argument principal range',()=>{
 close(C.normalizedAngle(-1,0,'DEG'),180,'principal angle');
});
// BASE-N published logical examples and signed ranges.
for(const [name,expression,base,expected] of [
 ['BIN 11 + 1','11+1','BIN','0000000000000100'],
 ['HEX 1F + 1','1F+1','HEX','00000020'],
 ['OCT 7 + 1','7+1','OCT','00000000010'],
 ['AND','1010 and 1100','BIN','0000000000001000'],
 ['OR','1011 or 11010','BIN','0000000000011011'],
 ['XOR','1010 xor 1100','BIN','0000000000000110'],
 ['XNOR','1111 xnor 101','BIN','1111111111110101'],
 ['NOT','Not(1010)','BIN','1111111111110101'],
 ['NEG','Neg(101101)','BIN','1111111111010011']
]){
 check('BASE-N '+name,()=>A.equal(B.format(B.evaluate(expression,base),base),expected));
}
check('BASE-N documented signed widths',()=>{
 A.equal(B.range('BIN').width,16);
 for(const b of ['DEC','OCT','HEX'])A.equal(B.range(b).width,32);
 A.equal(B.range('DEC').min,-2147483648n);
 A.equal(B.range('DEC').max,2147483647n);
});
// Official published conversion examples.
for(const [name,value,code,expected,precision] of [
 ['5 cm to inches',5,'02',1.968503937,5e-10],
 ['100 g to ounces',100,'22',3.527396584,5e-10],
 ['-31 Celsius to Fahrenheit',-31,'38',-23.8,1e-12]
]){
 check('CONV '+name,()=>close(V.convert(value,V.select('fx-991es-plus',code)),expected,name,precision));
}
// Documented precision and unit-domain constraints.
check('15 internal calculation digits',()=>close(M.evaluate('1/3+1/3+1/3'),1,'COMP precision',1e-10));
check('DEG / RAD / GRAD equivalent right angles',()=>{
 for(const [angle,expr] of [['DEG','sin(90)'],['RAD','sin(pi/2)'],['GRAD','sin(100)']])
  close(M.evaluate(expr,{angle}),1,angle);
});
check('tan at odd multiple of 90 is undefined',()=>{
 A.throws(()=>M.evaluate('tan(90)',{angle:'DEG'}),/Math ERROR/);
});
console.log('PLUS-028 ALT PASS: '+cases+' manufacturer-referenced numeric / mode cases (no hardware claims)');
