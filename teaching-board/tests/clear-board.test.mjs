import test from 'node:test';
import assert from 'node:assert/strict';
import {Editor} from '../js/editor.js';
import {History} from '../js/history.js';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';
function fixture(){
 const e=Object.create(Editor.prototype);e.board=createBoard('Keep this lesson');
 e.board.items=[{id:'a',type:'rectangle',x:0,y:0,w:50,h:40,locked:true,groupId:'group'},{id:'b',type:'rectangle',x:200,y:200,w:50,h:40,groupId:'group'}];
 Object.assign(e.board,{layout:'a4',pageCount:3,background:'dots',backgroundOptions:{color:'#fff4dd',lineColor:'#8899aa',spacing:48},viewport:{x:123,y:-456,zoom:2}});
 e.selected=new Set(['b']);e.geometry={reset(){e.geometryReset=true;}};e.laserTrail={clear(){e.laserCleared=true;}};e.cancelPaint=()=>{};e.paint=()=>{};e.svg={focus(){}};e.save=()=>{e.saved=(e.saved||0)+1;};e.history=new History(e.document());
 return e;
}
test('clear removes all objects including locked groups as one undoable saved action',()=>{
 const e=fixture(),before=structuredClone(e.board);e.clearBoard();
 assert.deepEqual(e.board.items,[]);assert.equal(e.selected.size,0);assert.equal(e.history.past.length,1);assert.equal(e.saved,1);
 assert.deepEqual({...e.board,items:before.items},before);assert.deepEqual(parseBackup(serializeBackup(e.board)).items,[]);
 Object.assign(e.board,e.history.undo());assert.deepEqual(e.board,before);Object.assign(e.board,e.history.redo());assert.deepEqual(e.board.items,[]);
});
test('clear discards transient gestures, and repeated empty clears do not add history',()=>{
 const e=fixture();e.drag={kind:'draw'};e.draft={type:'path'};e.polygon=[[1,2]];e.marquee={};e.guides=[1];e.clearBoard();
 assert.equal(e.drag,null);assert.equal(e.draft,null);assert.deepEqual(e.polygon,[]);assert.equal(e.marquee,null);assert.deepEqual(e.guides,[]);assert.ok(e.geometryReset&&e.laserCleared);
 e.clearBoard();assert.equal(e.history.past.length,1);assert.equal(e.saved,1);
});
test('clear first finishes inline text and leaves invalid active editing untouched',()=>{
 const e=fixture();let finished=false;e.inlineText={finish(save,focus){assert.equal(save,true);assert.equal(focus,false);finished=true;}};
 e.clearBoard();assert.ok(finished);assert.equal(e.board.items.length,2);assert.equal(e.history.past.length,0);
 e.inlineText={finish(){e.inlineText=null;}};e.clearBoard();assert.equal(e.board.items.length,0);
});
test('large board clear remains reversible even above history budget',()=>{
 const before={items:[{id:'large',src:'data:image/png;base64,'+'A'.repeat(100000)}]},h=new History(before,80,{maxBytes:1000});
 h.commit({items:[]},{retainLatest:true});assert.equal(h.past.length,1);assert.equal(h.stats().overBudget,true);
 assert.deepEqual(h.undo(),before);assert.deepEqual(h.redo(),{items:[]});
 h.commit({items:[{id:'new'}]});assert.equal(h.stats().sharedAssets,0);assert.ok(h.stats().estimatedBytes<=1000);
});
