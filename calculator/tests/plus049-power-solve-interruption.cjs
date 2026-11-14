#!/usr/bin/env node
/* PLUS-049: exercise actual numeric-worker and power lifecycle under rapid
 * OFF/ON, repeated SOLVE, SUM/INTEGRAL interruption, and late delivery.
 * Deterministic event-loop test; not a browser nor hardware certification.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const M=require('../js/math-engine.js');
const SOLVE=require('../js/solve-session.js');
const CALC=require('../js/calc-substitution.js');
function between(start,end){
 const i=app.indexOf(start),j=app.indexOf(end,i+start.length);
 A.ok(i>=0&&j>i,'missing app.js lifecycle section '+start);
 return app.slice(i,j);
}
const numeric=between('let numericJob=null;','const registerAllowed=');
const inline=between('function executeInlineCalculus(','function insertCalculusTemplate(');
const power=between('function powerOff(reason=','function clearMenu(');
const workers=[],activeTimers=new Map(),events=[],rendered=[],errors=[];
let seq=0;
class ControlledWorker {
 constructor(url){this.url=url;this.terminated=false;workers.push(this)}
 postMessage(data){this.request=data}
 terminate(){this.terminated=true}
 success(value,residual=0){this.onmessage({data:{id:1,ok:true,value,residual}})}
 failure(error){this.onmessage({data:{id:1,ok:false,error}})}
}
const state={
 power:true,mode:'COMP',model:'fx-991es-plus',screen:'edit',
 ans:5,preAns:3,raw:5,memory:{X:11,M:7},angle:'DEG',
 format:'Norm1',digits:3,math:true,info:'',history:[],
 powerOffReason:null
};
const timer=(callback,ms)=>{const id=++seq;activeTimers.set(id,{callback,ms});return id};
const clearTimer=id=>activeTimers.delete(id);
const create=new Function(
 'Worker','state','setResult','error','paint','releaseModifier',
 'setTimeout','clearTimeout','clearPowerTimer','clearTransientDisplay',
 'markOperation','notify','clearReplay',
 numeric+'\n'+inline+'\n'+power+'\n'+
 'return {cancelNumeric,runNumeric,executeInlineCalculus,powerOff,powerOn,epoch:()=>numericGeneration};'
);
const api=create(ControlledWorker,state,
 (value,source)=>{rendered.push({value,source});state.raw=value;state.ans=value;state.screen='result'},
 (message,source)=>{errors.push({message,source});state.screen='error'},
 ()=>{},()=>{},
 timer,clearTimer,
 ()=>events.push('clearPowerTimer'),
 ()=>{events.push('clearTransientDisplay');state.screen='edit';state.info='';state.history=[];
   state.flow=null;state.solveSession=null;state.input=''},
 ()=>events.push('markOperation'),
 (message)=>events.push(message),
 ()=>{}
);
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve()};
async function main(){
 // Power-off must terminate a live worker without erasing stored memory.
 api.executeInlineCalculus({kind:'INTEGRAL',data:{expression:'X',a:'0',b:'1'},source:'power-old'});
 const w1=workers.at(-1),epoch=api.epoch();
 A.equal(w1.request.task.kind,'INTEGRAL');
 api.powerOff('manual');
 A.equal(state.power,false);A.equal(state.screen,'edit');
 A.equal(state.powerOffReason,'manual');A.ok(w1.terminated);
 A.ok(api.epoch()>epoch,'power-off must invalidate pending completion');
 A.equal(state.memory.X,11);A.equal(state.memory.M,7);A.equal(state.ans,5);
 w1.success(999);await flush();
 A.equal(rendered.length,0,'late completion modified powered-off state');
 A.equal(errors.length,0,'cancel error leaked after power-off');
 api.powerOn();
 A.equal(state.power,true);A.equal(state.powerOffReason,null);
 A.equal(state.screen,'edit');
 A.equal(state.memory.X,11);A.equal(state.ans,5);
 
 // A new integral must win over a cancelled SUM, even after ON.
 api.executeInlineCalculus({kind:'SUM',data:{expression:'X',a:'1',b:'10'},source:'sum-old'});
 const w2=workers.at(-1);
 A.equal(w2.request.task.kind,'SUM');
 api.cancelNumeric();state.screen='edit';
 api.executeInlineCalculus({kind:'INTEGRAL',data:{expression:'X',a:'0',b:'1'},source:'integral-new'});
 const w3=workers.at(-1);
 A.equal(w3.request.task.kind,'INTEGRAL');
 w2.success(55);await flush();
 A.equal(rendered.length,0,'old SUM overwrote current integral');
 A.equal(state.screen,'calculating');
 w3.success(.5);await flush();
 A.deepEqual(rendered,[{value:.5,source:'integral-new'}]);

 // Rapid independent SOLVE requests must use the most recent job.
 const registers=['A','B','C','D','E','F','M','X','Y'];
 const one=SOLVE.prepare('X-2',registers,state.memory,CALC.scan);
 const p1=SOLVE.resolve(one,{guess:'0'},M,{memory:{...state.memory}});
 const expected1=SOLVE.iterate(x=>M.evaluate(p1.expression,{
  memory:{...p1.memory,X:x}}),M,p1.guess);
 A.ok(Math.abs(expected1.value-2)<1e-9);
 let firstResolved=false;
 const request1=api.runNumeric('SOLVE',{
  expression:p1.expression,guess:String(p1.guess),memory:p1.memory
 }).then(()=>{firstResolved=true},()=>{});
 const w4=workers.at(-1);
 const two=SOLVE.prepare('X-4',registers,state.memory,CALC.scan);
 const p2=SOLVE.resolve(two,{guess:'3'},M,{memory:{...state.memory}});
 const expected2=SOLVE.iterate(x=>M.evaluate(p2.expression,{
  memory:{...p2.memory,X:x}}),M,p2.guess);
 A.ok(Math.abs(expected2.value-4)<1e-9);
 let latest=null;
 const request2=api.runNumeric('SOLVE',{
  expression:p2.expression,guess:String(p2.guess),memory:p2.memory
 }).then(reply=>{latest=reply.value});
 const w5=workers.at(-1);
 A.ok(w4.terminated,'old SOLVE worker was not cancelled');
 w4.success(expected1.value,expected1.residual);
 w5.success(expected2.value,expected2.residual);
 await Promise.all([request1,request2]);
 A.equal(firstResolved,false,'superseded SOLVE committed');
 A.ok(Math.abs(latest-4)<1e-9,'wrong SOLVE job won');
 A.equal(state.memory.X,11,'worker should not commit X before UI transaction');

 // A queued, already-resolved SUM must not render after OFF then ON.
 api.executeInlineCalculus({kind:'SUM',data:{expression:'X',a:'1',b:'5'},source:'queued-before-off'});
 const w6=workers.at(-1);
 w6.success(15);
 api.powerOff('manual');api.powerOn();
 api.executeInlineCalculus({kind:'SUM',data:{expression:'X',a:'1',b:'3'},source:'after-restart'});
 const w7=workers.at(-1);
 await flush();
 A.equal(rendered.length,1,'stale SUM rendered after OFF/ON');
 w7.success(6);await flush();
 A.deepEqual(rendered.at(-1),{value:6,source:'after-restart'});
 A.equal(errors.length,0);
 A.ok(workers.every(w=>w.terminated),'worker not terminated');
 A.equal(activeTimers.size,0,'worker timeout leak');
 A.ok(events.includes('clearTransientDisplay'));
 A.ok(events.includes('markOperation'));
 console.log('PLUS-049 PASS: OFF/ON, interrupted SUM/integral, superseded SOLVE, resolved-before-power-off and late worker isolation');
}
main().catch(error=>{console.error(error);process.exitCode=1});
