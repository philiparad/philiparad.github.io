import test from 'node:test';
import assert from 'node:assert/strict';
import {drawItem} from '../js/scene.js';
import {equationLines} from '../js/inline-equation.js';

class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.textContent='';}
 setAttribute(key,value){this.attributes[key]=String(value);}
 append(...nodes){this.children.push(...nodes);}
 getContext(){return {measureText:text=>({width:Array.from(text).length*12})};}
}
const original=globalThis.document;
globalThis.document={createElementNS:(_,tag)=>new Element(tag),createElement:tag=>new Element(tag)};
const flatten=node=>[node,...node.children.flatMap(flatten)];
test('ordinary text and inline equations use consistent measured SVG text nodes',()=>{
 const base={id:'txt',type:'text',x:0,y:0,w:280,h:180,fontSize:24,text:'שלום English',paragraphs:[{align:'right',list:'none',dir:'rtl'}]};
 const plain=flatten(drawItem(base));
 assert.ok(plain.some(n=>n.tagName==='text'&&n.textContent==='שלום'));
 assert.ok(plain.some(n=>n.tagName==='text'&&n.textContent==='English'));
 assert.ok(plain.filter(n=>n.tagName==='text').every(n=>n.attributes['unicode-bidi']==='isolate'));
 const eq={source:'x^2',src:'data:image/png;base64,AAAA',w:90,h:45};
 const mixed={...base,text:'שלום \uFFFC English',runs:[{text:'שלום '},{text:'\uFFFC',equation:eq},{text:' English'}]};
 const nodes=flatten(drawItem(mixed));
 assert.equal(nodes.filter(n=>n.tagName==='image').length,1);
 assert.ok(nodes.some(n=>n.tagName==='text'&&n.textContent==='English'));
 assert.ok(nodes.some(n=>n.tagName==='text'&&n.textContent==='שלום'));
});
test('measured wrapping splits long Unicode words without breaking grapheme clusters',()=>{
 const rows=[{align:'left',dir:'ltr',list:'none',runs:[{text:'supercalifragilistic'},{text:' 👨‍👩‍👧‍👦'}]}];
 const lines=equationLines(rows,48,24,text=>[...text].length*12);
 assert.ok(lines.length>=5);
 const text=lines.flatMap(line=>line.parts).map(part=>part.text).join('');
 assert.equal(text,'supercalifragilistic 👨‍👩‍👧‍👦');
 assert.ok(lines.some(line=>line.parts.some(p=>p.text==='👨‍👩‍👧‍👦')));
 assert.ok(lines.every(line=>line.width<=48||line.parts.some(p=>p.text==='👨‍👩‍👧‍👦')));
});
test('explicit per-paragraph direction overrides language of first word',()=>{
 const item={id:'direction',type:'text',x:0,y:0,w:500,h:200,fontSize:24,text:'English עברית\nשלום English',
  runs:[{text:'English עברית\nשלום English'}],
  paragraphs:[{align:'right',list:'none',dir:'rtl'},{align:'left',list:'none',dir:'ltr'}]};
 const texts=flatten(drawItem(item)).filter(n=>n.tagName==='text');
 const english=texts.find(n=>n.textContent==='English');
 assert.equal(english.attributes['text-anchor'],'end');
 const hebrew=texts.find(n=>n.textContent==='שלום');
 assert.equal(hebrew.attributes['text-anchor'],'start');
});
