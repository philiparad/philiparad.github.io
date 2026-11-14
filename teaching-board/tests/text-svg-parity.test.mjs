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
 assert.ok(lines.every(line=>line.width<=48));
 assert.ok(lines.some(line=>line.parts.some(p=>p.text==='👨‍👩‍👧‍👦'&&p.fitText===true)));
});
test('explicit per-paragraph direction overrides language of first word',()=>{
 const item={id:'direction',type:'text',x:0,y:0,w:500,h:200,fontSize:24,text:'English עברית\nשלום English',
  runs:[{text:'English עברית\nשלום English'}],
  paragraphs:[{align:'right',list:'none',dir:'rtl'},{align:'left',list:'none',dir:'ltr'}]};
 const texts=flatten(drawItem(item)).filter(n=>n.tagName==='text');
 const english=texts.find(n=>n.textContent==='English');
 assert.equal(english.attributes['text-anchor'],'end');
 const hebrew=texts.find(n=>n.textContent==='שלום');
 assert.equal(hebrew.attributes['text-anchor'],'end');
});

test('oversized grapheme is compressed in SVG without modifying source text',()=>{
 const item={id:'emoji',type:'text',x:0,y:0,w:35,h:100,fontSize:24,text:'👨‍👩‍👧‍👦'};
 const elements=flatten(drawItem(item)).filter(n=>n.tagName==='text');
 assert.equal(elements.map(n=>n.textContent).join(''),'👨‍👩‍👧‍👦');
 assert.equal(elements.length,1);
 assert.equal(elements[0].attributes.textLength,'35');
 assert.equal(elements[0].attributes.lengthAdjust,'spacingAndGlyphs');
});

test('SVG token anchors account for mixed Hebrew and English directions',()=>{
 const item={id:'mixed-bidi',type:'text',x:0,y:0,w:480,h:120,fontSize:24,
  text:'שלום English\nEnglish עברית',
  paragraphs:[{align:'right',list:'none',dir:'rtl'},
              {align:'left',list:'none',dir:'ltr'}]};
 const nodes=flatten(drawItem(item)).filter(n=>n.tagName==='text'&&n.textContent.trim());
 const before=nodes.filter(n=>Number(n.attributes.y)<50);
 const after=nodes.filter(n=>Number(n.attributes.y)>=50);
 assert.equal(before.find(n=>n.textContent==='שלום')?.attributes['text-anchor'],'start');
 assert.equal(before.find(n=>n.textContent==='English')?.attributes['text-anchor'],'end');
 assert.equal(after.find(n=>n.textContent==='English')?.attributes['text-anchor'],'start');
 assert.equal(after.find(n=>n.textContent==='עברית')?.attributes['text-anchor'],'end');
});

test('rendered SVG equation bottom follows the same text baseline in RTL and LTR',()=>{
 const equation={source:'\\frac{x^2}{2}',src:'data:image/png;base64,AAAA',w:48,h:90};
 for(const dir of ['rtl','ltr']){
  const item={id:'math-baseline-'+dir,type:'text',x:0,y:0,w:350,h:12,fontSize:24,
   text:'שלום \uFFFC English',
   runs:[{text:'שלום '},{text:'\uFFFC',equation},{text:' English'}],
   paragraphs:[{align:dir==='rtl'?'right':'left',dir,list:'none'}]};
  const svg=flatten(drawItem(item)),image=svg.find(n=>n.tagName==='image');
  assert.ok(image,'Expected a visible SVG inline equation');
  const tokens=svg.filter(n=>n.tagName==='text');
  const top=Number(image.attributes.y),height=Number(image.attributes.height);
  assert.ok(top>=-1e-8,'Equation must not escape the first line vertically');
  assert.ok(height>24);
  const baseline=top+height;
  const nearby=tokens.filter(n=>Math.abs(Number(n.attributes.y)-baseline)<1e-8);
  assert.ok(nearby.some(n=>n.textContent.includes('שלום')),'Equation must share its baseline with Hebrew');
  assert.ok(nearby.some(n=>n.textContent.includes('English')),'Equation must share its baseline with English');
  const x=Number(image.attributes.x),w=Number(image.attributes.width);
  assert.ok(x>=-1e-8&&x+w<=item.w+1e-8);
 }
});
