import test from 'node:test';
import assert from 'node:assert/strict';
import {GraphPreviewQueue} from '../js/graph-preview-queue.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));
const value=n=>[{source:'a*x',visible:true,color:'#147d92'},[-5,5,5,-5],[{name:'a',value:n,min:-5,max:5}],[],{}];

test('PERF-011 keeps at most one active graph and renders only latest queued parameter value',async()=>{
 const inflight=[],calls=[],displayed=[];
 const queue=new GraphPreviewQueue(args=>{
  calls.push(args[2][0].value);
  return new Promise(resolve=>inflight.push(resolve));
 },(result,error)=>displayed.push({result,error}));
 const a=value(1),pa=queue.request(a);
 a[2][0].value=987; // must not change the in-flight snapshot
 assert.deepEqual(calls,[1]);
 const pb=queue.request(value(2));
 const pc=queue.request(value(3));
 assert.equal(await pb,false,'superseded pending graph must resolve without rendering');
 assert.deepEqual(calls,[1],'Concurrent graph generation must not start');
 inflight.shift()({src:'one'});
 assert.equal(await pa,false,'A stale active preview must not be displayed');
 await settle();
 assert.deepEqual(calls,[1,3],'Only the newest pending graph should render');
 inflight.shift()({src:'three'});
 assert.equal(await pc,true);
 assert.deepEqual(displayed,[{result:{src:'three'},error:null}]);
 queue.close();
});

test('PERF-011 reuses recent identical previews and evicts old entries at a fixed limit',async()=>{
 const calls=[],display=[];
 const queue=new GraphPreviewQueue(async args=>{calls.push(args[2][0].value);return{src:'graph'+calls.at(-1)};},
  result=>display.push(result.src),2);
 for(const n of [1,2,1,3,2,1])assert.equal(await queue.request(value(n)),true);
 assert.deepEqual(calls,[1,2,3,2,1],'LRU hit and eviction should skip only repeated renders');
 assert.equal(queue.cache.size,2);
 assert.deepEqual(display,['graph1','graph2','graph1','graph3','graph2','graph1']);
 queue.close();assert.equal(queue.cache.size,0);
 assert.equal(await queue.request(value(3)),false);
});

test('PERF-011 cancels obsolete previews on input changes and never applies stale errors',async()=>{
 let finish,attempts=0;
 const seen=[];
 const queue=new GraphPreviewQueue(async args=>{
  attempts++;
  if(args[2][0].value===1)return await new Promise(resolve=>finish=resolve);
  if(args[2][0].value===2)throw Error('Bad expression');
  return {src:'ok'};
 },(result,error)=>seen.push(error?.message||result.src));
 const stale=queue.request(value(1));
 queue.cancel();
 const failed=queue.request(value(2));
 finish({src:'stale'});
 assert.equal(await stale,false);
 assert.equal(await failed,false);
 assert.deepEqual(seen,['Bad expression']);
 assert.equal(await queue.request(value(3)),true);
 assert.deepEqual(seen,['Bad expression','ok']);
 assert.equal(attempts,3);
 queue.close();
});

test('PERF-011 final full-quality render waits for active preview and discards pending work',async()=>{
 let finish,previewCalls=0,fullCalls=0;
 const shown=[];
 const queue=new GraphPreviewQueue(async args=>{
  previewCalls++;
  return await new Promise(resolve=>finish=resolve);
 },result=>shown.push(result.src));
 const pa=queue.request(value(1));
 const pb=queue.request(value(2));
 const final=queue.finalRender(value(4),async args=>{
  fullCalls++;assert.equal(args[2][0].value,4);
  return{src:'full-resolution',w:640,h:440};
 });
 assert.equal(await pb,false,'Pending preview must be cancelled before high-res insertion');
 assert.equal(fullCalls,0,'Full render must not race an active JSXGraph board');
 finish({src:'old-preview'});assert.equal(await pa,false);
 assert.deepEqual(await final,{src:'full-resolution',w:640,h:440});
 assert.equal(previewCalls,1);assert.equal(fullCalls,1);
 assert.deepEqual(shown,[],'Obsolete preview must not overwrite the final graph');
 queue.close();
});

test('PERF-011 closing a dialog suppresses late preview display and frees cached images',async()=>{
 let complete,seen=0;
 const queue=new GraphPreviewQueue(()=>new Promise(resolve=>complete=resolve),()=>seen++);
 const pending=queue.request(value(1));
 queue.close();
 complete({src:'late'});
 assert.equal(await pending,false);
 assert.equal(seen,0);
 assert.equal(queue.cache.size,0);
 await assert.rejects(queue.finalRender(value(1),async()=>({})),/closed/);
});
