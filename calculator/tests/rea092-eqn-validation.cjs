'use strict';
/* REA-092. Run node calculator/tests/rea092-eqn-validation.cjs */
const a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../js/equation-engine.js'),D=require('../js/eqn-coeff-editor.js'),X=require('../js/eqn-exact.js');
let count=0;
function check(label,fn){try{fn();count++}catch(e){e.message=label+': '+e.message;throw e}}
function near(x,y){a.ok(Number.isFinite(x)&&Math.abs(x-y)<1e-9*Math.max(1,Math.abs(y)),x+' != '+y)}
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 check(model+' four types',()=>a.deepEqual(E.TYPES.map(x=>x.id),['LINEAR2','LINEAR3','QUAD','CUBIC']));
 check(model+' 2 unknowns',()=>{const z=E.systems([[1,1,2],[1,-1,0]]);a.deepEqual(z.solutions.map(x=>x.label),['X','Y']);z.solutions.forEach(x=>near(x.value,1))});
 check(model+' 3 unknowns',()=>{const z=E.systems([[1,1,1,6],[1,-1,1,2],[2,1,-1,1]]);a.deepEqual(z.solutions.map(x=>x.label),['X','Y','Z']);z.solutions.forEach((x,i)=>near(x.value,i+1))});
 check(model+' no solution',()=>a.equal(E.systems([[1,1,2],[1,1,3]]).status,'No Solution'));
 check(model+' infinite',()=>a.equal(E.systems([[1,1,2],[2,2,4]]).status,'Infinite Solutions'));
 check(model+' rational quadratic',()=>a.deepEqual(X.decorate(E.quadratic([2,-3,1]),[2,-3,1]).solutions.map(x=>X.display(x,true)),['1/2','1']));
 check(model+' irrational MathIO',()=>{const z=X.decorate(E.quadratic([1,0,-2]),[1,0,-2]).solutions;a.deepEqual(z.map(x=>X.display(x,true)),['-√2','√2']);a.ok(z.every(x=>!X.display(x,false).includes('√')))});
 check(model+' non-real quadratic',()=>{const z=X.decorate(E.quadratic([1,0,1]),[1,0,1]);a.equal(z.nonRealCount,2);a.deepEqual(z.solutions.map(x=>X.display(x,true)),['i','-i']);a.deepEqual(z.solutions.map(x=>X.display(x,false)),['0+1i','0-1i'])});
 check(model+' repeated quadratic',()=>{const z=E.quadratic([1,-2,1]);a.equal(z.solutions.length,1);near(z.solutions[0].value,1)});
 check(model+' documented cubic order',()=>{const z=E.cubic([1,-2,-1,2]);[-1,2,1].forEach((v,i)=>near(z.solutions[i].value,v))});
 check(model+' repeated cubic',()=>{const z=E.cubic([1,-3,3,-1]);a.equal(z.solutions.length,1);near(z.solutions[0].value,1)});
 check(model+' complex cubic',()=>{const z=E.cubic([1,0,0,1]);a.equal(z.nonRealCount,2);near(z.solutions[0].value,-1);near(z.solutions[1].complex.im,Math.sqrt(3)/2);near(z.solutions[2].complex.im,-Math.sqrt(3)/2)});
 for(const type of E.TYPES){
  check(model+' solve '+type.id,()=>{const values=Object.fromEntries(type.fields.map(k=>[k,1]));values[type.fields[0]]=2;a.equal(E.solve(type.id,values).type,type.id)});
  check(model+' editor '+type.id,()=>{const e=D.create(type.id),keys=D.FIELDS[type.id].flat();D.enter(e,'7');D.next(e);a.equal(e.values[keys[0]],7);a.equal(D.current(e),keys[1]);D.move(e,0,-1);a.equal(D.current(e),keys[0]);D.clear(e);a.ok(keys.every(k=>e.values[k]===0))});
  check(model+' corrected coefficient '+type.id,()=>{const e=D.create(type.id);for(const t of '2.5')D.enter(e,t);D.sign(e);D.commit(e);near(e.values[D.current(e)],-2.5);D.enter(e,'9');D.backspace(e);a.throws(()=>D.commit(e),/Syntax ERROR/)});
 }
 for(const f of [()=>E.quadratic([0,1,2]),()=>E.cubic([0,1,2,3]),()=>E.solve('MISSING',{})])check(model+' invalid input',()=>a.throws(f,/ERROR/));
}
check('= exits final page but arrows clamp at final page',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 for(const re of [/function eqnPage\(delta,exitAtEnd=false\)/,/key==='EQUAL'\)\{eqnPage\(1,true\)/,/key==='DOWN'\|\|key==='RIGHT'\)\{eqnPage\(1\)/,/key==='UP'\|\|key==='LEFT'\)\{eqnPage\(-1\)/,/Math\.min\(e\.solutions\.length-1,e\.index\+delta\)/])a.match(s,re);
});
check('MathIO LineIO and error/cancel editor routes',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 for(const re of [/EQEX\.display\(first,state\.math\)/,/EQEX\.display\(e\.solutions\[e\.index\],state\.math\)/,/if\(key==='AC'\)\{EQEDIT\.restore\(state\.eqnEditor\)/,/if\(key==='DEL'\)\{EQEDIT\.backspace\(e\)/])a.match(s,re);
});
console.log('REA-092 PASS '+count+' isolated source checks; browser/hardware not run');
