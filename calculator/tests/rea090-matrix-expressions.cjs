/* REA-090: MATRIX expression and MatAns regression suite.
 * Run: node calculator/tests/rea090-matrix-expressions.cjs
 * Source-level only: browser and physical CASIO tests remain outstanding.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../js/matrix-registers.js');
let passed=0;
function test(title,fn){try{fn();passed++}catch(e){e.message=title+': '+e.message;throw e}}
function close(a,b){assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),a+' != '+b)}
function setup(){const s=M.store();M.set(s,'MatA',M.create(2,2,[[1,2],[3,4]]));
 M.set(s,'MatB',M.create(2,2,[[5,6],[7,8]]));M.set(s,'MatC',M.identity(2));return s}
function matrix(s,expr,want){
 const result=M.expression(s,expr);
 assert.ok(result&&result.data);result.data.flat().forEach((v,i)=>close(v,want[i]));
 assert.deepEqual(result.data,s.MatAns.data);
}
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 const s=setup();
 for(const [expr,want] of [
  ['MatA+MatB',[6,8,10,12]],['MatA-MatB',[-4,-4,-4,-4]],
  ['MatA*MatB',[19,22,43,50]],['MatA+MatB*MatC',[6,8,10,12]],
  ['(MatA+MatB)*MatC',[6,8,10,12]],['Trn(MatA)',[1,3,2,4]],
  ['Trn(MatA+MatB)',[6,10,8,12]],['MatA^2',[7,10,15,22]],
  ['MatA^0',[1,0,0,1]],['MatA^-1',[-2,1,1.5,-.5]],
  ['2*MatA',[2,4,6,8]],['MatA*2',[2,4,6,8]],
  ['(MatA+MatB)*2',[12,16,20,24]],['-MatA',[-1,-2,-3,-4]]
 ])test(model+' '+expr,()=>matrix(s,expr,want));
 test(model+' MatAns follow-on',()=>{
  matrix(s,'MatA*MatB',[19,22,43,50]);matrix(s,'MatAns+MatC',[20,22,43,51]);
 });
 for(const [expr,want] of [['det(MatA)',-2],['Abs(MatA)',2],
  ['det(Trn(MatA))',-2],['2+3*4',14],['det(MatA)*2',-4]])
 test(model+' scalar '+expr,()=>close(M.expression(s,expr),want));
 test(model+' scalar result preserves MatAns',()=>{
  matrix(s,'MatB',[5,6,7,8]);const before=JSON.stringify(s.MatAns);
  close(M.expression(s,'det(MatA)'),-2);assert.equal(JSON.stringify(s.MatAns),before);
 });
 for(const expr of ['MatA+','MatA+MatUnknown','MatA^0.5','MatA+2',
  'MatA/MatB','det(MatA+)','Trn(2)','MatA^100','MatA+(', 'MatAns*MatMissing'])
 test(model+' atomic '+expr,()=>{
  const snapshot=JSON.stringify(s);
  assert.throws(()=>M.expression(s,expr),/ERROR/);
  assert.equal(JSON.stringify(s),snapshot);
 });
 test(model+' dimension error atomic',()=>{
  M.set(s,'MatC',M.create(3,1,[[1],[2],[3]]));
  const snapshot=JSON.stringify(s);
  assert.throws(()=>M.expression(s,'MatA+MatC'),/Dimension ERROR/);
  assert.equal(JSON.stringify(s),snapshot);
 });
 test(model+' singular inverse atomic',()=>{
  M.set(s,'MatC',M.create(2,2,[[1,2],[2,4]]));
  const snapshot=JSON.stringify(s);
  assert.throws(()=>M.expression(s,'MatC^-1'),/Math ERROR/);
  assert.equal(JSON.stringify(s),snapshot);
 });
 test(model+' history size',()=>{
  for(let k=0;k<35;k++)M.expression(s,'MatA');
  assert.equal(s.history.length,M.MAX_HISTORY);
 });
}
test('engine exposes expression method',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/matrix-registers.js'),'utf8');
 assert.match(s,/function expression\(state,source\)/);
 assert.match(s,/absolute,record,copy,expression/);
});
test('controller expression calculation and result chaining',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 for(const fragment of ['function matrixExpressionHandle(key)',
  'MATRIX.expression(state.matrices,source)',
  "state.screen==='matrix-expression'",
  "matrixExpressionInput(state.matrixView.name+chaining[key])",
  "matrixShow('MatAns',result)","label:'Expression'"]){
  assert.ok(s.includes(fragment),fragment);
 }
});
test('controller symbols, cancel and edit',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const start=s.indexOf('function matrixExpressionSymbols(){');
 const stop=s.indexOf('function matrixResultHandle(key){',start);
 const b=s.slice(start,stop);
 for(const x of ['MatA','MatB','MatC','MatAns','det(','Trn(','Abs(',
  "key==='AC'","key==='DEL'","state.shift&&key==='4'"])
  assert.ok(b.includes(x),x);
});
console.log('REA-090 PASS '+passed+' source-level checks; browser/hardware unverified');
