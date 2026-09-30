import assert from 'node:assert/strict';
import { FillPalette } from '../js/fill-palette.js';
import { drawItem } from '../js/scene.js';
import { createBoard,validateBoard,serializeBackup,parseBackup } from '../js/model.js';
class Element{constructor(tag){this.tag=tag;this.attrs={};this.children=[];}setAttribute(k,v){this.attrs[k]=String(v);}append(...nodes){this.children.push(...nodes);}}
globalThis.document={createElementNS:(_,tag)=>new Element(tag)};
const shape={id:'shape',type:'rectangle',x:0,y:0,w:100,h:100,stroke:'#e32a0c',strokeOpacity:.4,fill:'#3464ea',fillOpacity:.8};
const board=createBoard('Stroke');board.items=[shape];
assert.deepEqual(parseBackup(serializeBackup(board)),board);
for(const alpha of [-1,2,NaN])assert.throws(()=>validateBoard({...board,items:[{...shape,strokeOpacity:alpha}]}));
let node=drawItem(shape);assert.equal(node.children[0].attrs['stroke-opacity'],'0.4');assert.equal(node.children[0].attrs['fill-opacity'],'0.8');assert.equal(node.attrs.opacity,'1');
for(const type of ['path','text']){node=drawItem({...shape,type,points:[[0,0]],text:'Test'});assert.equal(node.children[0].attrs['fill-opacity'],'0.4');}
assert.equal(drawItem({...shape,strokeOpacity:undefined}).children[0].attrs['stroke-opacity'],'1');
const locked={...shape,id:'locked',locked:true},image={...shape,id:'image',type:'image'};let commits=0;
const e={board:{items:[shape,locked,image]},selected:new Set(['shape','locked','image']),commit(){commits++;}};
FillPalette.prototype.apply.call({e,key:'stroke',alphaKey:'strokeOpacity',types:new Set(['rectangle']),root:{},summary:{focus(){}}},'#000000',.6);
assert.equal(shape.stroke,'#000000');assert.equal(shape.strokeOpacity,.6);assert.equal(shape.fillOpacity,.8);assert.equal(locked.stroke,'#e32a0c');assert.equal(image.stroke,'#e32a0c');assert.equal(commits,1);
console.log('Stroke rendering, persistence, selection and locked-object checks passed');
