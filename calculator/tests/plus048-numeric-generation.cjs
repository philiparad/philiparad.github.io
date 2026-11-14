#!/usr/bin/env node
/* PLUS-048: run the REAL numeric lifecycle and inline-calculus functions in
 * an isolated, deterministic event-loop harness. The fake Worker controls
 * delivery order to reproduce resolved-but-queued stale callbacks.
 * This is a source-level race test, not Chromium or physical hardware parity.
 */
'use strict';
const A=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
const from=app.indexOf('let numericJob=null;');
const until=app.indexOf('const registerAllowed=',from);
const inlineStart=app.indexOf('function executeInlineCalculus(');
const inlineEnd=app.indexOf('function insertCalculusTemplate(',inlineStart);
A.ok(from>=0&&until>from&&inlineStart>=0&&inlineEnd>inlineStart,
 'unable to extract real numeric lifecycle from app.js');
const numeric=app.slice(from,until);
const inline=app.slice(inlineStart,inlineEnd);
A.ok(numeric.includes('numericGeneration++'),'cancellation must invalidate callbacks');
A.ok(inline.includes('generation!==numericGeneration'),
 'inline results must reject outdated generation identifiers');
const created=[],results=[],errors=[],timers=new Map();
let nextTimer=0;
class ControlledWorker {
 constructor(url){this.url=url;this.terminated=false;created.push(this)}
 postMessage(payload){this.payload=payload}
 terminate(){this.terminated=true}
 deliver(value,residual=0){this.onmessage({data:{id:1,ok:true,value,residual}})}
 fail(message='Math ERROR'){this.onmessage({data:{id:1,ok:false,error:message}})}
}
const state={model:'fx-991es-plus',angle:'DEG',format:'Norm1',
 digits:3,math:true,ans:0,preAns:0,memory:{X:0},power:true,
 screen:'edit',info:''};
const make=new Function('Worker','state','setResult','error','paint',
 'releaseModifier','setTimeout','clearTimeout',
 numeric+'\n'+inline+'\n'+
 'return {cancelNumeric,runNumeric,executeInlineCalculus,epoch:()=>numericGeneration};');
const api=make(ControlledWorker,state,
 (value,source)=>{results.push({value,source});state.screen='result'},
 (message,source)=>{errors.push({message,source});state.screen='error'},
 ()=>{},()=>{},
 (fn,delay)=>{const id=++nextTimer;timers.set(id,{fn,delay});return id},
 id=>{timers.delete(id)});
const flush=async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve()};
const calc=(source)=>api.executeInlineCalculus({kind:'SUM',data:{
 expression:'X',a:'1',b:'2'},source});
(async()=>{
 // A result has resolved, but its UI .then() callback has not run yet.
 api.executeInlineCalculus({kind:'SUM',data:{expression:'X',a:'1',b:'2'},source:'OLD'});
 const first=created.at(-1);
 A.equal(state.screen,'calculating');
 first.deliver(999);
 const epochBefore=api.epoch();
 api.cancelNumeric();state.screen='edit';
 A.ok(api.epoch()>epochBefore,'cancel must invalidate resolved callback');
 calc('NEW');
 const second=created.at(-1);
 A.notEqual(second,first);
 await flush();
 A.equal(results.length,0,'old result overwrote newer calculation');
 A.equal(state.screen,'calculating','old result changed new LCD state');
 second.deliver(3);
 await flush();
 A.deepEqual(results,[{value:3,source:'NEW'}]);
 A.equal(state.screen,'result');
 A.ok(second.terminated,'completed worker not terminated');

 // Restart while an earlier result is already queued, without explicit AC.
 calc('REPLACED');
 const third=created.at(-1);
 third.deliver(123);
 calc('LATEST');
 const fourth=created.at(-1);
 await flush();
 A.equal(results.length,1,'superseded result committed');
 A.equal(state.screen,'calculating');
 fourth.deliver(5);await flush();
 A.equal(results.length,2);A.deepEqual(results.at(-1),{value:5,source:'LATEST'});

 // Reject an outdated error: it must not corrupt the next calculation.
 calc('ERROR_OLD');
 const fifth=created.at(-1);
 fifth.fail("Can't Solve");
 calc('ERROR_NEW');
 const sixth=created.at(-1);
 await flush();
 A.equal(errors.length,0,'old error surfaced during a new calculation');
 A.equal(state.screen,'calculating');
 sixth.deliver(7);await flush();
 A.equal(results.length,3);

 // Simulate a rapid AC followed by a new numerical operation.
 calc('AC_OLD');
 const seventh=created.at(-1);
 A.ok(api.cancelNumeric(),'AC must cancel live job');
 state.screen='edit';
 A.ok(seventh.terminated);
 calc('AFTER_AC');
 const eighth=created.at(-1);
 seventh.deliver(77); // misbehaving worker delivers after termination
 await flush();
 A.equal(results.length,3,'terminated worker changed answer');
 eighth.deliver(8);await flush();
 A.equal(results.length,4);
 A.deepEqual(results.at(-1),{value:8,source:'AFTER_AC'});

 // MODE cancellation with an attempted late successful callback.
 calc('MODE_OLD');
 const ninth=created.at(-1);
 api.cancelNumeric();state.screen='menu';
 ninth.deliver(909);
 await flush();
 A.equal(state.screen,'menu');
 A.equal(results.length,4);
 state.screen='edit';
 calc('AFTER_MODE');
 const tenth=created.at(-1);
 tenth.deliver(10);await flush();
 A.equal(results.length,5);
 A.equal(errors.length,0);
 A.ok(created.every(worker=>worker.terminated));
 A.equal(timers.size,0,'numerical timeout handles were leaked');
 console.log('PLUS-048 PASS: queued completion, restart, stale error, rapid AC/MODE, late terminated worker and timer cleanup');
})().catch(err=>{console.error(err);process.exitCode=1});
