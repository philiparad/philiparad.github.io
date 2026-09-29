import assert from 'node:assert/strict';
import { hsvHex,hexHsv,validFavorite } from '../js/fill-palette.js';
import { createBoard,validateBoard,serializeBackup,parseBackup } from '../js/model.js';
import { drawItem } from '../js/scene.js';
assert.equal(hsvHex(0,1,1),'#ff0000');assert.equal(hsvHex(120,1,1),'#00ff00');assert.equal(hsvHex(240,1,1),'#0000ff');
for(const color of ['#fff1a8','#000000','#ffffff','#147d92','#e633a6'])assert.equal(hsvHex(...hexHsv(color)),color);
assert(validFavorite({color:'#abcdef',alpha:.4}));assert(!validFavorite({color:'invalid',alpha:1}));assert(!validFavorite({color:'#abcdef',alpha:2}));
const board=createBoard('Transparent fill');board.items=[{id:'shape',type:'rectangle',x:0,y:0,w:100,h:100,fill:'#ff0000',fillOpacity:.25,stroke:'#000000'}];assert.deepEqual(parseBackup(serializeBackup(board)),board);assert.throws(()=>validateBoard({...board,items:[{...board.items[0],fillOpacity:-1}]}));
class Element{constructor(tag){this.tag=tag;this.attrs={};this.children=[];}setAttribute(k,v){this.attrs[k]=String(v);}append(...nodes){this.children.push(...nodes);}}
globalThis.document={createElementNS:(_,tag)=>new Element(tag)};
const rendered=drawItem(board.items[0]);assert.equal(rendered.children[0].attrs['fill-opacity'],'0.25');assert.equal(rendered.attrs.opacity,'1');assert.equal(rendered.children[0].attrs.stroke,'#000000');assert.equal(drawItem({...board.items[0],type:'note',fill:'none',text:'Note'}).children[0].attrs.fill,'none');
console.log('17 fill palette regression checks passed');
