#!/usr/bin/env node
/* PLUS-006: 30 independent coefficients-and-roots cases for each EQN type. */
'use strict';
const assert=require('node:assert/strict');
require('../js/math-engine.js');
const D=require('../js/eqn-coeff-editor.js'),E=require('../js/equation-engine.js');
const ctx={model:'fx-991es-plus',angle:'DEG',memory:{}};
const close=(a,b)=>(Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(b)));
function write(e,text){
 for(const token of String(text).match(/sqrt\(|cbrt\(|sin\(|cos\(|tan\(|log\(|ln\(|exp\(|Ans|\^2|./g)||[])D.enter(e,token);
}
function fill(type,coefficients){
 const editor=D.create(type),names=D.FIELDS[type].flat();
 assert.equal(coefficients.length,names.length);
 coefficients.forEach((value,index)=>{
  write(editor,value);
  const finished=D.next(editor,ctx);
  assert.equal(finished,index===names.length-1);
 });
 return E.solve(type,editor.values);
}
const expected=(out,roots)=>{const values=out.solutions.map(x=>x.value).sort((a,b)=>a-b),want=[...roots].sort((a,b)=>a-b);assert.equal(values.length,want.length);values.forEach((v,i)=>assert.ok(close(v,want[i]),out.type+': '+v+' != '+want[i]))};
for(let k=0;k<30;k++){
 const x=k-15,y=15-2*k;
 const line=fill('LINEAR2',['sqrt(9)/3','1',String(x+y),'1','-1',String(x-y)]);
 expected(line,[x,y]);
 const a=k-11,b=k%7-3,c=(k%9)-4;
 const triple=fill('LINEAR3',['2/2','0','0',String(a),
  '0','3^0','0',String(b),'0','0','sqrt(4)/2',String(c)]);
 expected(triple,[a,b,c]);
 const r1=-(k%10+1),r2=k%7+2;
 const quad=fill('QUAD',['1+0',String(-(r1+r2)),String(r1*r2)]);
 expected(quad,[r1,r2]);
 const u=-(k%5+1),v=k%7+2;
 const cub=fill('CUBIC',['sqrt(4)/2',String(-(u+v)),String(u*v),'0']);
 expected(cub,[u,0,v]);
}
for(const [expr,number] of [['2+3*4',14],['sqrt(9)',3],['sqrt(9',3],
 ['1/3+1/6',.5],['sin(30)',.5],['2^3',8],['1E-3',.001]]){
 assert.ok(close(D.parse(expr,ctx),number),expr);
}
const e=D.create('QUAD');
write(e,'12+34');assert.equal(e.cursor,5);
D.caret(e,-1);D.caret(e,-1);D.backspace(e);assert.equal(e.buffer,'1234');
D.enter(e,'+');assert.equal(e.buffer,'12+34');D.commit(e,ctx);assert.equal(e.values.a,46);
D.clear(e);write(e,'sqrt(-1)');
assert.throws(()=>D.commit(e,ctx),/Math ERROR/);
assert.equal(e.values.a,0,'invalid edit must not write coefficient');
console.log('PLUS-006 PASS: 120 EQN solutions, 7 expression forms, caret and error atomicity');
