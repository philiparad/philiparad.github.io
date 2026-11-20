import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeRasterImage,printSVGDocument} from '../js/export-raster.js';

test('PERF-017 OffscreenCanvas encodes a PNG without a base64 intermediate',async()=>{
 const before=globalThis.OffscreenCanvas;
 const calls=[],blob=new Blob(['png'],{type:'image/png'});
 let canvas;
 class FakeCanvas {
  constructor(width,height){
   this.width=width;this.height=height;canvas=this;
  }
  getContext(type){
   assert.equal(type,'2d');
   return {set fillStyle(value){calls.push(['fill',value]);},
    fillRect(...args){calls.push(['rect',...args]);},
    drawImage(...args){calls.push(['draw',...args.slice(1)])}};
  }
  async convertToBlob(args){
   calls.push(['encode',args.type]);return blob;
  }
 }
 try{
  globalThis.OffscreenCanvas=FakeCanvas;
  const result=await encodeRasterImage({id:1},{width:700,height:450});
  assert.equal(result,blob);
  assert.deepEqual(calls,[['fill','#fff'],['rect',0,0,700,450],
   ['draw',0,0,700,450],['encode','image/png']]);
  assert.equal(canvas.width,0);assert.equal(canvas.height,0);
 }finally{if(before===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=before;}
});

test('PERF-017 transparency and buffer cleanup survive encoder failures',async()=>{
 const before=globalThis.OffscreenCanvas;
 let surface,filled=false;
 class FakeCanvas {
  constructor(){this.width=300;this.height=180;surface=this;}
  getContext(){return {fillRect(){filled=true;},drawImage(){}};}
  async convertToBlob(){throw new Error('encoder failed');}
 }
 try{
  globalThis.OffscreenCanvas=FakeCanvas;
  await assert.rejects(encodeRasterImage({}, {width:300,height:180},{transparent:true}),/encoder failed/);
  assert.equal(filled,false);
  assert.equal(surface.width,0);assert.equal(surface.height,0);
 }finally{if(before===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=before;}
});

test('PERF-017 falls back to HTML canvas asynchronous toBlob',async()=>{
 const before=globalThis.OffscreenCanvas,documentBefore=globalThis.document;
 let surface;
 try{
  delete globalThis.OffscreenCanvas;
  globalThis.document={createElement(type){
   assert.equal(type,'canvas');
   surface={width:0,height:0,getContext:()=>({fillRect(){},drawImage(){}}),
    toBlob(resolve,type){assert.equal(type,'image/png');resolve(new Blob(['png'],{type}));}};
   return surface;
  }};
  const result=await encodeRasterImage({},{width:64,height:32});
  assert.equal(result.type,'image/png');
  assert.equal(surface.width,0);assert.equal(surface.height,0);
 }finally{
  if(before===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=before;
  if(documentBefore===undefined)delete globalThis.document;else globalThis.document=documentBefore;
 }
});

test('PERF-017 non-A4 printing embeds SVG URL directly, without raster conversion',()=>{
 const calls=[];
 const doc={title:'',body:{append(...nodes){calls.push(['append',...nodes]);}},
  open(){calls.push(['open']);},write(value){calls.push(['write',value]);},close(){calls.push(['close']);},
  createElement(name){return {tagName:name};}};
 const result=printSVGDocument(doc,'blob:https://example.invalid/svg-resource','Test Lesson');
 assert.equal(result.tagName,'img');
 assert.equal(result.src,'blob:https://example.invalid/svg-resource');
 assert.equal(doc.title,'Test Lesson');
 assert.equal(calls.some(row=>row[0]==='append'),true);
 assert.equal(calls.some(row=>row[0]==='write'&&row[1].includes('A4 landscape')),true);
});

test('PERF-017 rejects unusable dimensions before canvas allocation',async()=>{
 for(const bad of [{width:0,height:200},{width:Infinity,height:1},{width:5.5,height:2}]){
  await assert.rejects(encodeRasterImage({},bad),/Invalid raster export dimensions/);
 }
});
