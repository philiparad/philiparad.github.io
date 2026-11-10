/* REA-069 — original fx-991ES variable inventory regression.
 * Run from calculator/: node tests/rea069-registers.cjs
 * Reference: CASIO fx-115ES / fx-991ES User's Guide, E-25–27.
 */
'use strict';
const assert=require('node:assert/strict');
const MODELS=require('../js/model-profiles.js');
const M=require('../js/math-engine.js');
const COMPLEX=require('../js/complex-engine.js');
const fs=require('node:fs');
const path=require('node:path');
let count=0;
function check(name,action){try{action();count++}catch(e){e.message=name+': '+e.message;throw e}}
const profiles={
 'fx-991es':['A','B','C','D','X','Y','M'],
 'fx-991es-plus':['A','B','C','D','E','F','X','Y','M'],
 'fx-991es-plus-c':['A','B','C','D','E','F','X','Y','M']
};
for(const [model,registers] of Object.entries(profiles)){
 check(model+' inventory',()=>assert.deepEqual(MODELS.registers(model),registers));
 for(const key of [...registers,'E','F']){
  check(model+' register '+key,()=>assert.equal(MODELS.hasRegister(model,key),registers.includes(key)));
 }
 for(const key of ['E','F']){
  const opts={model,memory:{E:3,F:4}};
  if(model==='fx-991es'){
   check(model+' COMP rejects '+key,()=>assert.throws(()=>M.evaluate(key+'+1',opts),/Variable ERROR/));
   check(model+' CMPLX rejects '+key,()=>assert.throws(()=>COMPLEX.evaluate(key+'+i',opts),/Variable ERROR/));
  }else{
   check(model+' COMP accepts '+key,()=>assert.equal(M.evaluate(key+'+1',opts),key==='E'?4:5));
   check(model+' CMPLX accepts '+key,()=>{
    const z=COMPLEX.evaluate(key+'+i',opts);
    assert.equal(z.re,key==='E'?3:4);assert.equal(z.im,1);
   });
  }
 }
}
check('real e constant survives original guard',()=>assert.ok(Math.abs(M.evaluate('e+pi',{model:'fx-991es'})-Math.E-Math.PI)<1e-12));
check('E scientific exponent survives original guard',()=>assert.equal(M.evaluate('1E-3+2',{model:'fx-991es'}),2.001));
const controller=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
new Function(controller);
for(const [desc,expr] of [
 ['STO/RCL guard',/if\(!registerAllowed\(name\)\)\{notify\('Register unavailable/],
 ['register assignment guard',/function assignRegister\(name,value\)\{\s*if\(!registerAllowed\(name\)\)/],
 ['ALPHA guard',/if\(!registerAllowed\(variables\[key\]\)\)/],
 ['CALC guard',/if\(!registerAllowed\(k\)\|\|/],
 ['model reaches worker',/model:state\.model,angle:state\.angle/],
 ['model reaches complex parser',/model:state\.model\}\)/]
]){
 check(desc,()=>assert.match(controller,expr));
}
console.log('REA-069 PASS: '+count+' model/register/expression/controller checks');
