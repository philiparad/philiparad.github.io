/* REA-104 — original STAT normalized variate X▶t, not a Student t test.
 * Run: node calculator/tests/rea104-stat-normalized-t.cjs
 * Source test only: does not certify CASIO hardware or physical key parity.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const M=require('../js/math-engine.js'),REG=require('../js/stat-regression.js'),N=require('../js/stat-normal.js');
const APP=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const options={model:'fx-991es',mode:'STAT',statOriginalDistr:true};
let passed=0;
const check=(label,fn)=>{try{fn();passed++}catch(e){e.message=label+': '+e.message;throw e}};
const near=(x,y)=>assert.ok(Number.isFinite(x)&&Math.abs(x-y)<1e-11*Math.max(1,Math.abs(y)),x+' != '+y);
const data=(xs,weights)=>({paired:false,frequency:!!weights,regressionType:'1VAR',rows:xs.map((X,i)=>({X,Y:null,FREQ:weights?weights[i]:1}))});
const cases=[
 [data([2,4,6]),6,1.224744871391589],
 [data([2,4,6]),2,-1.224744871391589],
 [data([2,4,6]),4,0],
 [data([1,3,5],[1,3,2]),5,1.2126781251816647],
 [data([-5,0,5],[1,2,1]),-5,-Math.SQRT2],
 [data([10,20],[1,3]),10,-Math.sqrt(3)],
 [data([10,20],[1,3]),20,1/Math.sqrt(3)],
 [data([-9,1,7],[1,2,1]),1,0.17407765595569785]
];
for(let i=0;i<cases.length;i++){
 const [table,x,want]=cases[i],summary=REG.summary(table),opts={...options,statSummary:summary};
 check(i+' source normalization',()=>near(M.evaluate(x+'▶t',opts),want));
 check(i+' module normalization',()=>near(N.normalized(x,summary),want));
 check(i+' population standard deviation',()=>near(summary.sdX,Math.sqrt(summary.varianceX)));
 check(i+' Ans▶t',()=>near(M.evaluate('Ans▶t',{...opts,ans:x}),want));
 for(const kind of ['P','Q','R']){
  check(i+' '+kind+' chained normalized',()=>near(M.evaluate(kind+'('+x+'▶t)',opts),N.calculate(kind,want)));
 }
 check(i+' P+R normalized identity',()=>near(M.evaluate('P('+x+'▶t)+R('+x+'▶t)',opts),1));
}
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c'])
 for(const mode of ['COMP','STAT','CMPLX','TABLE'])
  for(const flag of [false,true]){
   const o={model,mode,statOriginalDistr:flag,statSummary:{meanX:4,sdX:2}};
   check('edition '+model+' '+mode+' '+flag,()=>{
    if(model==='fx-991es'&&mode==='STAT'&&flag)near(M.evaluate('6▶t',o),1);
    else assert.throws(()=>M.evaluate('6▶t',o),/Argument ERROR/);
   });
  }
for(const summary of [null,{meanX:2,sdX:0},{meanX:2,sdX:-1},
 {meanX:NaN,sdX:1},{meanX:2,sdX:NaN},{meanX:Infinity,sdX:1}]){
 check('invalid summary '+JSON.stringify(summary),()=>assert.throws(
  ()=>M.evaluate('4▶t',{...options,statSummary:summary}),/Math ERROR/));
}
for(const src of ['▶t','(2+)▶t']){
 check('malformed postfix '+src,()=>assert.throws(
  ()=>M.evaluate(src,{...options,statSummary:{meanX:2,sdX:1}}),/Syntax ERROR/));
}
check('zero-variance sample',()=>{
 const summary=REG.summary(data([3,3,3]));
 assert.equal(summary.sdX,0);
 assert.throws(()=>M.evaluate('3▶t',{...options,statSummary:summary}),/Math ERROR/);
});
check('single observation',()=>{
 const summary=REG.summary(data([3]));
 assert.equal(summary.sdX,0);
 assert.throws(()=>M.evaluate('3▶t',{...options,statSummary:summary}),/Math ERROR/);
});
check('zero-frequency entries excluded',()=>{
 const summary=REG.summary(data([2,4,6,100],[1,1,1,0]));
 near(M.evaluate('6▶t',{...options,statSummary:summary}),Math.sqrt(1.5));
});
check('frequency edit changes normalization',()=>{
 const table=data([1,3,5],[1,1,1]);let summary=REG.summary(table);
 const before=M.evaluate('5▶t',{...options,statSummary:summary});
 table.rows[1].FREQ=5;summary=REG.summary(table);
 const after=M.evaluate('5▶t',{...options,statSummary:summary});
 assert.notEqual(before,after);
 near(after,(5-summary.meanX)/summary.sdX);
});
check('calculation leaves observations unchanged',()=>{
 const table=data([2,4,6],[1,2,3]),original=JSON.stringify(table);
 M.evaluate('6▶t',{...options,statSummary:REG.summary(table)});
 assert.equal(JSON.stringify(table),original);
});
const first=APP.indexOf('function statDistr(){'),last=APP.indexOf('function originalStatEstimate(item){',first);
const menuBody=APP.slice(first,last);
check('menu option 4 inserts postfix',()=>{
 assert.ok(first>=0&&last>first);
 assert.match(menuBody,/action:\(\)=>originalStatTInput\(\)/);
 assert.match(menuBody,/function originalStatTInput\(\)/);
 assert.match(menuBody,/insert\('▶t'\)/);
});
function harness(state,record){
 return new Function('state','releaseModifier','optionDialog','notify','paint','STRUCT','syncEditor','insert',
 menuBody+';return {statDistr,originalStatTInput};')(
 state,()=>{},(_,entries)=>{record.entries=entries},()=>{record.warned=true},()=>{},
 {create:()=>({fresh:true})},()=>{},text=>record.inserted.push(text));
}
check('edit mode retains expression before postfix',()=>{
 const state={model:'fx-991es',mode:'STAT',statTable:{paired:false,regressionType:'1VAR'},
  screen:'menu',menuReturnScreen:'edit',editor:{previous:'6'}};
 const record={inserted:[]},route=harness(state,record);route.statDistr();
 assert.equal(record.entries.length,4);
 record.entries[3].action();
 assert.deepEqual(record.inserted,['▶t']);
 assert.deepEqual(state.editor,{previous:'6'});
});
check('result mode converts Ans to normalized input',()=>{
 const state={model:'fx-991es',mode:'STAT',statTable:{paired:false,regressionType:'1VAR'},
  screen:'menu',menuReturnScreen:'result',editor:{}};
 const record={inserted:[]};harness(state,record).originalStatTInput();
 assert.deepEqual(record.inserted,['Ans','▶t']);
 assert.equal(state.screen,'edit');
});
check('PLUS C original menu denied',()=>{
 const state={model:'fx-991es-plus-c',mode:'STAT',statTable:{paired:false,regressionType:'1VAR'},
  screen:'menu',menuReturnScreen:'edit'};
 const record={inserted:[]};harness(state,record).statDistr();
 assert.equal(record.warned,true);
 assert.equal(record.entries,undefined);
});
check('original STAT equals evaluates current weighted data',()=>{
 const start=APP.indexOf("if(state.mode==='STAT'&&state.model==='fx-991es'&&state.statTable){");
 const end=APP.indexOf("if(state.mode!=='COMP'&&state.mode!=='CMPLX')",start);
 const body=APP.slice(start,end);
 assert.ok(start>=0&&end>start);
 for(const regex of [/STAT\.commit\(state\.statTable\)/,
  /statSummary:source\.includes\('▶t'\)/,/REG\.summary\(state\.statTable\)/,
  /statOriginalDistr:!state\.statTable\.paired/])assert.match(body,regex);
});
console.log('REA-104 PASS '+passed+' normalized variate and model/menu/source checks; physical parity unverified');
