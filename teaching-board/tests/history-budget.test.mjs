import test from 'node:test';
import assert from 'node:assert/strict';
import {History} from '../js/history.js';
const image='data:image/png;base64,'+'A'.repeat(100000);
test('repeated image insertions share one retained asset and restore real content',()=>{
 const b={items:[]},h=new History(b);
 for(let n=0;n<20;n++){b.items.push({id:String(n),src:image,x:n});h.commit(b);}
 assert.equal(h.stats().sharedAssets,1);assert.ok(h.stats().estimatedBytes<125000);
 for(let n=19;n>=0;n--){const state=h.undo();assert.equal(state.items.length,n);if(n)assert.equal(state.items[0].src,image);}
 for(let n=1;n<=20;n++){const state=h.redo();assert.equal(state.items.length,n);assert.equal(state.items[n-1].src,image);}
});
test('budget prunes oldest undo entries but preserves current lesson and remaining history',()=>{
 const b={items:[{id:'a',x:0}]},h=new History(b,80,{maxBytes:1200});
 for(let n=1;n<=40;n++){b.items[0].x=n;h.commit(b);}
 const count=h.past.length;assert.ok(count>0&&count<40);assert.ok(h.stats().estimatedBytes<=1200);assert.deepEqual(h.current,b);
 for(let n=0;n<count;n++)assert.equal(h.undo().items[0].x,39-n);
 while(h.future.length)h.redo();assert.deepEqual(h.current,b);
});
test('branching after undo releases unreachable assets and never corrupts literal reference-like objects',()=>{
 const h=new History({items:[]});h.commit({items:[{src:image,meta:{id:1}}]});h.undo();h.commit({items:[{id:'new',meta:{id:1}}]});
 assert.equal(h.stats().sharedAssets,0);assert.equal(h.redo(),null);assert.deepEqual(h.current.items[0].meta,{id:1});
});
test('a document larger than the budget survives with history trimmed',()=>{
 const b={items:[]},h=new History(b,80,{maxBytes:1000});b.items=[{src:image}];h.commit(b);
 assert.deepEqual(h.current,b);assert.equal(h.past.length,0);assert.equal(h.future.length,0);assert.equal(h.stats().sharedAssets,0);assert.equal(h.stats().overBudget,true);assert.equal(h.undo(),null);
});
