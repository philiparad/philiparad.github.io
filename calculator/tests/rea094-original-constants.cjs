/* REA-094: original fx-991ES constants Appendix #114, CODATA 1998.
 * Run: node calculator/tests/rea094-original-constants.cjs
 * Casio source: https://support.casio.com/pdf/004/fx-115ES_570ES.etc_Appendix.pdf
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const CONST=require('../js/scientific-constants.js');
const APPENDIX_114=`1.67262158e-27
1.67492716e-27
9.10938188e-31
1.88353109e-28
0.5291772083e-10
6.62606876e-34
5.05078317e-27
927.400899e-26
1.054571596e-34
7.297352533e-3
2.817940285e-15
2.426310215e-12
2.67522212e8
1.321409847e-15
1.319590898e-15
10973731.568549
1.66053873e-27
1.410606633e-26
-928.476362e-26
-0.96623640e-26
-4.49044813e-26
96485.3415
1.602176462e-19
6.02214199e23
1.3806503e-23
22.413996e-3
8.314472
299792458
3.74177107e-16
1.4387752e-2
5.670400e-8
8.854187817e-12
12.566370614e-7
2.067833636e-15
9.80665
7.748091696e-5
376.730313461
273.15
6.673e-11
101325`.trim().split('\n');
let checks=0;
function check(name,fn){try{fn();checks++}catch(e){e.message=name+': '+e.message;throw e}}
check('40 appendix constants',()=>assert.equal(APPENDIX_114.length,40));
check('40 catalog entries',()=>assert.equal(CONST.ITEMS.length,40));
check('original year',()=>assert.equal(CONST.MODELS['fx-991es'],1998));
for(let i=0;i<40;i++){
 const code=String(i+1).padStart(2,'0'),reference=APPENDIX_114[i];
 check('code '+code+' preserved',()=>assert.equal(CONST.ITEMS[i].code,code));
 check('CASIO #114 text '+code,()=>assert.equal(CONST.select('fx-991es',code).printedValue,reference));
 check('CASIO #114 numeric '+code,()=>assert.equal(CONST.select('fx-991es',code).value,Number(reference)));
 check('original year '+code,()=>assert.equal(CONST.select('fx-991es',code).year,1998));
 check('valid arithmetic literal '+code,()=>{
  const s=CONST.literal(CONST.select('fx-991es',code));
  assert.match(s,/^\([\d.-]+\*10\^\([-+]?\d+\)\)$/);
 });
}
for(const model of ['fx-991es-plus','fx-991es-plus-c']){
 check(model+' unchanged 2014 profile',()=>assert.equal(CONST.MODELS[model],2014));
 for(let i=1;i<=40;i++){
  const code=String(i).padStart(2,'0'),entry=CONST.select(model,code);
  check(model+' code '+code+' isolated',()=>{
   assert.equal(entry.year,2014);assert.equal(entry.printedValue,null);
   assert.equal(entry.value,entry.values[2014]);
  });
 }
}
for(const [code,value] of [['01',1.67262158e-27],['06',6.62606876e-34],
 ['19',-928.476362e-26],['26',22.413996e-3],
 ['28',299792458],['35',9.80665],['39',6.673e-11],['40',101325]]){
 check('boundary example '+code,()=>assert.equal(CONST.select('fx-991es',code).value,value));
}
for(const code of ['00','41','99','-1','abc','']){
 check('reject code '+JSON.stringify(code),()=>assert.throws(
  ()=>CONST.select('fx-991es',code),/Argument ERROR/));
}
check('keyed 01 selection',()=>{
 const e=CONST.codeEditor();assert.equal(CONST.type(e,'0','fx-991es'),null);
 assert.equal(CONST.type(e,'1','fx-991es').value,Number(APPENDIX_114[0]));
});
check('keyed 40 selection',()=>{
 const e=CONST.codeEditor();assert.equal(CONST.type(e,'4','fx-991es'),null);
 assert.equal(CONST.type(e,'0','fx-991es').value,101325);
});
check('key cancel/backspace',()=>{
 const e=CONST.codeEditor();CONST.type(e,'2','fx-991es');CONST.backspace(e);
 assert.equal(e.buffer,'');assert.equal(e.error,'');
});
check('invalid second digit',()=>{
 const e=CONST.codeEditor();CONST.type(e,'4','fx-991es');
 assert.throws(()=>CONST.type(e,'1','fx-991es'),/Argument ERROR/);
});
check('invalid keypad nonnumeric',()=>assert.throws(
 ()=>CONST.type(CONST.codeEditor(),'A','fx-991es'),/Argument ERROR/));
check('CONST is routed via SHIFT 7, two-digit and BASE-N restricted',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(s,/function constantStart\(\)/);
 assert.match(s,/state\.mode==='BASE-N'/);
 assert.match(s,/function constantCodeHandle\(key\)/);
 assert.match(s,/CONST\.type\(editor,key,state\.model\)/);
 assert.match(s,/if\(key==='AC'\)/);
 assert.match(s,/if\(key==='DEL'\|\|key==='LEFT'\)/);
 assert.match(s,/CONST\.literal\(item\)/);
});
console.log('REA-094 PASS '+checks+' original appendix, profile isolation and CONST routing source checks');
