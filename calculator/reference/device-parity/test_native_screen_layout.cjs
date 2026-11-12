'use strict';
const assert=require('node:assert/strict');
const LCD=require('../../js/display.js');
const W=LCD.width,H=LCD.height;
const count=p=>Array.from(p).reduce((a,b)=>a+b,0);
const get=(p,x,y)=>p[y*W+x];
const render=(overrides={})=>LCD.rasterize({power:true,mode:'COMP',screen:'edit',input:'',...overrides});
const menu=(kind,title,labels,pageSize=6)=>({
 screen:'menu',menuKind:kind,menuTitle:title,menuPage:0,menuPageSize:pageSize,
 menuEntries:labels.map((label,i)=>({label,number:String(i+1)})),
 menu:labels.map((label,i)=>({label,number:String(i+1)}))
});
const modes=['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR'];
const pMode=render(menu('mode','MODE',modes.map((s,i)=>(i+1)+'. '+s),8));
assert.equal(get(pMode,0,0),0,'native MODE has no MODE header');
assert.equal(get(pMode,1,4),1,'mode menu first number box begins at x=1,y=4');
assert.equal(get(pMode,49,4),1,'second column boxed number');
assert.ok(count(pMode)>220,'native boxed menu renders all eight numbered entries');
const pEqn=render(menu('eqn-type','EQN type',['1. 2 unknowns','2. 3 unknowns','3. Quadratic','4. Cubic'],6));
assert.equal(get(pEqn,0,0),0,'EQN screen should not prepend a heading');
assert.ok(count(pEqn)>150,'EQN should draw four equation templates');
assert.ok(pEqn.slice(2*W,7*W).some(Boolean),'first algebraic equation');
assert.ok(pEqn.slice(23*W,29*W).some(Boolean),'fourth algebraic equation');
const pMat=render(menu('matrix','Matrix?',['1. MatA','2. MatB','3. MatC'],6));
assert.ok(count(pMat)>70,'Matrix? selector title and registers');
const pVec=render(menu('vector','Vector?',['1. VctA','2. VctB','3. VctC'],6));
assert.ok(count(pVec)>70,'Vector? selector title and registers');
const pDims=render(menu('matrix-dims','MatA(m×n) m×n?',
 ['1. 3x3','2. 3x2','3. 3x1','4. 2x3','5. 2x2','6. 2x1'],6));
assert.ok(count(pDims)>145,'first six descending dimension choices');
const pBase=render({mode:'BASE-N',screen:'edit',baseRadix:'DEC',input:''});
assert.equal(get(pBase,0,0),0,'native BASE-N places Dec above the right-hand result');
assert.ok(pBase.slice(18*W,25*W).some(Boolean),'Dec marker appears in lower-right area');
assert.ok(pBase.slice(25*W,31*W).some(Boolean),'zero in result line');
const pTable=render({mode:'TABLE',screen:'prompt',flow:{
 title:'TABLE f(X),g(X)',fields:[{id:'expression',label:'f(X)'}],index:0,buffer:''
}});
assert.equal(get(pTable,2,9),0,'f glyph starts with a clear pixel');
assert.ok(pTable.slice(9*W,15*W).some(Boolean),'TABLE first prompt f(X)=');
assert.equal(pTable.slice(0,8*W).reduce((a,b)=>a+b,0),0,'TABLE blank formula has no engineering title');
console.log('PLUS C emulator-derived LCD menu and prompt geometry checks passed');
