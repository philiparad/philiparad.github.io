import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,validateBoard} from '../js/model.js';
import {recoveryCopy,retainedSnapshots,shouldSnapshot,RECOVERY_INTERVAL,RecoveryRepository} from '../js/recovery-storage.js';
import {Recovery} from '../js/recovery.js';
import {SaveQueue} from '../js/save-queue.js';
const fixture=()=>({...createBoard('Original lesson'),layout:'a4',pageCount:3,items:[{id:'image',type:'image',src:'data:image/png;base64,YQ==',x:0,y:0,w:200,h:100,locked:true},{id:'text',type:'text',text:'שלום',x:10,y:110,w:200,h:50,fontSize:26,textStyle:'bold'}]});
test('recovery restores a validated, independent editable lesson while preserving original',async()=>{
 const original=fixture(),before=structuredClone(original);original.deleted=true;const copy=recoveryCopy(original);validateBoard(copy);assert.notEqual(copy.id,original.id);assert.equal(copy.revision,0);assert.equal(copy.deleted,false);assert.equal(copy.title,'Original lesson (recovered)');assert.equal(copy.pageCount,3);assert.deepEqual(copy.items,original.items);copy.items[1].text='Changed';assert.equal(original.items[1].text,before.items[1].text);
 const repo=new RecoveryRepository();repo.get=async()=>({board:original});let saved;await repo.restore('snapshot',{save:async b=>{saved=b;return b;}});assert.notEqual(saved.id,original.id);assert.equal(original.deleted,true);repo.get=async()=>null;await assert.rejects(repo.restore('missing',{}),/no longer available/);
});
test('automatic snapshots are spaced and ignore viewport/revision-only saves',()=>{
 const board=fixture(),now=Date.now(),previous={createdAt:new Date(now).toISOString(),board};assert.equal(shouldSnapshot(null,createBoard(),true,now),false);assert.equal(shouldSnapshot(null,board,true,now),true);
 const moved={...board,viewport:{x:500,y:-300,zoom:2},revision:88};assert.equal(shouldSnapshot(previous,moved,true,now+RECOVERY_INTERVAL),false);
 const changed={...board,title:'Revised'};assert.equal(shouldSnapshot(previous,changed,true,now+1000),false);assert.equal(shouldSnapshot(previous,changed,true,now+RECOVERY_INTERVAL),true);assert.equal(shouldSnapshot(previous,board,false,now),true);
});
test('snapshot retention keeps the newest five and enforces the per-lesson byte budget',()=>{
 const values=Array.from({length:7},(_,i)=>({id:String(i),createdAt:new Date(1000*i).toISOString(),bytes:100}));assert.deepEqual(retainedSnapshots(values).map(s=>s.id),['6','5','4','3','2']);
 assert.deepEqual(retainedSnapshots(values.map(v=>({...v,bytes:20_000_000}))).map(s=>s.id),['6','5']);
});
test('snapshot failures do not reject a normal save or block later manual recovery',async()=>{
 const editor={disposed:false},recovery=new Recovery(editor,{capture:async()=>{throw new Error('Quota');}});recovery.status={};let saved=false;const queue=new SaveQueue(async board=>{saved=true;recovery.auto(board);});await queue.enqueue(fixture());await recovery.pending;await Promise.resolve();assert.equal(saved,true);assert.equal(queue.dirty,false);assert.match(recovery.status.textContent,/unavailable/);
 recovery.repository={capture:async b=>({board:b})};const board=fixture(),job=recovery.capture(board,false);board.title='Changed after capture';assert.equal((await job).board.title,'Original lesson');
});
