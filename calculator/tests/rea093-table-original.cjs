/* REA-093: TABLE limits, prohibited expressions, invalid cells and controller.
 * Run: node calculator/tests/rea093-table-original.cjs
 * Source-level checks; physical CASIO and browser DOM traces remain separate.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const T=require('../js/table-engine.js');
let passed=0;
function check(label,fn){try{fn();passed++}catch(error){error.message=label+': '+error.message;throw error}}
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 check(model+' 30 single rows',()=>assert.equal(T.maxRows(model,1),30));
 check(model+' dual capacity',()=>assert.equal(T.maxRows(model,2),model.endsWith('-c')?20:30));
 check(model+' 30 rows exactly',()=>{
  const t=T.generate({model,count:1,start:0,end:29,step:1,f:x=>x*x});
  assert.equal(t.rows.length,30);assert.equal(t.dual,false);
 });
 check(model+' row 31 rejected',()=>assert.throws(
  ()=>T.generate({model,start:0,end:30,step:1,f:x=>x}),/Insufficient MEM/));
 for(const [start,end,step] of [[5,4,1],[0,3,0],[0,3,-1],[0,3,NaN]])
 check(model+' rejects range '+[start,end,step],()=>assert.throws(
  ()=>T.generate({model,start,end,step,f:x=>x}),/Argument ERROR/));
 check(model+' per-cell failure',()=>{
  const t=T.generate({model,start:0,end:2,step:1,f:x=>x===1?Infinity:x});
  assert.equal(t.rows[1].f,null);assert.equal(t.rows[2].f,2);
  assert.equal(T.format(t.rows[1].f),'ERROR');
 });
 check(model+' bounded grid navigation',()=>{
  const t=T.generate({model,start:0,end:3,step:1,f:x=>x});
  T.navigate(t,100,100);assert.equal(t.row,3);assert.equal(t.col,1);
  T.navigate(t,-100,-100);assert.equal(t.row,0);assert.equal(t.col,0);
 });
 check(model+' dual isolation',()=>{
  const t=T.generate({model,count:2,start:0,end:2,step:1,f:x=>x,g:x=>x+10});
  assert.equal(t.dual,model.endsWith('-c'));
 });
}
for(const expr of ['X^2','sin(X)','A*X+M','max(X,1)','  X + 1 '])
 check('allows expression '+expr,()=>assert.equal(T.validateExpression(expr),expr.trim()));
for(const expr of ['Diff(X,2)','Derivative(X)','Integral(X,0,1)','Integrate(X,0,2)',
 'Sum(X,1,5)','Sigma(X,1,4)','Pol(X,Y)','Rec(3,X)','Σ(X)','∫(X)',
 'X=3','X;1','X:1',''])
 check('rejects TABLE expression '+expr,()=>assert.throws(
  ()=>T.validateExpression(expr),/Argument ERROR|Syntax ERROR/));
check('PLUS C dual 20 rows',()=>{
 const t=T.generate({model:'fx-991es-plus-c',count:2,start:0,end:19,step:1,f:x=>x,g:x=>x*x});
 assert.equal(t.rows.length,20);assert.equal(t.dual,true);
});
check('PLUS C dual 21 rejected',()=>assert.throws(
 ()=>T.generate({model:'fx-991es-plus-c',count:2,start:0,end:20,step:1,f:x=>x,g:x=>x}),/Insufficient MEM/));
check('dual errors isolated by cell and function',()=>{
 const t=T.generate({model:'fx-991es-plus-c',count:2,start:0,end:3,step:1,
  f:x=>x===1?NaN:x,g:x=>x===2?NaN:x+1});
 assert.equal(t.rows[1].f,null);assert.equal(t.rows[1].g,2);
 assert.equal(t.rows[2].f,2);assert.equal(t.rows[2].g,null);
});
const controller=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
check('TABLE validates both functions',()=>{
 assert.match(controller,/TABLE\.validateExpression\(data\.expression\)/);
 assert.match(controller,/TABLE\.validateExpression\(data\.expression2\)/);
});
check('TABLE range prompts can evaluate arithmetic formulas',()=>{
 assert.match(controller,/const start=rangeValue\(data\.start\),end=rangeValue\(data\.end\),step=rangeValue\(data\.step\)/);
 assert.match(controller,/M\.evaluate\(String\(source\)/);
});
check('X changes after successful generation only',()=>{
 const start=controller.indexOf('function tableStart(');
 const body=controller.slice(start,controller.indexOf('function tableHandle(',start));
 const table=body.indexOf('state.tableData=table'),memory=body.indexOf('state.memory.X=table.rows[table.rows.length-1].x;');
 assert.ok(table>=0&&memory>table);
 assert.match(body,/delete state\.complexMemory\.X/);
});
check('IO setup invalidates TABLE data and draft',()=>{
 assert.match(controller,/if\(state\.mode==='TABLE'\)\{state\.tableData=null;state\.tableDraft=null\}/);
});
check('TABLE AC and = return to input editor',()=>{
 assert.match(controller,/if\(key==='AC'\|\|key==='EQUAL'\)\{tableStart\(\{\.\.\.state\.tableDraft\}\);return\}/);
});
console.log('REA-093 PASS '+passed+' source-level TABLE checks; browser/hardware unverified');
