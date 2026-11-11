/* REA-082: per-operand DRG▶ unit suffixes and global-angle persistence.
 * Run: node calculator/tests/rea082-drg-angle.cjs
 * Source-level numerical tests are NOT physical manufacturer parity.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const M=require('../js/math-engine.js'),SETUP=require('../js/setup.js');
const K=require('../js/keypad.js'),L=require('../js/legend-audit.js');
const MODELS=require('../js/model-profiles.js');
let count=0;
const test=(name,fn)=>{try{fn();count++}catch(e){e.message=name+': '+e.message;throw e}};
const near=(actual,expected,tol=3e-10)=>{
 assert.ok(Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),
  actual+' not near '+expected);
};
const evalIn=(text,angle)=>M.evaluate(text,{angle,model:'fx-991es-plus-c'});
const factors={DEG:180/Math.PI,RAD:1,GRAD:200/Math.PI};
for(const angle of ['DEG','RAD','GRAD']){
 const scale=factors[angle];
 test(angle+' pi/2 rad suffix converts whole operand',()=>near(evalIn('(pi/2)r',angle),Math.PI/2*scale));
 test(angle+' 90 degree suffix',()=>near(evalIn('90°',angle),Math.PI/2*scale));
 test(angle+' 100 grad suffix',()=>near(evalIn('100g',angle),Math.PI/2*scale));
 test(angle+' 50 grad suffix',()=>near(evalIn('50g',angle),Math.PI/4*scale));
 test(angle+' minus 50 grad suffix',()=>near(evalIn('(-50)g',angle),-Math.PI/4*scale));
 test(angle+' nested sin rad',()=>near(evalIn('sin((pi/2)r)',angle),1));
 test(angle+' nested sin deg',()=>near(evalIn('sin(90°)',angle),1));
 test(angle+' nested cos grad',()=>near(evalIn('cos(100g)',angle),0));
 test(angle+' nested trig mixed source units',()=>near(evalIn('sin(30°+50g)',angle),Math.sin(75*Math.PI/180)));
 test(angle+' nested trig composite',()=>near(evalIn('sin(cos(0°)*100g)',angle),1));
 test(angle+' rad plus grad arithmetic',()=>near(evalIn('(pi/2)r+50g',angle),3*Math.PI/4*scale));
 test(angle+' suffix operator binds to right immediate operand',()=>near(evalIn('pi/2r',angle),Math.PI/(2*scale)));
 test(angle+' explicit parenthesis changes full operand scope',()=>{
  assert.ok(Math.abs(evalIn('pi/2r',angle)-evalIn('(pi/2)r',angle))>1e-8);
 });
 test(angle+' tangent pole is mathematical error',()=>assert.throws(()=>evalIn('tan(100g)',angle),/Math ERROR/));
 test(angle+' pi rad within cosine',()=>near(evalIn('cos(pir)',angle),-1));
 test(angle+' inverse sine remains in global unit',()=>near(evalIn('asin(1)',angle),Math.PI/2*scale));
 test(angle+' unmarked trig uses configured global unit',()=>near(evalIn('sin(30)',angle),Math.sin(30/scale)));
 test(angle+' degree conversion not cumulative across evaluation',()=>{
  const opts={angle};
  near(M.evaluate('(pi/2)r',opts),Math.PI/2*scale);
  assert.equal(opts.angle,angle);
 });
}
for(const [source,error] of [
 ['r','Syntax ERROR'],['g','Syntax ERROR'],['°','Syntax ERROR'],
 ['50q','Variable ERROR'],['sin(r)','Syntax ERROR'],
 ['3rr','Variable ERROR'],['50gr','Variable ERROR'],
 ['sin(90°','Syntax ERROR'],
 ['(pi/2)r)','Syntax ERROR']
]){
 test('invalid suffix syntax '+source,()=>assert.throws(()=>evalIn(source,'DEG'),new RegExp(error)));
}
test('postfix radian in denominator does not steal global setting',()=>{
 const opts={angle:'GRAD'};
 near(M.evaluate('2/(pi r)',opts),2/(Math.PI*200/Math.PI));
 assert.equal(opts.angle,'GRAD');
});
test('SETUP default persists as DEG',()=>assert.equal(SETUP.defaults.angle,'DEG'));
test('all original PLUS/C profiles expose SHIFT ANS DRG legend',()=>{
 for(const id of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
  const key=K.keysForModel(id).find(k=>k.id==='ANS');
  assert.match(key.shift,/DRG/);
  const out=L.classify(key,'SHIFT','COMP','edit',id,MODELS.supports);
  assert.equal(out.status,'available');
  assert.equal(L.classify(key,'SHIFT','CMPLX','edit',id,MODELS.supports).status,'blocked');
 }
});
test('DRG menu has 3 suffix options and does not set state.angle',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const start=app.indexOf('function drgMenu()'),end=app.indexOf('function shifted(key)',start);
 assert.ok(start>=0&&end>start);
 const body=app.slice(start,end);
 assert.match(body,/optionDialog\('DRG▶'/);
 for(const [number,suffix] of [['1','°'],['2','r'],['3','g']]){
  assert.match(body,new RegExp("key:'"+number+"'.*append\\('"+suffix.replace(/[.*+?^$\u007b\u007d()|[\]\\]/g,'\\$&')+"'\\)"));
 }
 assert.doesNotMatch(body,/state\.angle\s*=/);
 assert.match(body,/fromResult\)loadExpression\('\(Ans\)'\)/);
 assert.match(app,/if\(key==='ANS'\)\{drgMenu\(\);return true\}/);
 assert.doesNotMatch(app,/state\.angle==='DEG'\?'RAD'/);
});
test('global unit is modified only from SETUP path',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/state\.angle=id==='deg'\?'DEG':id==='rad'\?'RAD':'GRAD'/);
});
test('existing seconds/DMS normalization remains separate',()=>{
 const DMS=require('../js/sexagesimal.js');
 near(DMS.parseComponents(15,30,0),15.5);
 near(M.evaluate('30°', {angle:'RAD'}),Math.PI/6);
});
console.log('REA-082 PASS '+count+' numerical/DRG/SETUP/mode tests; native fidelity unverified');
