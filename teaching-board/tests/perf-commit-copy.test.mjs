import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,checkBoard,validateBoard} from '../js/model.js';
import {SaveQueue} from '../js/save-queue.js';
import {History} from '../js/history.js';

function boardFixture(){
 const board=createBoard('Snapshot copy regression');
 board.items=[
  {id:'rect',type:'rectangle',x:10,y:20,w:50,h:60,fill:'#ffffff'},
  {id:'image',type:'image',x:10,y:90,w:30,h:40,src:'data:image/png;base64,'+'A'.repeat(50000)}
 ];
 return board;
}

test('PERF-007 copy-free board check preserves validation and does not clone data',()=>{
 const board=boardFixture(),before=structuredClone(board);
 const original=globalThis.structuredClone;
 let copies=0;
 try{
  globalThis.structuredClone=(value,...args)=>{copies++;return original(value,...args);};
  assert.equal(checkBoard(board),board);
  assert.equal(copies,0,'validation must not create a discarded board copy');
 }finally{globalThis.structuredClone=original;}
 assert.deepEqual(board,before);
 const copy=validateBoard(board);
 assert.deepEqual(copy,board);
 assert.notEqual(copy,board);
 assert.notEqual(copy.items,board.items);
 copy.items[0].x=999;
 assert.equal(board.items[0].x,10,'persisted data still gets an independent copy');
 for(const invalid of [
  {...board,viewport:{x:0,y:0,zoom:0}},
  {...board,items:[...board.items,{...board.items[0]}]},
  {...board,items:[{...board.items[0],x:Infinity}]}
 ])assert.throws(()=>checkBoard(invalid));
});

test('PERF-007 detached save queue skips a second board clone and preserves write order',async()=>{
 const seen=[],started=[],releases=[];
 const queue=new SaveQueue(async snapshot=>{
  started.push(snapshot);
  if(started.length===1)await new Promise(resolve=>releases.push(resolve));
  seen.push(snapshot);
 });
 const first=boardFixture(),second=boardFixture();second.title='Newest committed snapshot';
 const original=globalThis.structuredClone;
 let copies=0;
 try{
  globalThis.structuredClone=(value,...args)=>{copies++;return original(value,...args);};
  const saving=queue.enqueueDetached(first);
  assert.equal(started[0],first,'trusted detached snapshot must be written by reference');
  const queued=queue.enqueueDetached(second);
  assert.equal(copies,0,'trusted handoff must not copy large board assets');
  releases[0]();
  await Promise.all([saving,queued]);
  assert.deepEqual(seen,[first,second]);
  assert.equal(queue.dirty,false);
  const mutable=boardFixture();
  await queue.enqueue(mutable);
  assert.equal(copies,1,'ordinary callers still receive a defensive clone');
  assert.notEqual(seen[2],mutable);
  mutable.items[0].x=999;
  assert.equal(seen[2].items[0].x,10);
 }finally{globalThis.structuredClone=original;}
});

test('PERF-007 history owns each committed snapshot, unaffected by later live edits',()=>{
 const board=boardFixture();
 const history=new History({items:board.items,background:board.background});
 const next={items:board.items,background:board.background};
 board.items[0].x=42;
 assert.equal(history.commit(next),true);
 const snapshot=history.current;
 assert.notEqual(snapshot.items,board.items);
 board.items[0].x=73;
 assert.equal(snapshot.items[0].x,42);
 assert.equal(history.undo().items[0].x,10);
 assert.equal(history.redo().items[0].x,42);
});
