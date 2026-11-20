import test from 'node:test';
import assert from 'node:assert/strict';
import { GraphPreviewQueue } from '../js/graph-preview-queue.js';

const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('PERF-011 keeps a single render active and replaces stale pending previews',async()=>{
 const active=[];
 let finish;
 const queue=new GraphPreviewQueue(payload=>new Promise(resolve=>{
  active.push(payload);
  finish=resolve;
 }));
 const first=queue.request({id:'first'});
 const old=queue.request({id:'old'});
 const latest=queue.request({id:'latest'});
 assert.equal(await old,null);
 assert.deepEqual(active,[{id:'first'}]);
 finish('first result');
 assert.equal(await first,'first result');
 await settle();
 assert.deepEqual(active,[{id:'first'},{id:'latest'}]);
 finish('latest result');
 assert.equal(await latest,'latest result');
});

test('PERF-011 final quality request replaces pending preview but never runs concurrently',async()=>{
 const renders=[];
 let finish;
 const queue=new GraphPreviewQueue(payload=>new Promise(resolve=>{
  renders.push(payload);
  finish=resolve;
 }));
 const first=queue.request({preview:true,id:1});
 const stale=queue.request({preview:true,id:2});
 const final=queue.request({preview:false,id:3});
 assert.equal(await stale,null);
 finish('preview');
 await first;
 await settle();
 assert.deepEqual(renders.map(v=>v.preview),[true,false]);
 finish('full-resolution');
 assert.equal(await final,'full-resolution');
});

test('PERF-011 close cancels pending jobs and ignores active result',async()=>{
 let finish;
 const queue=new GraphPreviewQueue(()=>new Promise(resolve=>{finish=resolve;}));
 const active=queue.request({id:1});
 const pending=queue.request({id:2});
 queue.close();
 assert.equal(await pending,null);
 finish('late result');
 assert.equal(await active,null);
 assert.equal(await queue.request({id:3}),null);
});

test('PERF-011 errors do not block subsequent renders',async()=>{
 let count=0;
 const queue=new GraphPreviewQueue(async()=>{
  count++;
  if(count===1)throw new Error('invalid expression');
  return 'valid preview';
 });
 await assert.rejects(queue.request({id:1}),/invalid expression/);
 assert.equal(await queue.request({id:2}),'valid preview');
});
