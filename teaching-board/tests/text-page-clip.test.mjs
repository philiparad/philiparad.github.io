import test from 'node:test';
import assert from 'node:assert/strict';
import {A4,pageSVG} from '../js/pages.js';

class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.textContent='';}
 setAttribute(key,value){this.attributes[key]=String(value);}
 append(...items){this.children.push(...items);}
 getContext(){return {measureText:text=>({width:[...text].length*12})};}
}
globalThis.document={createElementNS:(_,tag)=>new Element(tag),createElement:tag=>new Element(tag)};
test('A4 exports explicitly clip text at each physical page viewport',()=>{
 const board={background:'plain',items:[{
  id:'long',type:'text',x:20,y:A4.h-24,w:160,h:18,fontSize:24,
  text:'שלום English long content that extends beyond a page boundary'
 }]};
 const before=structuredClone(board);
 const first=pageSVG(board,0),second=pageSVG(board,1);
 for(const svg of [first,second]){
  assert.equal(svg.tagName,'svg');
  assert.equal(svg.attributes.overflow,'hidden');
  assert.equal(svg.attributes.viewBox,`0 0 ${A4.w} ${A4.h}`);
  assert.equal(svg.children.at(-1).children.length,1);
 }
 assert.equal(first.children.at(-1).attributes.transform,'translate(0 0)');
 assert.equal(second.children.at(-1).attributes.transform,`translate(0 ${-(A4.h+A4.gap)})`);
 assert.deepEqual(board,before);
});
