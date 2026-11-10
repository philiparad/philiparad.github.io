/* REA-068 worker regression. Run: node tests/rea068-numerical-worker.cjs */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const js=path.resolve(__dirname,'../js');
const messages=[];
const context={postMessage:message=>messages.push(message)};
context.self=context;
context.globalThis=context;
context.importScripts=(...names)=>{
 for(const name of names){
  assert.ok(/^[a-z0-9-]+\.js$/i.test(name),'local import only');
  vm.runInNewContext(fs.readFileSync(path.join(js,name),'utf8'),context,{filename:name,timeout:3000});
 }
};
vm.runInNewContext(fs.readFileSync(path.join(js,'numeric-worker.js'),'utf8'),context,{filename:'numeric-worker.js',timeout:3000});
const settings={angle:'DEG',format:'Norm2',digits:3,math:true,ans:0,preAns:0,memory:{X:0}};
function run(kind,data){
 messages.length=0;
 vm.runInNewContext('self.onmessage({data:payload})',
  {...context,payload:{id:11,task:{kind,data,settings}}},{timeout:3000});
 assert.equal(messages.length,1,'one response');
 assert.equal(messages[0].id,11,'matched request id');
 return messages[0];
}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,'expected '+b+', got '+a);
for(const [kind,data,expected] of [
 ['DERIVATIVE',{expression:'X^2',at:'2',tol:'1E-10'},4],
 ['INTEGRAL',{expression:'X^2',a:'0',b:'1',tol:'1E-5'},1/3],
 ['SOLVE',{expression:'X^2-2',guess:'1'},Math.SQRT2],
 ['SUM',{expression:'X',a:'1',b:'10'},55],
 ['PRODUCT',{expression:'X',a:'1',b:'5',step:'1'},120]
]){
 const result=run(kind,data);
 assert.equal(result.ok,true,kind+': '+result.error);
 near(result.value,expected);
}
for(const [kind,data,error] of [
 ['SUM',{expression:'X',a:'1',b:'30000'},'Argument ERROR'],
 ['PRODUCT',{expression:'X',a:'1',b:'30000',step:'1'},'Argument ERROR'],
 ['INTEGRAL',{expression:'1/0',a:'0',b:'1',tol:'1E-5'},'Math ERROR'],
 ['SOLVE',{expression:'1',guess:'1'},'Variable ERROR'],
 ['DERIVATIVE',{expression:'X^2',at:'2',tol:'0'},'Argument ERROR'],
 ['DERIVATIVE',{expression:'X^2',at:'2',tol:'1E-15'},'Argument ERROR'],
 ['UNKNOWN',{expression:'X'},'Argument ERROR']
]){
 const result=run(kind,data);
 assert.equal(result.ok,false,kind);
 assert.equal(result.error,error,kind);
}
const source=fs.readFileSync(path.join(js,'app.js'),'utf8');
new Function(source);
assert.ok(source.includes("cancelNumeric();state.flow=null;state.screen='edit'"));
assert.ok(source.includes("NUMERIC_WALL_MS=6000"));
assert.ok(source.includes("job.worker.terminate()"));
assert.ok(source.includes("if(state.flow===f)finishFlow(value)"));
console.log('REA-068: 12 worker result/error cases and 4 integration guards passed');
