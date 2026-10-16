import test from 'node:test';
import assert from 'node:assert/strict';
import {History,serializedBytes} from '../js/history.js';
export function historyFixture(){return {items:Array.from({length:1000},(_,i)=>({id:String(i),type:'rectangle',x:i,y:i,w:20,h:30,fill:'#ffffff'})),background:'grid'};}
test('history reports estimated retained storage and bounded undo entries',()=>{
 const b=historyFixture(),h=new History(b,20);const initial=h.stats();
 for(let n=0;n<30;n++){b.items[0].x=n+10;h.commit(b);}
 assert.equal(h.stats().undoEntries,20);assert.equal(h.stats().redoEntries,0);assert.ok(h.stats().estimatedBytes>initial.estimatedBytes);
 assert.ok(h.stats().estimatedBytes<serializedBytes(b)*23);
 h.undo();assert.equal(h.stats().redoEntries,1);assert.equal(h.stats().undoEntries,19);
 const restored=h.redo();assert.deepEqual(restored,b);restored.items[0].x=-999;assert.notEqual(h.current.items[0].x,-999);
});
test('no-op commits preserve redo and Unicode measurements count bytes',()=>{
 const h=new History({items:[],title:'שלום'});assert.ok(serializedBytes(h.current)>JSON.stringify(h.current).length);
 h.commit({items:[],title:'changed'});h.undo();const before=h.stats();assert.equal(h.commit(h.current),false);assert.deepEqual(h.stats(),before);
});
