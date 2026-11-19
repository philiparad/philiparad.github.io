import test from 'node:test';
import assert from 'node:assert/strict';
import {textLayoutMetrics} from '../js/inline-equation.js';
import {textMeasurer} from '../js/text-measure.js?v=20261119-perf003';
import {canvasTextFont} from '../js/text-font.js';

function canvasDocument(){
 let canvases=0,contexts=0,measurements=0,currentFont='';
 const listeners=new Map();
 const context={
  get font(){return currentFont;},
  set font(value){currentFont=value;},
  measureText(text){measurements++;return {width:Array.from(text).length*10};}
 };
 const fonts={
  addEventListener(name,fn){listeners.set(name,fn);},
  removeEventListener(name,fn){if(listeners.get(name)===fn)listeners.delete(name);},
  emit(name){listeners.get(name)?.();}
 };
 const doc={
  fonts,
  createElement(tag){
   assert.equal(tag,'canvas');canvases++;
   return {getContext(kind){assert.equal(kind,'2d');contexts++;return context;}};
  }
 };
 return {doc,fonts,stats:()=>({canvases,contexts,measurements,currentFont})};
}
const paragraph=(text,style={})=>[{align:'left',dir:'ltr',list:'none',runs:[{text,...style}]}];

test('PERF-003: canvas context and word measurements are reused across repeated layouts',()=>{
 const previous=globalThis.document,fixture=canvasDocument();
 try{
  globalThis.document=fixture.doc;
  const item={type:'text',w:600,fontSize:24};
  const rows=paragraph('reuse reuse reuse');
  const initial=textLayoutMetrics(item,rows);
  const count=fixture.stats().measurements;
  assert.equal(fixture.stats().canvases,1);
  assert.equal(fixture.stats().contexts,1);
  assert.equal(count,2,'measure each distinct token and space once');
  for(let i=0;i<30;i++)assert.deepEqual(textLayoutMetrics(item,rows),initial);
  assert.equal(fixture.stats().canvases,1);
  assert.equal(fixture.stats().measurements,count);
  assert.equal(textLayoutMetrics(item,paragraph('reuse reuse reuse')).height,initial.height);
  assert.equal(fixture.stats().measurements,count,'reconstructed paragraph runs still share widths');
  assert.deepEqual(textLayoutMetrics(item,rows,(text)=>Array.from(text).length*10),initial);
  assert.equal(fixture.stats().measurements,count,'explicit measurement callback is not replaced');
 }finally{globalThis.document=previous;}
});

test('PERF-003: font size, emphasis, font loading and document changes invalidate correctly',()=>{
 const previous=globalThis.document,a=canvasDocument(),b=canvasDocument();
 try{
  globalThis.document=a.doc;
  const item={type:'note',w:200,fontSize:24};
  const rows=paragraph('unique');
  textLayoutMetrics(item,rows);
  assert.equal(a.stats().measurements,1);
  textLayoutMetrics(item,rows);
  assert.equal(a.stats().measurements,1);
  textLayoutMetrics(item,paragraph('unique',{bold:true}));
  assert.equal(a.stats().measurements,2);
  assert.equal(a.stats().currentFont,canvasTextFont(24,{bold:true}));
  item.fontSize=30;
  textLayoutMetrics(item,rows);
  assert.equal(a.stats().measurements,3);
  a.fonts.emit('loadingdone');
  textLayoutMetrics(item,rows);
  assert.equal(a.stats().measurements,4,'font loading forces remeasurement');
  a.fonts.emit('loadingerror');
  textLayoutMetrics(item,rows);
  assert.equal(a.stats().measurements,5);
  globalThis.document=b.doc;
  textLayoutMetrics(item,rows);
  assert.equal(b.stats().canvases,1);
  assert.equal(b.stats().measurements,1,'new document gets its own canvas');
  assert.equal(a.stats().canvases,1,'old document canvas is not recreated');
 }finally{globalThis.document=previous;}
});

test('PERF-003: no-DOM fallback matches the original width approximation',()=>{
 const previous=globalThis.document;
 try{
  delete globalThis.document;
  const item={type:'text',fontSize:24,w:60};
  const rows=paragraph('עברית English');
  const original=textLayoutMetrics(item,rows,(text)=>Array.from(text).length*24*.55);
  assert.deepEqual(textLayoutMetrics(item,rows),original);
 }finally{globalThis.document=previous;}
});

test('PERF-003: the shared token cache has a bounded LRU capacity',()=>{
 const previous=globalThis.document,fixture=canvasDocument();
 try{
  globalThis.document=fixture.doc;
  const measure=textMeasurer(24);
  for(let i=0;i<4096;i++)measure('word-'+i,{});
  assert.equal(fixture.stats().canvases,1);
  assert.equal(fixture.stats().measurements,4096);
  measure('word-0',{});
  assert.equal(fixture.stats().measurements,4096,'recently used entry remains cached');
  measure('word-4096',{});
  assert.equal(fixture.stats().measurements,4097);
  measure('word-1',{});
  assert.equal(fixture.stats().measurements,4098,'least recently used entry is evicted');
  measure('word-0',{});
  assert.equal(fixture.stats().measurements,4098,'frequently used entry remains cached');
 }finally{globalThis.document=previous;}
});
