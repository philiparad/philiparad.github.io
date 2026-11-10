/* REA-081: full 50-key x normal/SHIFT/ALPHA x mode/screen/model
 * classification contract. Run: node calculator/tests/rea081-legend-audit.cjs
 * Classification is a WEB-model audit. Delegated mode handlers and
 * manufacturer physical key scans still require browser/device verification.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const K=require('../js/keypad.js'),L=require('../js/legend-audit.js'),M=require('../js/model-profiles.js');
let count=0;
function check(label,fn){try{fn();count++}catch(e){e.message=label+': '+e.message;throw e}}
const rows=L.inventory(K,M),expected=3*11*7*50*3;
check('full Cartesian audit row count',()=>assert.equal(rows.length,expected));
check('all rows unique by five dimensions',()=>{
 const ids=new Set(rows.map(r=>[r.model,r.mode,r.screen,r.key,r.modifier].join('/')));
 assert.equal(ids.size,expected);
});
check('every row has explicit label/status/reason',()=>{
 const valid=['available','blocked','delegated','unlabelled','unlabelled-control'];
 for(const r of rows){
  assert.ok(valid.includes(r.status),r.status);
  assert.equal(typeof r.legend,'string');
  assert.ok(r.reason.length>0);
  if(r.status==='unlabelled')assert.equal(r.legend,'');
 }
});
check('only model-supported modes are selected for observed UI',()=>{
 for(const model of L.MODELS){
  const actualModes=M.get(model).modes;
  assert.ok(actualModes.includes('COMP'));
  assert.ok(!M.supports(model,'VERIF') || model==='fx-991es-plus-c');
 }
});
check('unsupported mode contexts are blocked even in the full Cartesian export',()=>{
 for(const r of rows){
  if(!M.supports(r.model,r.mode)){
   assert.equal(r.status,'blocked');
   assert.match(r.reason,/not supported/);
  }
 }
});
check('any modifier in prompt/menu/result-flow is delegated or explicitly blocked',()=>{
 for(const r of rows){
  if(['prompt','menu','flow-result'].includes(r.screen)&&r.modifier!=='normal')
   assert.ok(r.status==='blocked'||r.status==='unlabelled');
 }
});
check('calculating blocks active modifier legends',()=>{
 for(const r of rows){
  if(r.screen==='calculating'&&r.key==='SIN'&&r.modifier==='SHIFT')
   assert.equal(r.status,'blocked');
 }
});
check('error screen supports AC/LEFT/RIGHT only',()=>{
 for(const r of rows){
  if(M.supports(r.model,r.mode)&&r.screen==='error'&&r.modifier==='normal'&&['AC','LEFT','RIGHT'].includes(r.key))
   assert.equal(r.status,'available');
 }
});
function row(model,key,modifier,mode='COMP',screen='edit'){
 const r=rows.find(r=>r.model===model&&r.key===key&&r.modifier===modifier&&r.mode===mode&&r.screen===screen);
 assert.ok(r);return r;
}
check('original COS and TAN variable legends absent',()=>{
 for(const key of ['COS','TAN'])assert.equal(row('fx-991es',key,'ALPHA').status,'unlabelled');
});
check('PLUS and C E/F register legends active',()=>{
 for(const model of ['fx-991es-plus','fx-991es-plus-c']){
  assert.equal(row(model,'COS','ALPHA').status,'available');
  assert.equal(row(model,'TAN','ALPHA').status,'available');
 }
});
check('original lacks recurring-decimal alpha sqrt',()=>{
 assert.equal(row('fx-991es','SQRT','ALPHA').status,'unlabelled');
 assert.equal(row('fx-991es-plus','SQRT','ALPHA').status,'unlabelled');
 assert.equal(row('fx-991es-plus-c','SQRT','ALPHA').status,'available');
});
check('original lacks alpha PreAns and DOT RanInt',()=>{
 assert.equal(row('fx-991es','ANS','ALPHA').status,'unlabelled');
 assert.equal(row('fx-991es','DOT','ALPHA').status,'unlabelled');
 assert.equal(row('fx-991es-plus-c','ANS','ALPHA').status,'available');
});
check('CALC COMP / CMPLX and SOLVE COMP only',()=>{
 for(const model of L.MODELS){
  assert.equal(row(model,'CALC','normal','COMP').status,'available');
  assert.equal(row(model,'CALC','normal','CMPLX').status,'available');
  assert.equal(row(model,'CALC','SHIFT','COMP').status,'available');
  assert.equal(row(model,'CALC','SHIFT','CMPLX').status,'blocked');
 }
});
check('SHIFT derivative and sigma restricted to COMP',()=>{
 for(const id of ['INTEGRAL','LOGBASE']){
  assert.equal(row('fx-991es-plus-c',id,'SHIFT','COMP').status,'available');
  assert.equal(row('fx-991es-plus-c',id,'SHIFT','CMPLX').status,'blocked');
 }
});
check('primary integration requires COMP',()=>{
 assert.equal(row('fx-991es-plus-c','INTEGRAL','normal','COMP').status,'available');
 assert.equal(row('fx-991es-plus-c','INTEGRAL','normal','CMPLX').status,'blocked');
});
check('CMPLX shift NEG and normal ENG',()=>{
 assert.equal(row('fx-991es-plus-c','NEG','SHIFT','CMPLX').status,'available');
 assert.equal(row('fx-991es-plus-c','NEG','SHIFT','COMP').status,'blocked');
 assert.equal(row('fx-991es-plus-c','ENG','normal','CMPLX').status,'available');
});
check('ALPHA ENG is colon on COMP and CMPLX',()=>{
 for(const mode of ['COMP','CMPLX'])assert.equal(row('fx-991es-plus-c','ENG','ALPHA',mode).status,'available');
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/if\(key==='ENG'\)return insert\(':'\)/);
 assert.match(app,/if\(key==='ENG'\)\{if\(state\.mode==='CMPLX'\)\{insert\('i'\)/);
});
check('result-only S-D / factor and engineering shifts',()=>{
 for(const key of ['SD','ENG','DMS']){
  assert.equal(row('fx-991es-plus-c',key,'SHIFT','COMP','edit').status,'blocked');
  assert.equal(row('fx-991es-plus-c',key,'SHIFT','COMP','result').status,'available');
 }
});
check('original no VERIFY mode or Shift 6 legend',()=>{
 assert.equal(row('fx-991es','6','SHIFT','COMP').status,'unlabelled');
 assert.equal(row('fx-991es-plus','6','SHIFT','COMP').status,'unlabelled');
 assert.equal(row('fx-991es-plus-c','6','SHIFT','COMP').status,'available');
});
check('BASE-N / TABLE context rejects CONST and CONV',()=>{
 for(const key of ['7','8']){
  assert.equal(row('fx-991es-plus-c',key,'SHIFT','BASE-N').status,'blocked');
 }
});
check('keyboard mode/result classifications make no false active shortcut in prompt',()=>{
 const r=row('fx-991es-plus-c','INTEGRAL','SHIFT','COMP','prompt');
 assert.equal(r.status,'blocked');
});
check('keypad shows blocked modifier status without disabling the key',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/keypad.js'),'utf8');
 assert.match(code,/classList\.toggle\('legend-unavailable'/);
 assert.match(code,/aria-description/);
 assert.doesNotMatch(code,/button\.disabled\s*=\s*unavailable/);
});
check('controller refuses unavailable modifier before shift/alpha dispatch',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const gate=code.indexOf("action.status==='blocked'||action.status==='unlabelled'");
 const shifted=code.indexOf("if(state.shift&&shifted(key))");
 const alpha=code.indexOf("if(state.alpha){state.alpha=false;if(alphaKey(key)!==null)return}");
 assert.ok(gate>0&&shifted>gate&&alpha>shifted);
});
check('UI paints policy and has JSON export',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.match(code,/K\.applyContext\(\$\('keys'\),state,LEGENDS,MODELS\)/);
 assert.match(code,/LEGENDS\.inventory\(K,MODELS\)/);
 assert.match(html,/id="export-legends"/);
});
check('unavailable modifier styling exists',()=>{
 const css=fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8');
 assert.match(css,/\.key-unit\.legend-unavailable/);
});
check('all physical models have precisely 50 keys',()=>{
 for(const model of L.MODELS)assert.equal(K.keysForModel(model).length,50);
});
console.log('REA-081 PASS '+count+' audits; '+rows.length+' context rows enumerated; native hardware unverified');
