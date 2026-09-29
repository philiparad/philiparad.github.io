import assert from 'node:assert/strict';
import { drawItem } from '../js/scene.js';
import { LINE_STYLES } from '../js/line-style.js';
import { createBoard,serializeBackup,parseBackup } from '../js/model.js';
class Element{constructor(tag){this.tag=tag;this.attrs={};this.children=[];}setAttribute(k,v){this.attrs[k]=String(v);}append(...nodes){this.children.push(...nodes);}}
globalThis.document={createElementNS:(_,tag)=>new Element(tag)};
const tap={id:'tap',type:'path',x:50,y:80,w:1,h:1,points:[[0,0]],rawPoints:[[0,0]],lineWidth:8,stroke:'#123456',opacity:.4,smoothing:.65};
for(const [lineStyle]of LINE_STYLES){const g=drawItem({...tap,lineStyle});assert.equal(g.children.length,1);assert.equal(g.children[0].tag,'circle');assert.equal(g.children[0].attrs.r,'4');assert.equal(g.children[0].attrs.fill,'#123456');assert.equal(g.attrs.opacity,'0.4');}
assert.equal(drawItem({...tap,points:[[0,0],[10,5]]}).children[0].tag,'polyline');
assert.equal(drawItem({...tap,points:[[0,0],[0,0]]}).children[0].tag,'circle');
const b=createBoard('Pen tap');b.items=[tap];assert.deepEqual(parseBackup(serializeBackup(b)).items,[tap]);
console.log('Pen taps render with every line style; moving strokes and backups remain intact.');
