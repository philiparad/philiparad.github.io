import test from 'node:test';
import assert from 'node:assert/strict';
import {printPageIndexes} from '../js/print-page-selection.js';
import {resolveExport} from '../js/export-scope.js';
import {printPages} from '../js/export.js';
test('A4 page ranges are unique, ordered, bounded and include pages beyond PDF import limit',()=>{
 const board={layout:'a4',pageCount:100};assert.deepEqual(printPageIndexes(board,'100, 3-5, 1, 4, 7–8'),[0,2,3,4,6,7,99]);assert.equal(printPageIndexes(board).length,100);
 for(const input of ['', '0', '101','5-3','1,','1.5','1-999999999999999','a'])assert.throws(()=>printPageIndexes(board,input));assert.throws(()=>printPageIndexes({layout:'infinite'},'1'),/A4/);
});
test('export resolves selected A4 pages without modifying board',()=>{
 const board={layout:'a4',pageCount:5,items:[{id:'keep'}]},before=structuredClone(board);const result=resolveExport(board,{scope:'pages',pageRange:'5,2-3,2'});assert.deepEqual(result.pages,[1,2,4]);assert.deepEqual(board,before);assert.equal(result.board,board);
});
test('actual A4 print builder generates only requested sheets in their original coordinates',async()=>{
 class Element{constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.style={};}setAttribute(k,v){this.attributes[k]=String(v);}append(...nodes){this.children.push(...nodes);}remove(){}}
 const doc={body:new Element('body'),open(){},write(){},close(){},createElement:tag=>new Element(tag),importNode:n=>n,querySelectorAll:()=>[]};let printed=0;
 globalThis.document={body:new Element('body'),createElementNS:(_,tag)=>new Element(tag),createElement:tag=>Object.assign(new Element(tag),{contentDocument:doc,contentWindow:{focus(){},print(){printed++;}}})};
 const oldTimer=globalThis.setTimeout;globalThis.setTimeout=()=>0;
 const board={layout:'a4',pageCount:5,background:'plain',items:[]};
 try{await printPages(board,printPageIndexes(board,'4,2'));}finally{globalThis.setTimeout=oldTimer;}
 assert.equal(printed,1);assert.equal(doc.body.children.length,2);assert.deepEqual(doc.body.children.map(n=>n.attributes['aria-label']),['A4 page 2','A4 page 4']);
 assert.deepEqual(doc.body.children.map(n=>n.children[0].children.at(-1).attributes.transform),['translate(0 -1155)','translate(0 -3465)']);assert.equal(board.pageCount,5);
});
