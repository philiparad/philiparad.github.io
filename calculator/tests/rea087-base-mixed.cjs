/* REA-087 BASE-N mixed radix regression coverage.
 * Run: node calculator/tests/rea087-base-mixed.cjs
 * Source-level checks; physical CASIO and end-to-end browser verification remain separate.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const B=require('../js/base-n.js');
let count=0;
function test(name,fn){try{fn();count++}catch(e){e.message=name+': '+e.message;throw e}}
const models=['fx-991es','fx-991es-plus','fx-991es-plus-c'];
for(const model of models){
 for(const [expression,base,expected] of [
  ['d:10+h:FF+b:101+o:7','DEC',277n],
  ['d10+hFF+b101+o7','DEC',277n],
  ['h:FF+b:1','HEX',256n],
  ['b:101+o:7','BIN',12n],
  ['h:FFFFFFFF+d:2','DEC',1n],
  ['-h:1+d:2','DEC',1n],
  ['-d:2+o:7','DEC',5n],
  ['Not(b:0)','DEC',-1n],
  ['Neg(d:4)','DEC',-4n],
  ['d:5 and h:3','DEC',1n],
  ['b:1010 xor h:0C','DEC',6n],
  ['d:2*(h:A+o:7)','DEC',34n],
  ['d:20/b:11','DEC',6n],
  ['D10+F','HEX',3359n],
  ['d:2147483647','DEC',2147483647n],
  ['-2147483648','DEC',-2147483648n],
  ['h:80000000','DEC',-2147483648n],
  ['b:1111111111111111','DEC',-1n],
  ['o:37777777777','DEC',-1n]
 ])test(model+' evaluates '+expression,()=>assert.equal(B.evaluate(expression,base,model),expected));
 test(model+' result in BIN keeps 16-bit range',()=>assert.throws(
  ()=>B.evaluate('h:FFFF+d:1','BIN',model),/Math ERROR/));
 test(model+' result in current HEX has eight positions',()=>assert.equal(
  B.format(B.evaluate('h:FFFFFFFF+d:2','HEX',model),'HEX',model),'00000001'));
 test(model+' result in current DEC signed',()=>assert.equal(
  B.format(B.evaluate('h:FFFFFFFF+d:2','DEC',model),'DEC',model),'1'));
 for(const expr of ['b:102','o:8','h:GG','d:1F','d:3+h:Q','h:','b:','d:','o:','1+', 'h:FFFFFFF00', 'd:2147483648']){
  test(model+' syntax or range rejects '+expr,()=>assert.throws(
   ()=>B.evaluate(expr,'DEC',model),/Syntax ERROR|Math ERROR/));
 }
 test(model+' divide by zero',()=>assert.throws(
  ()=>B.evaluate('d:5/b:0','DEC',model),/Math ERROR/));
 test(model+' signed overflow',()=>assert.throws(
  ()=>B.evaluate('d:2147483647+b:1','DEC',model),/Math ERROR/));
 test(model+' nested precedence',()=>assert.equal(
  B.evaluate('d:2+h:A*b:11','DEC',model),32n));
}
for(const [expr,selected,want] of [
 ['b:','DEC','BIN'],['d:7+h:FF','BIN','HEX'],
 ['o:17','HEX','OCT'],['d:123','OCT','DEC'],
 ['d:10+','DEC','DEC'],['h:FF+','BIN','BIN'],
 ['(b:1','DEC','BIN'],['h:FF)','DEC','DEC'],
 ['','HEX','HEX']
])test('keypad literal input context '+expr,()=>assert.equal(B.inputRadix(expr,selected),want));
test('menu has six logic and four second-page literal entries',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const menu=app.slice(app.indexOf('function baseLogicMenu(){'),app.indexOf('function baseHandle(key){'));
 for(const label of ['1. and','2. or','3. xor','4. xnor','5. Not(','6. Neg(',
  '1. d: (decimal)','2. h: (hex)','3. b: (binary)','4. o: (octal)'])
  assert.ok(menu.includes(label),label);
 assert.match(menu,/pageSize:6/);
 assert.match(menu,/item\.literal/);
 assert.match(menu,/source\+item\.token/);
});
test('base mode routes SHIFT+3 to multipage menu and maintains display radix',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const handler=app.slice(app.indexOf('function baseHandle(key){'),app.indexOf('// REA-051:',app.indexOf('function baseHandle(key){')));
 assert.match(handler,/state\.shift&&key==='3'/);
 assert.match(handler,/BASE\.inputRadix\(/);
 assert.match(handler,/state\.shift\|\|state\.alpha/);
 assert.match(handler,/BASE\.BASES\[activeRadix\]/);
 assert.match(handler,/activeRadix==='HEX'/);
 const calc=app.slice(app.indexOf('function baseCalculate(){'),app.indexOf('function baseLogicMenu(){'));
 assert.match(calc,/BASE\.evaluate\(expression,state\.baseRadix,state\.model\)/);
 assert.match(calc,/BASE\.format\(n,state\.baseRadix,state\.model\)/);
});
test('native menu supports page up/down and AC cancellation without evaluation',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const handler=app.slice(app.indexOf('function menuHandle(key){'),app.indexOf('function applyAdvancedResult(',app.indexOf('function menuHandle(key){')));
 assert.match(handler,/key==='AC'/);
 assert.match(handler,/key==='DOWN'\|\|key==='UP'/);
 assert.match(handler,/MENUS\.navigate/);
 assert.match(handler,/entry\.action\(\)/);
});
console.log('REA-087 PASS '+count+' mixed-radix, model, range and menu source checks (no hardware/browser claim)');
