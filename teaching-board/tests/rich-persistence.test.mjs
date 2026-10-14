import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';
import {createSnippet,serializeSnippet,parseSnippet,snippetCopies} from '../js/snippet-model.js';
import {sceneSVG} from '../js/scene.js';
import {pageSVG} from '../js/pages.js';
class Element{constructor(tag){this.tagName=tag;this.children=[];this.attributes={};}setAttribute(k,v){this.attributes[k]=String(v);}append(...nodes){this.children.push(...nodes);}getContext(){return {measureText:t=>({width:t.length*12})};}}
globalThis.document={createElementNS:(_,tag)=>new Element(tag),createElement:tag=>new Element(tag)};
const walk=n=>[n,...n.children.flatMap(walk)];
const equation={source:'x^2=9',src:'data:image/png;base64,AAAA',w:120,h:45};
function lesson(){const b=createBoard();b.items=[{id:'rich',type:'text',x:20,y:20,w:360,h:160,fontSize:24,text:'Solve \uFFFC\nExplain',runs:[{text:'Solve ',bold:true,color:'#b42318'},{text:'\uFFFC',equation:structuredClone(equation)},{text:'\nExplain',italic:true,underline:true}],paragraphs:[{align:'center',list:'none'},{align:'left',list:'number'}]}];return b;}
test('rich lessons survive backup, snippet file import and repeated independent insertion',()=>{
 const b=lesson(),before=structuredClone(b),restored=parseBackup(serializeBackup(b));
 const snippet=parseSnippet(serializeSnippet(createSnippet('Equation exercise',restored.items)));
 const a=snippetCopies(snippet,{x:200,y:200}),c=snippetCopies(snippet,{x:600,y:300});
 for(const item of [restored.items[0],snippet.items[0],a[0],c[0]]){assert.deepEqual(item.runs,b.items[0].runs);assert.deepEqual(item.paragraphs,b.items[0].paragraphs);}
 a[0].runs[1].equation.source='y=2';a[0].paragraphs[0].align='right';
 assert.equal(c[0].runs[1].equation.source,'x^2=9');assert.equal(snippet.items[0].paragraphs[0].align,'center');assert.deepEqual(b,before);
});
test('whole-board, transparent raster source and A4 export retain math images, readable source and text styling',()=>{
 const b=lesson(),before=structuredClone(b);
 for(const svg of [sceneSVG(b),sceneSVG(b,0,null,{transparent:true}),pageSVG({...b,layout:'a4',pageCount:1},0)]){
  const nodes=walk(svg),image=nodes.find(n=>n.tagName==='image');assert.equal(image.attributes.href,equation.src);assert.equal(image.attributes['aria-label'],equation.source);assert.equal(image.children[0].textContent,equation.source);
  const heading=nodes.find(n=>n.tagName==='text'&&n.textContent==='Solve');assert.equal(heading.attributes.fill,'#b42318');assert.equal(heading.attributes['font-weight'],'700');
  const explanation=nodes.find(n=>n.textContent==='Explain');assert.equal(explanation.attributes['font-style'],'italic');assert.equal(explanation.attributes['text-decoration'],'underline');assert.ok(nodes.some(n=>n.textContent==='1.'));
 }assert.deepEqual(b,before);
});
test('backup and snippet imports reject unsafe embedded equation images',()=>{
 const b=lesson(),backup=JSON.parse(serializeBackup(b));backup.board.items[0].runs[1].equation.src='https://example.com/tracker.png';assert.throws(()=>parseBackup(JSON.stringify(backup)),/inline equation/);
 const snippet=JSON.parse(serializeSnippet(createSnippet('Exercise',b.items)));snippet.snippet.items[0].runs[1].equation.src='data:image/svg+xml;base64,AAAA';assert.throws(()=>parseSnippet(JSON.stringify(snippet)),/inline equation/);
});
