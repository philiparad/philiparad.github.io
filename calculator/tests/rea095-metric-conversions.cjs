/* REA-095 — original fx-991ES metric conversion Appendix #117.
 * Run: node calculator/tests/rea095-metric-conversions.cjs
 * Hardware and browser DOM comparisons must be performed separately.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path');
const CONV=require('../js/metric-conversions.js');
const FACTORS=[2.54,0.3048,0.9144,1.609344,1852,4046.856,3.785412,4.54609,
 3.085678e13,5/18,28.34952,0.4535924,101325,133.3224,0.7457,98066.5,
 9.80665,6.894757,null,4.1858];
let passed=0;
function test(name,fn){try{fn();passed++}catch(error){error.message=name+': '+error.message;throw error}}
function near(actual,want){assert.ok(Number.isFinite(actual)&&Math.abs(actual-want)<=1e-10*Math.max(1,Math.abs(want)),actual+' != '+want)}
test('exactly 40 conversion entries',()=>assert.equal(CONV.ITEMS.length,40));
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 for(let index=0;index<20;index++){
  const odd=String(index*2+1).padStart(2,'0'),even=String(index*2+2).padStart(2,'0');
  const forward=CONV.select(model,odd),back=CONV.select(model,even);
  test(model+' paired codes '+odd+'/'+even,()=>{
   assert.equal(forward.code,odd);assert.equal(back.code,even);
   assert.equal(forward.from,back.to);assert.equal(forward.to,back.from);
  });
  if(model!=='fx-991es-plus')test(model+' original rounded factor '+odd,()=>{
   if(index===18)assert.equal(forward.factor,null);
   else near(forward.factor,FACTORS[index]);
  });
  if(index===18){
   test(model+' F to C',()=>near(CONV.convert(212,forward),100));
   test(model+' C to F',()=>near(CONV.convert(-40,back),-40));
  }else{
   test(model+' round trip '+odd+'/'+even,()=>{
    const initial=4.17;
    near(CONV.convert(CONV.convert(initial,forward),back),initial);
   });
  }
 }
}
for(const [code,input,expected] of [
 ['02',5,5/2.54],['22',100,100/28.34952],['38',-31,-23.8],
 ['37',32,0],['37',212,100],['38',0,32],['39',4.1858,1],['40',1,4.1858]
])test('manufacturer example or affine/calorie '+code,()=>near(
 CONV.convert(input,CONV.select('fx-991es',code)),expected));
for(const [code,expected] of [
 ['39','((4.1858)/4.1858)'],['40','((4.1858)*4.1858)'],
 ['37','(((212)-32)/1.8)'],['38','(((0)*1.8)+32)']
])test('printed conversion formula '+code,()=>{
 const operand=code==='37'?'212':code==='38'?'0':'4.1858';
 assert.equal(CONV.literal(CONV.select('fx-991es',code),operand),expected);
});
for(const source of ['100','-31','Ans','(1+2)','1+2','X^2'])
 test('postfix operand '+source,()=>assert.ok(
  CONV.insert(source,CONV.select('fx-991es','02')).includes('/2.54')));
test('postfix converts only last operand of a sum',()=>{
 assert.equal(CONV.insert('1+5',CONV.select('fx-991es','02')),'1+((5)/2.54)');
});
for(const invalid of ['00','41','99','ABC','-1'])
 test('invalid conversion code '+invalid,()=>assert.throws(
  ()=>CONV.select('fx-991es',invalid),/Argument ERROR/));
test('invalid model',()=>assert.throws(()=>CONV.select('unsupported','01'),/Argument ERROR/));
test('key-driven 02 code insertion',()=>{
 const editor=CONV.editor();
 assert.equal(CONV.digit(editor,'0','fx-991es'),null);
 assert.equal(CONV.digit(editor,'2','fx-991es').code,'02');
});
test('key-driven 40 code insertion',()=>{
 const editor=CONV.editor();
 assert.equal(CONV.digit(editor,'4','fx-991es'),null);
 assert.equal(CONV.digit(editor,'0','fx-991es').code,'40');
});
test('cancel/edit helper preserves code editor',()=>{
 const editor=CONV.editor();CONV.digit(editor,'3','fx-991es');
 CONV.backspace(editor);assert.equal(editor.buffer,'');
});
test('bad code digit rejected',()=>{
 const editor=CONV.editor();assert.throws(()=>CONV.digit(editor,'A','fx-991es'),/Syntax ERROR/);
});
test('conversion calculation overflow',()=>assert.throws(
 ()=>CONV.convert(9e99,CONV.select('fx-991es','25')),/Math ERROR/));
test('all original code factors checked without 2014 PLUS overrides',()=>{
 const a=CONV.select('fx-991es','11'),b=CONV.select('fx-991es-plus','11');
 assert.equal(a.factor,4046.856);
 assert.equal(b.factor,4046.8564224);
});
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
for(const fragment of ['function conversionStart()',
 "state.mode==='BASE-N'||state.mode==='TABLE'",
 'function conversionCodeHandle(key)',
 "if(key==='AC')","if(key==='DEL'||key==='LEFT')",
 'CONV.digit(editor,key,state.model)',
 'CONV.insert(leading,command)+trailing',
 'state.editor=STRUCT.fromString(replacement)'])
 test('controller integration '+fragment,()=>assert.ok(app.includes(fragment)));
console.log('REA-095 PASS '+passed+' source-level conversion checks; browser/hardware unverified');
