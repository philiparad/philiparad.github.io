import test from 'node:test';
import assert from 'node:assert/strict';
import {A4,Pages,textOverflowWarnings} from '../js/pages.js';
import {textObjectHeight} from '../js/scene.js';

const text=(id,y,extra={})=>({id,type:'text',x:30,y,w:200,h:20,fontSize:24,text:'Short text',...extra});
const board=(items,count=2)=>({layout:'a4',pageCount:count,items});
const step=A4.h+A4.gap;

test('text fitting within an A4 page is not reported',()=>{
 const b=board([text('one',50),text('two',step+120)]);
 const old=structuredClone(b);
 assert.deepEqual(textOverflowWarnings(b),[]);
 assert.deepEqual(b,old);
 assert.deepEqual(textOverflowWarnings({...b,layout:'infinite'}),[]);
});
test('text crossing a page gap is detected without modifying its source',()=>{
 const b=board([text('gap',A4.h-10)]);
 assert.deepEqual(textOverflowWarnings(b),[{id:'gap',reason:'page-gap',page:0}]);
 assert.equal(b.items[0].y,A4.h-10);
});
test('out-of-range text, horizontal overflow and expanded legacy height are reported',()=>{
 const tooTall=text('legacy',A4.h-250,{w:70,h:12,text:'Long '.repeat(9)});
 assert.ok(textObjectHeight(tooTall)>250);
 const issues=textOverflowWarnings(board([
  tooTall,
  text('outside',step+A4.h-5),
  text('left',10,{x:-5}),
  text('right',10,{x:720,w:130}),
  text('above',-20)
 ]));
 assert.deepEqual(issues.map(x=>[x.id,x.reason]),[
  ['legacy','page-gap'],
  ['outside','outside-pages'],
  ['left','horizontal'],
  ['right','horizontal'],
  ['above','outside-pages']
 ]);
});
test('overflow checker accepts single-page lessons and clamps navigation target',()=>{
 const issues=textOverflowWarnings(board([text('tail',A4.h-8)],1));
 assert.deepEqual(issues,[{id:'tail',reason:'outside-pages',page:0}]);
});
test('A4 text-fit action selects the first affected box without editing the board',async()=>{
 const oldDocument=globalThis.document,oldSetTimeout=globalThis.setTimeout;
 globalThis.setTimeout=()=>0;
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.style={};this.value='';this.hidden=false;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(name,value){this[name]=String(value);}
 }
 globalThis.document={createElement:tag=>new Element(tag),querySelector:()=>({textContent:''})};
 try{
  // Controls use injectable UI helpers from pages.js.
  const b=board([text('gap',A4.h-10)]),initial=structuredClone(b);
  const e={board:{...b,viewport:{zoom:1,x:0,y:0}},area:{clientHeight:700,clientWidth:1000},selected:new Set(),paint(){},save(){}};
  const pages=new Pages(e);e.pages=pages;pages.controls();pages.update();
  assert.equal(pages.textFit.hidden,false);
  await pages.textFit.onclick();
  assert.deepEqual([...e.selected],['gap']);
  assert.deepEqual(e.board.items,initial.items);
  e.board.layout='infinite';pages.update();assert.equal(pages.textFit.hidden,true);
 }finally{globalThis.document=oldDocument;globalThis.setTimeout=oldSetTimeout;}
});
