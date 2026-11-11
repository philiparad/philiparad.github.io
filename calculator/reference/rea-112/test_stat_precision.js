'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const REG=require('../../js/stat-regression.js');
const app=fs.readFileSync(path.join(__dirname,'../../js/app.js'),'utf8');
const begin=app.indexOf('function statMenuResult(');
const end=app.indexOf('\nfunction statEstimate(',begin);
assert.ok(begin>=0&&end>begin);
const source=app.slice(begin,end);
let menu,selected,state;
const openMenu=new Function('REG','optionDialog','statSafe','state','statShow',
 source+'; return statMenuResult;');
function choose(title,values,paired,index){
 state={raw:null,ans:null,ansRational:'old',result:null};
 selected=null;
 const run=openMenu(REG,(name,options)=>{menu={name,options}},
  callback=>callback(),state,(lines,name)=>{selected={lines,name}});
 run(title,values,paired);
 menu.options[index].action();
 return {state,selected,menu};
}
const table=(xs,ys=null)=>({paired:ys!==null,frequency:false,
 rows:xs.map((X,i)=>({X,Y:ys?ys[i]:null,FREQ:1}))});
const summary=REG.summary(table([0,2]));
const v=choose('Var',summary,false,3);
assert.equal(v.state.ans,Math.SQRT2);
assert.equal(v.state.raw,Math.SQRT2);
assert.equal(v.state.ansRational,null);
assert.equal(v.selected.lines[0],'s X = 1.41421356237');
assert.notEqual(v.state.ans,Number('1.41421356237'));
assert.deepEqual(v.menu.options.map(x=>x.label),['1. n','2. Mean X','3. Sigma X','4. s X']);
const ordinary=REG.summary(table([1,3]));
assert.equal(choose('Sum',ordinary,false,1).state.ans,4);
assert.equal(choose('MinMax',ordinary,false,0).state.ans,1);
const paired=REG.summary(table([0,2],[1,3]));
assert.equal(choose('Var',paired,true,5).state.ans,1);
assert.equal(choose('Sum',paired,true,4).state.ans,6);
assert.equal(choose('MinMax',paired,true,3).state.ans,3);
const correlation=REG.fit(table([0,1,2],[0,1,3]),'LIN');
const reg=choose('Reg',correlation,true,2);
assert.equal(reg.state.ans,correlation.correlation);
assert.equal(reg.state.raw,correlation.correlation);
assert.notEqual(reg.state.ans,Number(REG.format(correlation.correlation)));
const quad=REG.fit(table([1,2,3],[1,4,9]),'QUAD');
assert.equal(choose('Reg',quad,true,2).state.ans,quad.C);
// Invalid display items continue to fail at selection time.
function errorSelect(title,values,paired,index){
 let options;
 const state={raw:'sentinel',ans:'sentinel'};
 let messages=0;
 const run=openMenu(REG,(name,o)=>{options=o},callback=>{
  try{callback()}catch(error){messages++;assert.match(error.message,/Math ERROR/)}
 },state,()=>{throw Error('must not display invalid result')});
 run(title,values,paired);
 options[index].action();
 assert.equal(messages,1);
 assert.equal(state.ans,'sentinel');
}
errorSelect('Sum',REG.summary(table([1e50,-1e50])),false,0);
errorSelect('Var',REG.summary(table([9e99,-9e99])),false,3);
errorSelect('Reg',{type:'LIN',A:2,B:1,correlation:null},true,2);
console.log('REA-112 full precision STAT selection tests passed');
