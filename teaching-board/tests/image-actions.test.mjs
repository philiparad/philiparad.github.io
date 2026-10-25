import test from 'node:test';
import assert from 'node:assert/strict';
import {copySelection,pasteSelection} from '../js/selection-menu.js';
import {Editor} from '../js/editor.js';
import {History} from '../js/history.js';
import {createBoard} from '../js/model.js';
let clipboard='';Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{async writeText(s){clipboard=s;},async readText(){return clipboard;}}}});
function fixture(){const e=Object.create(Editor.prototype);e.board=createBoard('Image actions');e.board.items=[{id:'image',type:'image',x:10,y:10,w:100,h:80,src:'data:image/png;base64,AAAA',crop:{x:0,y:0,w:.5,h:.5}}];e.selected=new Set(['image']);e.clipboard=[];e.history=new History(e.document());e.save=()=>{};e.paint=()=>{};return e;}
test('context copy and paste preserve image source and crop with new identities and undo',async()=>{const e=fixture();await copySelection(e);assert.ok(clipboard.startsWith('teaching-board-selection:'));await pasteSelection(e);assert.equal(e.board.items.length,2);assert.notEqual(e.board.items[0].id,e.board.items[1].id);assert.deepEqual(e.board.items[0].crop,e.board.items[1].crop);e.undo();assert.equal(e.board.items.length,1);});
test('cut selection and paste each create reversible operations',async()=>{const e=fixture();await copySelection(e);e.remove();assert.equal(e.board.items.length,0);await pasteSelection(e);assert.equal(e.board.items.length,1);e.undo();assert.equal(e.board.items.length,0);e.undo();assert.equal(e.board.items[0].id,'image');});

const {dragCrop,croppedFrame}=await import('../js/crop-geometry.js');
test('crop box moves within the source and each handle keeps a valid area',()=>{const crop={x:.2,y:.2,w:.6,h:.6};assert.deepEqual(dragCrop(crop,{x:0,y:0},{x:1,y:-1},'move'),{x:.4,y:0,w:.6,h:.6});for(const h of ['nw','n','ne','e','se','s','sw','w']){const c=dragCrop(crop,{x:0,y:0},{x:.05,y:.05},h);assert.ok(c.x>=0&&c.y>=0&&c.w>0&&c.h>0&&c.x+c.w<=1&&c.y+c.h<=1);}});
test('crop and reset preserve an already rotated and stretched image frame',()=>{const item={...fixture().board.items[0],crop:undefined,rotation:37,imageBasis:[1,0,.2,Math.sqrt(.96)]},crop={x:.2,y:.3,w:.4,h:.5};const clipped={...item,...croppedFrame(item,crop)},restored={...clipped,...croppedFrame(clipped,{x:0,y:0,w:1,h:1})};for(const k of ['x','y','w','h'])assert.ok(Math.abs(item[k]-restored[k])<1e-8);assert.equal(restored.src,item.src);});
