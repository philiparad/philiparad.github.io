/* REA-085: original STAT menus, symbolic parameter storage and arithmetic. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const S=require('../js/stat-parameters.js'),E=require('../js/stat-editor.js');
const R=require('../js/stat-regression.js'),M=require('../js/math-engine.js');
let passed=0;function test(name,fn){try{fn();passed++}catch(e){e.message=name+': '+e.message;throw e}}
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9*Math.max(1,Math.abs(b)),a+' vs '+b);
function sample(paired=false,quadratic=false){
 const table=E.create(paired,true);table.regressionType=paired?(quadratic?'QUAD':'LIN'):'1VAR';
 table.rows=paired?[
  {X:1,Y:3,FREQ:1},{X:2,Y:5,FREQ:1},{X:3,Y:7,FREQ:1},
  {X:4,Y:9,FREQ:1}
 ]:[{X:1,Y:null,FREQ:2},{X:2,Y:null,FREQ:3},{X:3,Y:null,FREQ:1}];
 return table;
}
function evaluate(expr,table=sample()){
 const memory=S.resolve(expr,table,R);
 return M.evaluate(expr,{model:'fx-991es',memory});
}
for(const [group,paired,names] of [
 ['Sum',false,['Σx²','Σx']],
 ['Var',false,['n','x̄','xσn','xσn−1']],
 ['MinMax',false,['minX','maxX']],
 ['Sum',true,['Σx²','Σx','Σy²','Σy','Σxy','Σx³','Σx²y','Σx⁴']],
 ['Var',true,['n','x̄','xσn','xσn−1','ȳ','yσn','yσn−1']],
 ['MinMax',true,['minX','maxX','minY','maxY']],
 ['Reg',true,['A','B','r','x̂','ŷ']]
]){
 test(group+' menu order '+paired,()=>assert.deepEqual(
  S.entries(group,paired,'LIN').map(x=>x.label),names));
 test(group+' menu numbers '+paired,()=>assert.deepEqual(
  S.entries(group,paired,'LIN').map(x=>x.key),
  names.map((_,i)=>String(i+1))));
}
test('quadratic Reg A B C xhat1 xhat2 yhat',()=>assert.deepEqual(
 S.entries('Reg',true,'QUAD').map(x=>x.label),['A','B','C','x̂1','x̂2','ŷ']));
test('single-variable regression rejected',()=>assert.throws(()=>S.entries('Reg',false,'1VAR'),/Argument ERROR/));
test('unknown submenu rejected',()=>assert.throws(()=>S.entries('Unknown',false,'1VAR'),/Argument ERROR/));
for(const [token,expect] of [
 ['StatN',6],['StatSumX2',23],['StatSumX',11],
 ['StatMeanX',11/6],['StatSDX',Math.sqrt(17/36)],
 ['StatSampleSDX',Math.sqrt(17/30)],
 ['StatMinX',1],['StatMaxX',3]
])test('one-var token '+token,()=>close(evaluate(token),expect));
test('two symbolic parameters can appear in arithmetic',()=>close(
 evaluate('StatSumX2+StatSumX'),34));
test('symbolic mean times count is sum',()=>close(
 evaluate('StatMeanX*StatN'),11));
test('Ans usable alongside statistical parameter',()=>close(
 M.evaluate('StatSumX+Ans',{model:'fx-991es',ans:7,memory:S.resolve('StatSumX',sample(),R)}),18));
test('parameter expression does not alter user register A',()=>{
 const registers={A:99},bound=S.resolve('StatSumX',sample(),R);
 M.evaluate('StatSumX+A',{model:'fx-991es',memory:{...registers,...bound}});
 assert.deepEqual(registers,{A:99});
});
test('source parameter remains symbolic until evaluation',()=>{
 const text='StatMeanX+1';
 assert.equal(text,'StatMeanX+1');
 close(evaluate(text),17/6);
});
test('unknown Stat token errors',()=>assert.throws(
 ()=>S.resolve('StatUnknown',sample(),R),/Variable ERROR/));
test('paired parameter unavailable in 1VAR',()=>assert.throws(
 ()=>S.resolve('StatSumY',sample(),R),/Argument ERROR/));
test('regression parameter unavailable in 1VAR',()=>assert.throws(
 ()=>S.resolve('StatRegA',sample(),R),/Argument ERROR/));
test('empty sample rejects statistics during evaluation',()=>{
 const t=E.create();
 assert.throws(()=>S.resolve('StatMeanX',t,R),/Argument ERROR/);
});
test('single observation sample standard deviation rejects',()=>{
 const t=E.create();t.rows=[{X:1,Y:null,FREQ:1}];
 assert.throws(()=>S.resolve('StatSampleSDX',t,R),/Math ERROR/);
});
test('constant paired regression coefficients reject',()=>{
 const t=E.create(true);t.regressionType='LIN';
 t.rows=[{X:1,Y:2,FREQ:1},{X:1,Y:3,FREQ:1}];
 assert.throws(()=>S.resolve('StatRegB',t,R),/Math ERROR/);
});
test('no parameter resolves without needing nonempty samples',()=>{
 assert.deepEqual(S.resolve('1+2',E.create(),R),{});
});
test('missing data rejects referenced parameter',()=>assert.throws(
 ()=>S.resolve('StatN',null,R),/Argument ERROR/));
test('paired Sum and Var tokens',()=>{
 const t=sample(true);
 const sum=R.summary(t);
 for(const [token,want] of [['StatSumY2',sum.sumY2],['StatSumY',sum.sumY],
  ['StatSumXY',sum.sumXY],['StatSumX3',sum.sumX3],
  ['StatSumX2Y',sum.sumX2Y],['StatSumX4',sum.sumX4],
  ['StatMeanY',sum.meanY],['StatSDY',sum.sdY],
  ['StatSampleSDY',sum.sampleSDY],
  ['StatMinY',sum.minY],['StatMaxY',sum.maxY]])
  close(evaluate(token,t),want);
});
test('linear coefficients A B r resolve from stored pairs',()=>{
 const t=sample(true);
 close(evaluate('StatRegA',t),1);
 close(evaluate('StatRegB',t),2);
 close(evaluate('StatRegR',t),1);
});
test('quadratic coefficient unavailable in linear context',()=>assert.throws(
 ()=>S.resolve('StatRegC',sample(true),R),/Argument ERROR/));
test('quadratic fit supplies C',()=>{
 const t=E.create(true);t.regressionType='QUAD';
 t.rows=[{X:0,Y:1,FREQ:1},{X:1,Y:4,FREQ:1},
  {X:2,Y:9,FREQ:1},{X:3,Y:16,FREQ:1}];
 close(evaluate('StatRegA',t),1);
 close(evaluate('StatRegB',t),2);
 close(evaluate('StatRegC',t),1);
});
test('live parameters reflect edited samples upon re-evaluation',()=>{
 const t=sample(),expression='StatSumX';
 const initial=evaluate(expression,t);t.rows[0].X=10;
 assert.equal(initial,11);
 assert.equal(evaluate(expression,t),29);
});
test('STAT token discovery ignores similar unrelated names',()=>{
 assert.deepEqual(S.tokens('OtherStatSumX+StatN'),['StatN']);
});
test('original controller inserts tokens instead of numeric selector',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const start=code.indexOf('function originalStatParameterMenu(');
 const end=code.indexOf('function statMenu(){',start);
 assert.ok(start>0&&end>start);
 const functionText=code.slice(start,end);
 assert.match(functionText,/insert\(item\.token\)/);
 assert.doesNotMatch(functionText,/state\.ans\s*=/);
 assert.match(code,/STATPARAM\.resolve\(source,state\.statTable,REG\)/);
 assert.match(code,/memory:\{\.\.\.state\.memory,\.\.\.bound\}/);
});
test('original menu includes exactly seven options with paired-aware seventh',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const body=code.slice(code.indexOf("if(state.model==='fx-991es'){",code.indexOf('function statMenu(){')),
  code.indexOf('releaseModifier();',code.indexOf("if(state.model==='fx-991es'){",code.indexOf('function statMenu(){'))+30));
 for(const title of ['1. Type','2. Data','3. Edit','4. Sum','5. Var','6. MinMax','7. Reg','7. Distr'])
  assert.ok(code.includes(title),title);
 assert.match(code,/state\.statTable\.paired\?'7\. Reg':'7\. Distr'/);
});
test('original edit calculation can use = without advanced mode reset',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(code,/if\(state\.mode==='STAT'&&state\.model==='fx-991es'&&state\.statTable\)/);
 assert.match(code,/setResult\(value,source,null\)/);
});
test('STAT SHIFT+1 after a result returns to original menu',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(code,/state\.mode==='STAT'&&state\.statTable&&state\.shift&&key==='1'/);
});
test('PLUS models continue through original existing menu branch',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(code,/if\(state\.model==='fx-991es'\)\{/);
 assert.match(code,/function statMenuResult\(/);
});
test('independent Reg estimates handle missing root without changing Ans',()=>{
 const code=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(code,/function originalStatEstimate\(item\)/);
 assert.match(code,/item\.root>=results\.length/);
 assert.match(code,/kind:'stat-original-estimate'/);
});
test('module loads before controller',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.ok(html.indexOf('js/stat-parameters.js')>=0);
 assert.ok(html.indexOf('js/stat-parameters.js')<html.indexOf('js/app.js'));
});
console.log('REA-085 PASS '+passed+' source-stat menus, resolution and storage checks; hardware not verified');
