/* REA-089 — CMPLX arithmetic, commands, memory and display source tests.
 * Run: node calculator/tests/rea089-complex-parity.cjs
 * Source-level tests only, not physical CASIO or browser traces.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../js/complex-engine.js');
let passed=0;
function test(name,fn){try{fn();passed++}catch(e){e.message=name+': '+e.message;throw e}}
function near(x,y){assert.ok(Number.isFinite(x)&&Math.abs(x-y)<1e-10*Math.max(1,Math.abs(y)),x+' != '+y)}
function equalZ(z,re,im){near(z.re,re);near(z.im,im)}
const cases=[
 ['(2+3i)*(4-5i)',23,2],
 ['i^2',-1,0],['-i^2',1,0],['(1+i)^2',0,2],
 ['conj(2+3i)',2,-3],['Conjg(2+3i)',2,-3],
 ['abs(3+4i)',5,0],['arg(i)',90,0],
 ['re(2+3i)',2,0],['im(2+3i)',3,0],
 ['2∠90',0,2],['2∠-90',0,-2],
 ['(9e99+9e99i)/(9e99+9e99i)',1,0],
 ['(9e99-9e99i)/(9e99+9e99i)',0,-1],
 ['(9e99+9e99i)/(9e99-9e99i)',0,1],
 ['(1e-99+1e-99i)/(1e-99+1e-99i)',1,0],
 ['1/i',0,-1],['(1+i)/(1-i)',0,1],
 ['(3+4i)/(3+4i)',1,0],['(0+1e-99i)/(0+1e-99i)',1,0],
 ['sqrt(-1)',0,1],['i^4',1,0],
 ['(1+i)*(1-i)',2,0],['2(1+i)',2,2]
];
for(const [expr,re,im] of cases)test('arithmetic '+expr,()=>equalZ(C.evaluate(expr),re,im));
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 test('Ans persisted '+model,()=>equalZ(C.evaluate('Ans+i',{model,ans:{re:2,im:-3}}),2,-2));
 test('complex register '+model,()=>equalZ(C.evaluate('A+Ans',{model,ans:{re:1,im:1},memory:{A:{re:4,im:-2}}}),5,-1));
 test('real register fallback '+model,()=>equalZ(C.evaluate('A+i',{model,memory:{A:3}}),3,1));
 test('original E/F register restrictions '+model,()=>{
  if(model==='fx-991es')assert.throws(()=>C.evaluate('E+i',{model,memory:{E:5}}),/Variable ERROR/);
  else equalZ(C.evaluate('E+i',{model,memory:{E:5}}),5,1);
 });
}
for(const [expr,unit,re,im] of [
 ['2∠90','DEG',0,2],['2∠1.5707963267948966','RAD',0,2],
 ['2∠100','GRAD',0,2],['arg(-i)','DEG',-90,0],
 ['arg(-i)','RAD',-Math.PI/2,0],['arg(-i)','GRAD',-100,0],
 ['arg(-1)','DEG',180,0],['conj(3-2i)','DEG',3,2]
])test('angle '+unit+' '+expr,()=>equalZ(C.evaluate(expr,{angle:unit}),re,im));
for(const [expr,format] of [
 ['2+3i►r∠θ','polar'],['2+3i▶r∠θ','polar'],
 ['2+3i→r∠θ','polar'],['2∠90►a+bi','rectangular'],
 ['2+3i','none']
])test('suffix '+expr,()=>{
 const parsed=C.splitDisplayCommand(expr);
 assert.equal(parsed.format,format==='none'?null:format);
 if(format!=='none')assert.ok(!parsed.expression.includes('►'));
});
for(const expr of [
 '1/0','1/(i-i)','arg(0)','2∠(2i)','(-1)∠90',
 '2►r∠θ+1','2►a+bi►r∠θ','conj(1,2)','sqrt()',
 '1+','(2+i','1+i)','2∠i'
])test('invalid '+expr,()=>assert.throws(()=>C.evaluate(expr),/Math ERROR|Syntax ERROR/));
for(const [z,unit,style,want] of [
 [{re:3,im:-2},'DEG','rectangular','3-2i'],
 [{re:0,im:1},'DEG','rectangular','i'],
 [{re:0,im:-1},'DEG','rectangular','-i'],
 [{re:-2,im:0},'DEG','polar','2∠180'],
 [{re:0,im:1},'RAD','polar','1∠1.57079632679'],
 [{re:0,im:1},'GRAD','polar','1∠100']
])test('result '+style+' '+unit,()=>assert.equal(C.format(z,unit,style),want));
test('line IO components rectangular',()=>assert.deepEqual(C.components({re:3,im:-2}),'3|-2i'.split('|')));
test('line IO components polar',()=>assert.deepEqual(C.components({re:0,im:2},'DEG','polar'),['2','90']));
test('command suffix unsupported in middle',()=>assert.throws(()=>C.splitDisplayCommand('1►r∠θ+1'),/Syntax ERROR/));
test('controller stores complex Ans and permits format override',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(s,/state\.complexAns=z/);
 assert.match(s,/const style=formatOverride\|\|state\.complexFormat/);
 assert.match(s,/COMPLEX\.splitDisplayCommand\(source\)/);
 assert.match(s,/setComplexResult\(z,source,command\.format\)/);
 assert.match(s,/memory:\{\.\.\.state\.memory,\.\.\.state\.complexMemory\}/);
});
test('controller handles store/recall/M plus/minus complex',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(s,/state\.complexMemory\[name\]=z/);
 assert.match(s,/state\.complexMemory\[name\]\?\?COMPLEX\.value\(state\.memory\[name\]\)/);
 assert.match(s,/COMPLEX\.add\(previous,value\)/);
 assert.match(s,/COMPLEX\.sub\(previous,value\)/);
});
test('original CMPLX SHIFT 2 suffix menu and cancel route',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const block=s.slice(s.indexOf('function complexMenu(){'),s.indexOf('// REA-063:',s.indexOf('function complexMenu(){')));
 for(const label of ['1. arg','2. Conjg','3. ►r∠θ','4. ►a+bi'])assert.ok(block.includes(label),label);
 assert.match(block,/if\(fromResult\)loadExpression\(command\?'Ans'\+text:text\)/);
 assert.match(s,/state\.mode==='CMPLX'&&key==='2'/);
 assert.match(s,/if\(key==='AC'\)/);
});
test('CMPLX i key and angle key routes',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(s,/if\(key==='ENG'\)\{if\(state\.mode==='CMPLX'\)\{insert\('i'\);return\}/);
 assert.match(s,/state\.mode==='CMPLX'&&key==='NEG'/);
});
test('LineIO render uses two components',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/display.js'),'utf8');
 assert.match(s,/state\.complexResultLines\.length===2/);
 assert.match(s,/write\(parts\[0\]\.slice\(0,23\),0,17\)/);
 assert.match(s,/write\(parts\[1\]\.slice\(0,23\),0,25\)/);
});
test('complex engine is loaded before controller',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.ok(s.indexOf('js/complex-engine.js')>=0);
 assert.ok(s.indexOf('js/complex-engine.js')<s.indexOf('js/app.js'));
});
console.log('REA-089 PASS '+passed+' source-level complex tests; browser and physical hardware not validated');
