import test from 'node:test';
import assert from 'node:assert/strict';
import {planA4Import} from '../js/pdf-a4.js';
import {A4,pageRect} from '../js/pages.js';
import {Editor} from '../js/editor.js';
import {createBoard,validateBoard,serializeBackup} from '../js/model.js';
import {History} from '../js/history.js';
const images=[{w:800,h:500,src:'data:image/jpeg;base64,YQ=='},{w:400,h:1200,src:'data:image/jpeg;base64,Yg=='}];
function fixture(){const e=Object.create(Editor.prototype);e.board=createBoard();e.selected=new Set();e.history=new History(e.document());e.setTool=()=>{};e.save=()=>{};e.paint=()=>{};e.fit=()=>{e.fitted=true;};e.center=()=>({x:200,y:300});e.pages={go:index=>{e.page=index;}};return e;}
test('A4 imports contain mixed aspect ratios inside separate sheets without mutating inputs',()=>{
 const b=createBoard(),original=structuredClone(images),plan=planA4Import(b,images);
 assert.equal(plan.start,0);assert.equal(plan.pageCount,2);assert.deepEqual(images,original);assert.equal(b.layout,undefined);
 plan.images.forEach((p,i)=>{const r=pageRect(i);assert.ok(p.x>=24-1e-9&&p.x+p.w<=A4.w-24+1e-9);assert.ok(p.y>=r.y+24-1e-9&&p.y+p.h<=r.y+A4.h-24+1e-9);assert.ok(Math.abs(p.w/p.h-images[i].w/images[i].h)<1e-9);});
});
test('A4 import is one undoable change and survives editable backup validation',()=>{
 const e=fixture(),before=e.document();e.insertMediaItems(images,'pdf','a4');assert.equal(e.board.layout,'a4');assert.equal(e.board.pageCount,2);assert.equal(e.page,0);assert.equal(e.fitted,undefined);assert.equal(e.history.past.length,1);assert.ok(e.board.items.every(i=>i.locked));validateBoard(JSON.parse(serializeBackup(e.board)).board);
 const after=e.document();Object.assign(e.board,e.history.undo());assert.deepEqual(e.document(),before);Object.assign(e.board,e.history.redo());assert.deepEqual(e.document(),after);
 const kept=structuredClone(e.board.items);e.insertMediaItems(images,'pdf','a4');assert.equal(e.board.pageCount,4);assert.equal(e.page,2);assert.deepEqual(e.board.items.slice(0,2),kept);assert.ok(e.board.items[2].y>=pageRect(2).y);assert.equal(new Set(e.board.items.map(i=>i.id)).size,4);
});
test('A4 limits and invalid input leave document and history unchanged',()=>{
 const e=fixture();e.board.layout='a4';e.board.pageCount=99;const before=structuredClone(e.board);assert.throws(()=>e.insertMediaItems(images,'pdf','a4'),/100 pages/);assert.deepEqual(e.board,before);assert.equal(e.history.past.length,0);
 assert.throws(()=>planA4Import(createBoard(),[{w:0,h:100}]),/dimensions/);
 const b=createBoard();b.items=[{id:'existing'}];assert.throws(()=>planA4Import(b,images),/Switch Canvas layout/);
 const blank=createBoard();blank.layout='a4';blank.pageCount=3;assert.equal(planA4Import(blank,images).start,3);
});
test('existing canvas PDF placement and empty insertion remain unchanged',()=>{
 const e=fixture();e.insertMediaItems([],'pdf','a4');assert.equal(e.history.past.length,0);
 e.insertMediaItems([{...images[0],x:850,y:0}],'pdf','horizontal');assert.equal(e.board.items[0].x,1050);assert.equal(e.board.items[0].y,300);assert.equal(e.board.layout,undefined);assert.equal(e.fitted,true);
});
