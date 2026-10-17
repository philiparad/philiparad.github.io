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
