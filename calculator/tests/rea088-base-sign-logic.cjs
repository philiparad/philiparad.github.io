/* REA-088: BASE-N sign, bitwise operations, precedence and boundaries.
 * Run: node calculator/tests/rea088-base-sign-logic.cjs
 * Manufacturer manual pp. E-53–55 and E-66–67.
 * This validates the independent software model, not physical hardware parity.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const BASE=require('../js/base-n.js');
let count=0;
function test(name,callback){try{callback();count++}catch(e){e.message=name+': '+e.message;throw e}}
const models=['fx-991es','fx-991es-plus','fx-991es-plus-c'];
for(const model of models){
 const binaries=[
  ['1010 and 1100','BIN',8n],
  ['1010 or 1100','BIN',14n],
  ['1010 xor 1100','BIN',6n],
  ['1010 xnor 1100','BIN',-7n],
  ['Not(1010)','BIN',-11n],
  ['Neg(1010)','BIN',-10n],
  ['Not(0)','BIN',-1n],
  ['Neg(0)','BIN',0n],
  ['Not(1111111111111111)','BIN',0n],
  ['Not(0)','HEX',-1n],
  ['Neg(1)','HEX',-1n],
  ['1 and 3','DEC',1n],
  ['1 or 2','DEC',3n],
  ['1 xor 3','DEC',2n],
  ['1 xnor 3','DEC',-3n],
  ['Not(0)','DEC',-1n],
  ['Neg(2)','DEC',-2n],
  ['1 or 1 xor 1','DEC',0n],
  ['1 xor 1 or 1','DEC',1n],
  ['1 or 1 xnor 1','DEC',-1n],
  ['1 xnor 1 or 0','DEC',-1n],
  ['1 and 3 xor 2','DEC',3n],
  ['1 xor 2 and 0','DEC',1n],
  ['1+2 and 3','DEC',3n],
  ['2*3 xor 1','DEC',7n],
  ['(1 or 1) xor 1','DEC',0n],
  ['1 or (1 xor 1)','DEC',1n],
  ['1 xnor 0 xor 1','DEC',-1n],
  ['d:5 and h:3','DEC',1n],
  ['b:1010 xor h:C','DEC',6n]
 ];
 for(const [expr,rad,want] of binaries)test(model+' '+expr+' '+rad,()=>assert.equal(BASE.evaluate(expr,rad,model),want));
 const boundaries=[
  ['BIN','0111111111111111',32767n],
  ['BIN','1000000000000000',-32768n],
  ['BIN','1111111111111111',-1n],
  ['OCT','17777777777',2147483647n],
  ['OCT','20000000000',-2147483648n],
  ['OCT','37777777777',-1n],
  ['HEX','7FFFFFFF',2147483647n],
  ['HEX','80000000',-2147483648n],
  ['HEX','FFFFFFFF',-1n],
  ['DEC','2147483647',2147483647n],
  ['DEC','-2147483648',-2147483648n]
 ];
 for(const [rad,expr,want] of boundaries)test(model+' boundary '+rad+expr,()=>{
  assert.equal(BASE.evaluate(expr,rad,model),want);
  if(!expr.startsWith('-'))assert.equal(BASE.parseLiteral(expr,rad,model),want);
 });
 // Sign extension & round-trip, 16-bit vs 32-bit display
 for(const [rad,value,want] of [
  ['BIN',-1n,'1111111111111111'],
  ['BIN',-32768n,'1000000000000000'],
  ['BIN',32767n,'0111111111111111'],
  ['OCT',-1n,'37777777777'],
  ['OCT',-2147483648n,'20000000000'],
  ['HEX',-1n,'FFFFFFFF'],
  ['HEX',-2147483648n,'80000000'],
  ['HEX',2147483647n,'7FFFFFFF'],
  ['DEC',-2147483648n,'-2147483648']
 ])test(model+' signed display '+rad+' '+value,()=>assert.equal(BASE.format(value,rad,model),want));
 for(const [rad,expr] of [
  ['BIN','10000000000000000'],
  ['HEX','100000000'],
  ['OCT','40000000000'],
  ['DEC','2147483648'],
  ['DEC','-2147483649'],
  ['DEC','2147483647+1'],
  ['DEC','-2147483648-1'],
  ['BIN','0111111111111111+1'],
  ['DEC','1/0']
 ])test(model+' range error '+rad+' '+expr,()=>assert.throws(()=>BASE.evaluate(expr,rad,model),/Math ERROR/));
 for(const [rad,expr] of [['BIN','102'],['OCT','18'],['DEC','1F'],['HEX','FG']])
  test(model+' invalid digit '+rad+expr,()=>assert.throws(()=>BASE.evaluate(expr,rad,model),/Syntax ERROR/));
 test(model+' binary width is 16',()=>assert.equal(BASE.bits('BIN',model),16));
 for(const rad of ['OCT','DEC','HEX'])
  test(model+' '+rad+' width is 32',()=>assert.equal(BASE.bits(rad,model),32));
 test(model+' BIN conversion guard',()=>assert.throws(()=>BASE.convert(32768n,'BIN',model),/Math ERROR/));
 test(model+' 32bit signed conversion guard',()=>assert.throws(()=>BASE.convert(2147483648n,'HEX',model),/Math ERROR/));
 test(model+' truncating integer divide',()=>assert.equal(BASE.evaluate('7/2','DEC',model),3n));
 test(model+' negative integer divide',()=>assert.equal(BASE.evaluate('(-7)/2','DEC',model),-3n));
}
test('operator grouping matches CASIO priority 10/11',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/base-n.js'),'utf8');
 assert.match(code,/op==='or'\|\|op==='xor'\|\|op==='xnor'\?10/);
 assert.match(code,/op==='and'\?15/);
});
test('menu supports the six documented logic entries, cancel, and paging',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const menu=code.slice(code.indexOf('function baseLogicMenu(){'),code.indexOf('function baseHandle(key){'));
 for(const label of ['1. and','2. or','3. xor','4. xnor','5. Not(','6. Neg('])
  assert.ok(menu.includes(label),label);
 assert.match(menu,/fromResult\?previous:state\.input/);
 const handler=code.slice(code.indexOf('function menuHandle(key){'),code.indexOf('function applyAdvancedResult(',code.indexOf('function menuHandle(key){')));
 assert.match(handler,/key==='AC'/);
 assert.match(handler,/MENUS\.navigate/);
});
test('BASE-N SHIFT and ALPHA routes checked before normal digit input',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const h=code.slice(code.indexOf('function baseHandle(key){'),code.indexOf('// REA-051:',code.indexOf('function baseHandle(key){')));
 assert.match(h,/if\(key==='SHIFT'\)/);
 assert.match(h,/if\(key==='ALPHA'\)/);
 assert.match(h,/if\(state\.shift&&key==='3'\)\{baseLogicMenu\(\);return\}/);
 assert.match(h,/if\(state\.shift\|\|state\.alpha\)/);
 assert.match(h,/if\(key==='AC'\)/);
 assert.match(h,/if\(key==='DEL'\)/);
});
console.log('REA-088 PASS '+count+' source tests; browser/hardware traces not run');
