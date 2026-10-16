import test from 'node:test';
import assert from 'node:assert/strict';
import {backgroundOptions} from '../js/background-options.js';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';
import {History} from '../js/history.js';
import {background,sceneSVG} from '../js/scene.js';
import {pageSVG} from '../js/pages.js';
test('A4 and export render saved custom paper consistently while transparent export omits paper',()=>{
 const old=globalThis.document;const make=()=>({attrs:{},children:[],setAttribute(k,v){this.attrs[k]=String(v);},append(...nodes){this.children.push(...nodes);}});
 globalThis.document={createElementNS:make};
 try{
 const b=createBoard();b.background='dots';b.backgroundOptions={color:'#fff4dd',lineColor:'#8899aa',spacing:48};b.layout='a4';b.pageCount=2;
 const restored=parseBackup(serializeBackup(b));
 for(const svg of [pageSVG(restored,1),sceneSVG(restored)]){assert.equal(svg.children[1].attrs.fill,'#fff4dd');const pattern=svg.children[0].children[0];assert.equal(pattern.attrs.width,'48');assert.equal(pattern.children[0].attrs.fill,'#8899aa');}
 assert.equal(sceneSVG(restored,30,null,{transparent:true}).children.length,1);
 }finally{globalThis.document=old;}
});
test('background defaults preserve old lessons and invalid custom settings are rejected',()=>{
 assert.deepEqual(backgroundOptions('grid'),{color:'#ffffff',lineColor:'#e4e9ef',spacing:32});
 assert.equal(backgroundOptions('dark').color,'#1d293b');
 for(const options of [{spacing:0},{spacing:Infinity},{spacing:257},{color:'url(bad)'},{lineColor:'red'},null])assert.throws(()=>backgroundOptions('grid',options));
 const board=createBoard();board.backgroundOptions={spacing:-1};assert.throws(()=>serializeBackup(board));
});
test('custom background survives save and undo to legacy defaults',()=>{
 const board=createBoard(),h=new History({backgroundOptions:undefined});
 board.backgroundOptions={color:'#fff4dd',lineColor:'#8899aa',spacing:48};
 h.commit({backgroundOptions:board.backgroundOptions});
 assert.deepEqual(parseBackup(serializeBackup(board)).backgroundOptions,board.backgroundOptions);
 assert.equal(h.undo().backgroundOptions,undefined);assert.deepEqual(h.redo().backgroundOptions,board.backgroundOptions);
});
test('background renderer applies spacing, colors, and viewport transform',()=>{
 const old=globalThis.document;const make=()=>({attrs:{},children:[],setAttribute(k,v){this.attrs[k]=String(v);},append(...nodes){this.children.push(...nodes);}});
 globalThis.document={createElementNS:make};
 try{const svg=make();background(svg,'ruled',{x:10,y:20,zoom:2},'test',{color:'#fff4dd',lineColor:'#8899aa',spacing:48});
 const pattern=svg.children[0].children[0];assert.equal(pattern.attrs.width,'48');assert.equal(pattern.attrs.patternTransform,'translate(10 20) scale(2)');
 assert.equal(pattern.children[0].attrs.d,'M0 48H48');assert.equal(pattern.children[0].attrs.stroke,'#8899aa');assert.equal(svg.children[1].attrs.fill,'#fff4dd');
 }finally{globalThis.document=old;}
});
