/* REA-079 SOLVE prompt order, Newton continuation, residual and memory.
 * Run: node calculator/tests/rea079-solve-session.cjs
 * Manufacturer hardware parity remains unverified.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const S=require('../js/solve-session.js'),C=require('../js/calc-substitution.js');
const M=require('../js/math-engine.js'),MODELS=require('../js/model-profiles.js');
let checks=0;
const check=(label,fn)=>{try{fn();checks++}catch(e){e.message=label+': '+e.message;throw e}};
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(b)),a+' != '+b);
const context=(model='fx-991es')=>({model,angle:'DEG',ans:19,preAns:13,
 memory:{A:1,B:-2,C:0,D:0,E:0,F:0,M:0,X:1,Y:0}});
const prepare=(source,settings=context())=>
 S.prepare(source,MODELS.registers(settings.model),settings.memory,C.scan);
const resolve=(p,data,settings=context())=>S.resolve(p,data,M,settings);
const fn=(text,opts,variable='X')=>{
 const parts=text.split('=');
 return x=>{
  const m={...opts.memory,[variable]:x},ctx={...opts,memory:m};
  const left=M.evaluate(parts[0],ctx);
  return left-(parts.length===2?M.evaluate(parts[1],ctx):0);
 };
};
function solve(text,data,settings=context(),step=20){
 const session=prepare(text,settings);
 const p=resolve(session,data,settings);
 const f=fn(text,{...settings,memory:p.memory});
 let progress=S.iterate(f,M,p.guess,null,step),iterations=1;
 while(progress.status==='continue'&&iterations++<8)
  progress=S.iterate(f,M,p.guess,progress.resume,step);
 return {session,params:p,progress};
}
check('simple X prompt uses memory initial X',()=>{
 const p=prepare('X^2-2');
 assert.deepEqual(p.fields,[{id:'guess',label:'Solve for X',value:'1'}]);
});
check('equation variables before initial X, in appearance order',()=>{
 const p=prepare('Y=A*X^2+B');
 assert.deepEqual(p.fields.map(x=>x.id),['Y','A','B','guess']);
 assert.deepEqual(p.fields.map(x=>x.value),['0','1','-2','1']);
});
check('source constant at left and right',()=>{
 assert.deepEqual(prepare('X=2').fields.map(x=>x.id),['guess']);
});
check('model prohibits original E/F variable',()=>{
 assert.throws(()=>prepare('E+X=1'),/Variable ERROR: E/);
});
check('PLUS supports E and F',()=>{
 const p=prepare('E*X+F',context('fx-991es-plus'));
 assert.deepEqual(p.fields.map(x=>x.id),['E','F','guess']);
});
check('SOLVE requires actual X reference',()=>{
 assert.throws(()=>prepare('Y+1=0'),/Variable ERROR/);
});
check('SOLVE rejects multiple equality delimiters',()=>{
 assert.throws(()=>prepare('X=Y=3'),/Syntax ERROR/);
});
check('SOLVE rejects unsupported function',()=>{
 assert.throws(()=>prepare('Pol(X,1)=2'),/Syntax ERROR/);
});
check('SOLVE rejects empty expression',()=>{
 assert.throws(()=>prepare(''),/Syntax ERROR/);
});
check('SOLVE variable substitution is transactional',()=>{
 const settings=context(),previous=JSON.stringify(settings.memory);
 const p=prepare('Y=A*X^2+B',settings);
 const output=resolve(p,{Y:'0',A:'1',B:'-2',guess:'1'},settings);
 assert.equal(JSON.stringify(settings.memory),previous);
 assert.deepEqual(output.changes,{Y:0,A:1,B:-2});
 assert.equal(output.guess,1);
});
check('SOLVE accepts arithmetic entries in prompt',()=>{
 const p=prepare('Y=A*X^2+B');
 const data=resolve(p,{Y:'0',A:'2-1',B:'-4/2',guess:'4/4'});
 assert.equal(data.guess,1);
 assert.equal(data.memory.B,-2);
});
check('SOLVE rejects empty initial guess',()=>{
 assert.throws(()=>resolve(prepare('X^2-2'),{guess:''}),/Argument ERROR/);
});
check('SOLVE rejects initial magnitude >= 1e10',()=>{
 assert.throws(()=>resolve(prepare('X^2-2'),{guess:'1e10'}),/Argument ERROR/);
});
check('SOLVE rejects invalid reference parameter',()=>{
 const p=prepare('Y=A*X^2+B');
 assert.throws(()=>resolve(p,{Y:'0',A:'sqrt(-1)',B:'-2',guess:'1'}),/Math ERROR/);
});
check('SOLVE sqrt2 success and L-R',()=>{
 const {progress}=solve('X^2-2',{guess:'1'});
 assert.equal(progress.status,'solved');
 near(progress.value,Math.sqrt(2));
 near(progress.residual,0);
});
check('SOLVE two-sided equation success',()=>{
 const {progress}=solve('X^2=4',{guess:'1'});
 assert.equal(progress.status,'solved');near(progress.value,2);
});
check('CASIO example Y=AX^2+B',()=>{
 const {progress}=solve('Y=A*X^2+B',
  {Y:'0',A:'1',B:'-2',guess:'1'});
 assert.equal(progress.status,'solved');near(progress.value,Math.sqrt(2));
});
check('SOLVE negative initial guess finds negative root',()=>{
 const {progress}=solve('X^2-2',{guess:'-1'});
 assert.equal(progress.status,'solved');near(progress.value,-Math.sqrt(2));
});
check('SOLVE rejects no real root X squared +1',()=>{
 assert.throws(()=>solve('X^2+1',{guess:'1'}),/Can't Solve/);
});
check('SOLVE rejects pole-induced candidate',()=>{
 assert.throws(()=>solve('1/X',{guess:'1'}),/Can't Solve/);
});
check('SOLVE rejects initial pole X=0',()=>{
 assert.throws(()=>solve('1/X',{guess:'0'}),/Math ERROR/);
});
check('SOLVE recognizes exact initial root',()=>{
 const {progress}=solve('X^2-4',{guess:'2'});
 assert.equal(progress.status,'solved');
 assert.equal(progress.iterations,0);
});
check('Newton slow convergence provides real continue state',()=>{
 const p=prepare('(X-1)^7');
 const r=resolve(p,{guess:'2'});
 const f=fn(p.source,{...context(),memory:r.memory});
 const out=S.iterate(f,M,r.guess,null,20);
 assert.equal(out.status,'continue');
 assert.equal(out.resume.iterations,20);
 assert.ok(out.resume.x<2 && out.resume.x>1);
});
check('Continue actually advances from previous Newton state',()=>{
 const p=prepare('(X-1)^7');
 const r=resolve(p,{guess:'2'});
 const f=fn(p.source,{...context(),memory:r.memory});
 const first=S.iterate(f,M,r.guess,null,20);
 const second=S.iterate(f,M,r.guess,first.resume,20);
 assert.equal(second.status,'continue');
 assert.equal(second.resume.iterations,40);
 assert.ok(second.resume.x<first.resume.x);
});
check('Continue caps actual iterations',()=>{
 const f=x=>(x-1)**9;
 let state=null,error=null;
 try{
  for(let i=0;i<10;i++){
   const result=S.iterate(f,M,2,state,20);
   if(result.status==='solved')break;
   state=result.resume;
  }
 }catch(e){error=e}
 assert.ok(!error||error.message==="Can't Solve");
});
check('Result contains solution and residual LCD lines',()=>{
 const out=S.result('X^2-2',Math.sqrt(2),0,x=>x.toFixed(3));
 assert.deepEqual(out.lines,['X^2-2','X= 1.414','L-R= 0.000']);
 assert.equal(out.value,Math.sqrt(2));
});
check('Result rejects invalid nonfinite residual',()=>{
 assert.throws(()=>S.result('X',1,Infinity,String),/Math ERROR/);
});
check('worker imports SOLVE module and resumes state',()=>{
 const worker=fs.readFileSync(path.join(__dirname,'../js/numeric-worker.js'),'utf8');
 assert.match(worker,/importScripts\([^\n]*'solve-session\.js'/);
 assert.match(worker,/FreshSolveSession\.iterate\(f,M,number\(data\.guess\),data\.resume\|\|null\)/);
 assert.match(worker,/continue:true,resume:progress\.resume/);
 new Function(worker);
});
check('controller does not change Ans for SOLVE success',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const solve=app.slice(app.indexOf("if(output&&output.kind==='solve')"),
  app.indexOf("if(output&&output.kind==='calc-substitution')"));
 assert.doesNotMatch(solve,/state\.ans\s*=/);
 assert.match(solve,/state\.memory\.X=output\.value/);
});
check('controller has actual Continue/AC/equals routes',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/Continue: \[=\]/);
 assert.match(app,/if\(key==='EQUAL'&&state\.solveSession\.pending\)\{continueSolve\(\);return\}/);
 assert.match(app,/state\.solveSession=null;state\.screen='edit'/);
});
check('worker only runs in COMP context',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/if\(state\.mode!=='COMP'\)\{notify\('SOLVE requires COMP mode'/);
});
check('UI loads SOLVE module before controller',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.ok(html.indexOf('js/solve-session.js')>=0);
 assert.ok(html.indexOf('js/solve-session.js')<html.indexOf('js/app.js'));
});
for(const model of ['fx-991es','fx-991es-plus','fx-991es-plus-c']){
 check('X register on '+model,()=>{
  const p=S.prepare('Y=A*X^2+B',MODELS.registers(model),context(model).memory,C.scan);
  assert.deepEqual(p.fields.map(x=>x.id),['Y','A','B','guess']);
 });
}
console.log('REA-079 PASS '+checks+' SOLVE prompts, iterations, residual and memory tests (hardware not tested)');
