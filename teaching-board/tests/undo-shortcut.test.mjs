import test from 'node:test';
import assert from 'node:assert/strict';
import {Editor} from '../js/editor.js';
import {History} from '../js/history.js';
import {createBoard} from '../js/model.js';
let dialog=false;
globalThis.document={querySelector:()=>dialog?{}:null};
function fixture(){const e=Object.create(Editor.prototype);e.board=createBoard('Undo shortcuts');e.selected=new Set();e.history=new History(e.document());e.save=()=>{};e.paint=()=>{};e.action=fn=>fn();return e;}
function key(e,overrides={}){const event={key:'z',code:'KeyZ',ctrlKey:true,metaKey:false,shiftKey:false,altKey:false,target:{},preventDefault(){this.prevented=true;},...overrides};e.onKey(event);return event;}
function add(e,id){e.board.items.push({id,type:'rectangle',x:10,y:20,w:50,h:50});e.history.commit(e.document());}
test('Ctrl+Z undoes one completed action at a time with English and Hebrew layouts',()=>{for(const letter of ['z','Z','ז']){const e=fixture();add(e,'a');add(e,'b');assert.ok(key(e,{key:letter}).prevented);assert.deepEqual(e.board.items.map(i=>i.id),['a']);key(e,{key:letter});assert.equal(e.board.items.length,0);key(e,{key:letter});assert.equal(e.board.items.length,0);}});
test('Ctrl+Shift+Z and Ctrl+Y redo in either layout; Command+Z also works',()=>{for(const redo of [{key:'ז',shiftKey:true},{key:'ט',code:'KeyY'}]){const e=fixture();add(e,'a');key(e,{ctrlKey:false,metaKey:true,key:'ז'});assert.equal(e.board.items.length,0);assert.ok(key(e,redo).prevented);assert.equal(e.board.items.length,1);}});
test('text inputs, dialogs, composition, handled events and Alt chords keep their own behavior',()=>{for(const overrides of [{target:{isContentEditable:true}},{target:{closest:()=>({})}},{isComposing:true},{defaultPrevented:true},{altKey:true}]){const e=fixture();add(e,'a');assert.ok(!key(e,overrides).prevented);assert.equal(e.board.items.length,1);}const e=fixture();add(e,'a');e.inlineText={};assert.ok(!key(e).prevented);e.inlineText=null;dialog=true;assert.ok(!key(e).prevented);dialog=false;assert.equal(e.board.items.length,1);});
test('physical key wins over layout character, with fallback for keyboards without a code',()=>{const e=fixture();add(e,'a');key(e,{code:'KeyW'});assert.equal(e.board.items.length,1);assert.ok(key(e,{code:''}).prevented);assert.equal(e.board.items.length,0);});
test('a new edit after keyboard undo discards redo',()=>{const e=fixture();add(e,'a');add(e,'b');key(e);add(e,'c');key(e,{shiftKey:true});assert.deepEqual(e.board.items.map(i=>i.id),['a','c']);});
