#!/usr/bin/env node
/* PLUS-037 worker-level numerical verification: official-function reference
 * mathematics, argument bounds and browser-only finite PRODUCT extension.
 * This loads the actual worker script and its importScripts dependencies.
 * No native CASIO physical device claims.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../js');
const context={};
context.self=context;
let outgoing=[];
context.postMessage=message=>outgoing.push(message);
vm.createContext(context);
context.importScripts=(...names)=>{
 for(const name of names){
  const file=path.join(ROOT,name);
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:name});
 }
};
vm.runInContext(fs.readFileSync(path.join(ROOT,'numeric-worker.js'),'utf8'),
 context,{filename:'numeric-worker.js'});
let checks=0;
function run(kind,data,settings={}){
 outgoing=[];
 context.self.onmessage({data:{id:checks+1,task:{
  kind,data,settings:{model:'fx-991es-plus',angle:'DEG',format:'Norm1',
   digits:3,math:false,ans:0,preAns:0,memory:{},...settings}
 }}});
 A.equal(outgoing.length,1,'worker sends exactly one reply');
 checks++;
 return outgoing[0];
}
function near(label,result,want,eps=1e-5){
 A.equal(result.ok,true,label+': '+result.error);
 A.ok(Number.isFinite(result.value)&&Math.abs(result.value-want)<=eps,
  label+': '+result.value+' not within '+eps+' of '+want);
}
function fault(label,result,pattern){
 A.equal(result.ok,false,label);
 A.match(result.error,pattern,label);
}
near('SUM X 1..10',run('SUM',{expression:'X',a:'1',b:'10'}),55);
near('SUM X^2 1..5',run('SUM',{expression:'X^2',a:'1',b:'5'}),55);
near('SUM signed terms',run('SUM',{expression:'X',a:'-3',b:'3'}),0);
near('INTEGRAL X 0..1',run('INTEGRAL',{expression:'X',a:'0',b:'1',tol:'1E-5'}),.5);
near('INTEGRAL X^2 0..2',run('INTEGRAL',{expression:'X^2',a:'0',b:'2',tol:'1E-5'}),8/3);
near('INTEGRAL backwards',run('INTEGRAL',{expression:'X',a:'1',b:'0',tol:'1E-5'}),-.5);
near('DERIVATIVE X^2 at 3',run('DERIVATIVE',{expression:'X^2',at:'3',tol:'1E-10'}),6);
near('DERIVATIVE X^3 at 2',run('DERIVATIVE',{expression:'X^3',at:'2',tol:'1E-10'}),12);
near('PRODUCT factorial 5',run('PRODUCT',{expression:'X',a:'1',b:'5',step:'1'}),120);
near('PRODUCT odd factors',run('PRODUCT',{expression:'X',a:'1',b:'5',step:'2'}),15);
near('PRODUCT shifted factors',run('PRODUCT',{expression:'X+1',a:'0',b:'3',step:'1'}),24);
near('PRODUCT one term',run('PRODUCT',{expression:'X^2',a:'2',b:'2',step:'1'}),4);
let solved=run('SOLVE',{expression:'X^2=4',guess:'3'});
for(let i=0;i<10&&solved.continue;i++)
 solved=run('SOLVE',{expression:'X^2=4',guess:'3',resume:solved.resume});
near('SOLVE root near positive 2',solved,2,1e-7);
A.ok(Math.abs(solved.residual)<1e-7,'SOLVE residual nonzero');
fault('invalid SUM range',run('SUM',{expression:'X',a:'3',b:'1'}),/Argument ERROR/);
fault('bad PRODUCT zero step',run('PRODUCT',{expression:'X',a:'1',b:'5',step:'0'}),/Argument ERROR/);
fault('bad PRODUCT negative step',run('PRODUCT',{expression:'X',a:'1',b:'5',step:'-1'}),/Argument ERROR/);
fault('bad PRODUCT fractional step',run('PRODUCT',{expression:'X',a:'1',b:'5',step:'.5'}),/Argument ERROR/);
fault('bad PRODUCT too many iterations',run('PRODUCT',{expression:'X',a:'1',b:'20001',step:'1'}),/Argument ERROR/);
fault('bad PRODUCT overflow',run('PRODUCT',{expression:'10^99',a:'1',b:'2',step:'1'}),/Math ERROR/);
fault('bad SOLVE no variable',run('SOLVE',{expression:'2+3',guess:'1'}),/Variable ERROR/);
fault('invalid integral bound',run('INTEGRAL',{expression:'X',a:'1E11',b:'2',tol:'1E-5'}),/Argument ERROR/);
fault('unrecognized worker operation',run('JUNK',{expression:'X'}),/Argument ERROR/);
console.log('PLUS-037 PASS: '+checks+' real-worker message checks across SOLVE, calculus, SUM, PRODUCT and errors');
