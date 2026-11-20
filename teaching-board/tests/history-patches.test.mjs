import test from 'node:test';
import assert from 'node:assert/strict';
import {History} from '../js/history.js';
test('mixed edits match reference snapshots through every undo and redo',()=>{
 const b={items:[],background:'grid',optional:undefined},h=new History(b,100),states=[structuredClone(b)];
 for(let n=0;n<60;n++){
  if(n%6===0)b.items.push({id:String(n),x:n,points:[[0,0],[1,2]],style:{bold:false}});
  if(n%6===1){b.items[0].x++;b.items[0].points.push([n,n]);}
  if(n%6===2){b.items.reverse();b.background=n%2?'dots':'plain';b.optional={color:'#fff4dd'};}
  if(n%6===3){b.items[0].style.bold=true;delete b.optional;}
  if(n%6===4){b.items.unshift({id:'new'+n,x:0,points:[],style:{}});}
  if(n%6===5)b.items.splice(0,1);
  if(h.commit(b))states.push(structuredClone(b));
 }
 for(let n=states.length-2;n>=0;n--)assert.deepEqual(h.undo(),states[n]);assert.equal(h.undo(),null);
 for(let n=1;n<states.length;n++)assert.deepEqual(h.redo(),states[n]);assert.equal(h.redo(),null);
 h.undo();b.items=[];h.commit(b);assert.equal(h.redo(),null);
});
test('small changes do not retain unchanged large document fields',()=>{
 const b={items:[{id:'image',x:0,src:'data:image/png;base64,'+'A'.repeat(1000000)}]},h=new History(b);
 const initial=h.stats().estimatedBytes;for(let n=1;n<=40;n++){b.items[0].x=n;h.commit(b);}
 assert.ok(h.stats().estimatedBytes-initial<15000);for(let n=39;n>=0;n--)assert.equal(h.undo().items[0].x,n);
});
test('array removals, optional undefined values and returned states remain isolated',()=>{
 const h=new History({items:[{id:'a'},{id:'b'}],value:undefined});
 h.commit({items:[{id:'b'}]});const a=h.undo();assert.ok(Object.hasOwn(a,'value'));a.items[0].id='mutated';
 assert.deepEqual(h.redo(),{items:[{id:'b'}]});assert.equal(h.undo().items[0].id,'a');
});

test('PERF-015 large array insertion comparisons avoid JSON serialization of objects',()=>{
 const payload='data:image/png;base64,'+'X'.repeat(16000);
 const items=Array.from({length:300},(_,i)=>({id:'item-'+i,points:[[i,0],[i+1,1]],src:payload}));
 const h=new History({items});
 const next={items:[{id:'inserted',points:[[0,0]]},...items]};
 const stringify=JSON.stringify;
 let serializedArrays=0,serializedObjects=0;
 try{
  JSON.stringify=function(value,...args){
   if(Array.isArray(value))serializedArrays++;
   if(value&&typeof value==='object')serializedObjects++;
   return stringify.call(this,value,...args);
  };
  assert.equal(h.commit(next),true);
 }finally{JSON.stringify=stringify;}
 assert.equal(serializedArrays,0,'Comparing array prefix/suffix must not serialize large arrays');
 assert.equal(serializedObjects,0,'Comparing array objects must not serialize whole objects');
 assert.equal(h.undo().items.length,300);
 assert.equal(h.redo().items.length,301);
});

test('PERF-015 undo/redo clones the returned lesson once without cloning the input board',()=>{
 const original={items:[{id:'picture',x:0,src:'image:'+'A'.repeat(64000)}],title:'Lesson'};
 const h=new History(original);
 h.commit({...original,items:[{...original.items[0],x:25}]});
 const clone=globalThis.structuredClone;
 let boardCopies=0;
 try{
  globalThis.structuredClone=function(value,...args){
   if(value&&typeof value==='object'&&Array.isArray(value.items))boardCopies++;
   return clone(value,...args);
  };
  const undone=h.undo();
  assert.equal(boardCopies,1,'Undo must not duplicate an already owned full history snapshot');
  undone.items[0].x=999;
  assert.equal(h.current.items[0].x,0,'Returned history state must remain detached');
  boardCopies=0;
  const redone=h.redo();
  assert.equal(boardCopies,1,'Redo must not duplicate an already owned full history snapshot');
  redone.items[0].x=-99;
  assert.equal(h.current.items[0].x,25);
 }finally{globalThis.structuredClone=clone;}
});
