import assert from 'node:assert/strict';
import {SHAPES,drawPreset,scaledPath} from '../js/shapes.js';
import {createBoard,serializeBackup,parseBackup,validateBoard} from '../js/model.js';
class Element{constructor(tag){this.tag=tag;this.attrs={};this.children=[];}setAttribute(k,v){this.attrs[k]=String(v);}append(...nodes){this.children.push(...nodes);}}
globalThis.document={createElementNS:(_,tag)=>new Element(tag)};
const board=createBoard('Shapes');
for(const [shape,spec]of SHAPES){const item={id:shape,type:'shape',shape,x:10,y:20,w:210,h:90,stroke:'#123456',fill:'#abcdef',strokeOpacity:.5,fillOpacity:.3,lineWidth:3,lineStyle:'dashed'};board.items.push(item);const g=drawPreset(item);assert(g.children.length);for(const p of g.children){assert(!/NaN|Infinity/.test(p.attrs.d),shape);assert.equal(p.attrs['stroke-opacity'],'0.5');assert.equal(p.attrs['fill-opacity'],'0.3');assert.equal(p.attrs['stroke-width'],'3');assert.equal(p.attrs.fill,spec.paths[g.children.indexOf(p)].closed?'#abcdef':'none');}}
assert.equal(SHAPES.size,33);assert.deepEqual(parseBackup(serializeBackup(board)),board);assert.throws(()=>validateBoard({...board,items:[{...board.items[0],shape:'invalid'}]}));assert.equal(scaledPath('M0 0 L100 100',200,50),'M0 0 L200 50');
console.log('All 33 shape presets render, scale, style, and survive backup');
