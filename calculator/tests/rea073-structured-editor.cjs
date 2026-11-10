/* REA-073 — natural textbook editor and result serialization.
 * Run: node calculator/tests/rea073-structured-editor.cjs
 * This is independent source validation, not exact CASIO firmware parity.
 */
'use strict';
const assert=require('node:assert/strict');
const E=require('../js/structured-editor.js');
const M=require('../js/math-engine.js');
const V=require('../js/lcd-viewport.js');
const L=require('../js/display.js');
const K=require('../js/keyboard.js');
const fs=require('node:fs'),path=require('node:path');
let n=0;
function check(name,fn){try{fn();n++}catch(err){err.message=name+': '+err.message;throw err}}
function equal(a,b){assert.deepEqual(a,b)}
function numerical(e,want){const got=M.evaluate(E.serialize(e,true));assert.ok(Math.abs(got-want)<1e-9,got+' != '+want)}
function fraction(numerator,denominator){
 const e=E.create();E.insert(e,numerator);E.template(e,'fraction');
 E.insert(e,denominator);return e;
}
check('whole numeral captured as numerator',()=>numerical(fraction('12','3'),4));
check('parenthesized expression captured',()=>numerical(fraction('(1+2)','3'),1));
check('atomic variable captured',()=>{
 const e=fraction('X','3');equal(E.serialize(e,true),'((X)/(3))');
});
check('fraction after a binary operator captures only operand',()=>{
 const e=fraction('4+12','3');equal(E.serialize(e,true),'4+((12)/(3))');numerical(e,8);
});
check('root attached to fraction',()=>{
 const e=E.create();E.template(e,'squareRoot');E.insert(e,'16');
 E.navigate(e,'RIGHT');E.template(e,'fraction');E.insert(e,'2');numerical(e,2);
});
check('power attached to fraction',()=>{
 const e=E.create();E.insert(e,'2');E.template(e,'power');E.insert(e,'3');
 E.navigate(e,'RIGHT');E.template(e,'fraction');E.insert(e,'2');numerical(e,4);
});
check('denominator backspace preserves absorbed numerator',()=>{
 const e=E.create();E.insert(e,'12');E.template(e,'fraction');
 E.backspace(e);equal(E.serialize(e,true),'12');equal(E.cursor(e),{path:[],offset:2});
});
check('nested fraction',()=>{
 const e=E.create();E.template(e,'fraction');E.insert(e,'1');
 E.template(e,'fraction');E.insert(e,'2');
 E.navigate(e,'RIGHT');E.navigate(e,'RIGHT');E.insert(e,'3');numerical(e,1/6);
});
check('mixed fraction slots',()=>{
 const e=E.create();E.template(e,'mixed');
 E.insert(e,'2');E.navigate(e,'RIGHT');
 E.insert(e,'1');E.navigate(e,'RIGHT');E.insert(e,'4');numerical(e,2.25);
});
check('negative mixed number sign',()=>{
 const e=E.create();E.template(e,'mixed');
 E.insert(e,'-2');E.navigate(e,'RIGHT');
 E.insert(e,'1');E.navigate(e,'RIGHT');E.insert(e,'4');numerical(e,-2.25);
});
check('cube root',()=>{
 const e=E.create();E.template(e,'cubeRoot');E.insert(e,'27');numerical(e,3);
});
check('nth root nested inside fraction',()=>{
 const e=E.create();E.template(e,'nthRoot');E.insert(e,'3');E.navigate(e,'RIGHT');
 E.insert(e,'8');E.navigate(e,'RIGHT');E.template(e,'fraction');E.insert(e,'2');numerical(e,1);
});
check('logarithm base template',()=>{
 const e=E.create();E.template(e,'logBase');E.insert(e,'2');E.navigate(e,'RIGHT');
 E.insert(e,'8');numerical(e,3);
});
check('empty required slot fails strictly',()=>{
 const e=E.create();E.template(e,'fraction');E.insert(e,'4');
 assert.equal(E.isComplete(e),false);
 assert.throws(()=>E.serialize(e,true),/missing denominator/);
});
check('left and right cross nested fields',()=>{
 const e=fraction('9','3');E.navigate(e,'LEFT');E.navigate(e,'LEFT');
 equal(E.cursor(e).path.at(-1).field,'numerator');
 E.navigate(e,'RIGHT');E.navigate(e,'RIGHT');
 equal(E.cursor(e).path.at(-1).field,'denominator');
});
check('vertical navigation leaves same slot unchanged',()=>{
 const e=fraction('9','3');
 assert.equal(E.navigate(e,'DOWN'),false);
 assert.equal(E.navigate(e,'UP'),true);
 equal(E.cursor(e).path.at(-1).field,'numerator');
});
check('undo returns to previous insertion',()=>{
 const e=E.create();E.insert(e,'2');E.template(e,'squareRoot');
 E.insert(e,'4');equal(E.serialize(e),'2sqrt(4)');
 assert.equal(E.undo(e),true);equal(E.serialize(e),'2sqrt(?)');
 assert.equal(E.undo(e),true);equal(E.serialize(e),'2');
 assert.equal(E.undo(e),true);equal(E.serialize(e),'');
 assert.equal(E.undo(e),false);
});
check('undo restores template after DEL',()=>{
 const e=fraction('12','3');E.backspace(e);assert.equal(E.undo(e),true);
 numerical(e,4);
});
check('undo is bounded at 40 entries',()=>{
 const e=E.create();for(let i=0;i<52;i++)E.insert(e,'1');
 equal(e.undoStack.length,40);
});
check('overwrite cannot destroy structured node',()=>{
 const e=E.create();E.template(e,'squareRoot');E.insert(e,'9');
 E.navigate(e,'RIGHT');E.navigate(e,'LEFT');E.insert(e,'2',true);
 assert.ok(E.serialize(e).includes('sqrt('));
});
check('MathIO INS incorporates parenthesized expression into square root',()=>{
 const e=E.fromString('1+(2+3)+4');
 for(let i=0;i<7;i++)E.navigate(e,'LEFT');
 assert.equal(E.incorporate(e,'squareRoot'),true);
 equal(E.serialize(e,true),'1+sqrt((2+3))+4');
 numerical(e,1+Math.sqrt(5)+4);
});
check('MathIO INS incorporates existing numeral into fraction',()=>{
 const e=E.fromString('1+12+3');
 for(let i=0;i<4;i++)E.navigate(e,'LEFT');
 assert.equal(E.incorporate(e,'fraction'),true);
 equal(E.cursor(e).path.at(-1).field,'denominator');
 E.insert(e,'4');
 equal(E.serialize(e,true),'1+((12)/(4))+3');
 numerical(e,7);
});
check('MathIO INS failure does not mutate expression',()=>{
 const e=E.fromString('2+3'),before=E.serialize(e);
 assert.equal(E.incorporate(e,'squareRoot'),false);
 equal(E.serialize(e),before);
});
check('MathIO INS undo restores absorbed expression and caret',()=>{
 const e=E.fromString('(2+3)');
 for(let i=0;i<5;i++)E.navigate(e,'LEFT');
 const before=E.cursor(e);
 assert.equal(E.incorporate(e,'squareRoot'),true);
 assert.equal(E.undo(e),true);
 equal(E.serialize(e),'(2+3)');
 equal(E.cursor(e),before);
});
check('controller distinguishes MathIO INS from LineIO overwrite',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/if\(state\.math&&state\.mode==='COMP'\)/);
 assert.match(app,/STRUCT\.incorporate\(state\.editor,type\)/);
});
check('viewport follows nested cursor',()=>{
 const e=E.create();E.template(e,'fraction');E.template(e,'nthRoot');E.insert(e,'3');
 E.navigate(e,'RIGHT');E.insert(e,'8');
 const follow=V.follow(e);assert.ok(Number.isFinite(follow.x)&&Number.isFinite(follow.y));
 assert.ok(follow.frame.cursor&&Number.isFinite(follow.frame.cursor.y));
});
check('LCD renders distinct nested field cursor',()=>{
 const e=fraction('12','3');
 const base={power:true,math:true,mode:'COMP',screen:'edit',editor:e,
  viewport:{inputX:0,inputY:0},input:E.serialize(e),cursor:0};
 const d=Array.from(L.rasterize(base));
 E.navigate(e,'UP');
 const u=Array.from(L.rasterize(base));
 assert.notDeepEqual(d,u);
});
check('Ctrl+Z only on focused calculator, not external input',()=>{
 const face={closest:q=>q==='#face'?{}:null};
 const result=K.translate({key:'z',ctrlKey:true,shiftKey:false,target:face},{screen:'edit',math:true});
 equal(result.keys,['UNDO']);
 assert.equal(K.translate({key:'z',ctrlKey:true,target:{closest:q=>q==='input,textarea,select,[contenteditable],[role="textbox"]'?{}:null}},{screen:'edit'}),null);
});
check('controller routes UNDO and guards mode',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 new Function(s);assert.match(s,/if\(key==='UNDO'\)/);assert.match(s,/STRUCT\.undo\(state\.editor\)/);
});
console.log('REA-073 PASS '+n+' structured editing, math, cursor and undo tests');
