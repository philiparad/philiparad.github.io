import test from 'node:test';
import assert from 'node:assert/strict';
import {importImage,importedImageEncoding} from '../js/media.js';
import {encodePDFPage} from '../js/pdf-pages.js';
import {createBoard,parseBackup,serializeBackup} from '../js/model.js';

test('PERF-010 retain compatible original image encoding and scale lossy media without PNG inflation',()=>{
 for(const type of ['image/jpeg','image/webp','image/png'])
  assert.equal(importedImageEncoding(type,false),'original',type+' should not be transcoded');
 assert.equal(importedImageEncoding('image/jpeg',true),'image/jpeg');
 assert.equal(importedImageEncoding('image/webp',true),'image/webp');
 assert.equal(importedImageEncoding('image/png',true),'image/png');
 assert.equal(importedImageEncoding('image/gif',false),'image/png');
 assert.equal(importedImageEncoding('image/gif',true),'image/png');
});

async function fakeImport({type,width=1600,height=900,decodeError=false}){
 const old={Image:globalThis.Image,FileReader:globalThis.FileReader,
  document:globalThis.document,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 const tracking={created:0,revoked:0,read:0,canvas:0,requested:[],canvases:[]};
 globalThis.Image=class{
  naturalWidth=width;naturalHeight=height;
  set src(value){if(decodeError)this.onerror?.();else this.onload?.();}
 };
 globalThis.FileReader=class{
  readAsDataURL(file){tracking.read++;this.result='data:'+file.type+';base64,YWJj';
   this.onload?.();}
 };
 URL.createObjectURL=()=>{tracking.created++;return 'blob:fake-media';};
 URL.revokeObjectURL=()=>{tracking.revoked++;};
 globalThis.document={createElement(name){
  assert.equal(name,'canvas');
  tracking.canvas++;
  const canvas={width:0,height:0,getContext(){return{drawImage(){}};},
   toDataURL(mime,quality){tracking.requested.push([mime,quality]);
    return 'data:'+mime+';base64,cmVzaXplZA==';}};
  tracking.canvases.push(canvas);return canvas;
 }};
 try{
  return {result:await importImage({type,size:550000}),tracking};
 }finally{
  globalThis.Image=old.Image;globalThis.FileReader=old.FileReader;
  globalThis.document=old.document;
  URL.createObjectURL=old.create;URL.revokeObjectURL=old.revoke;
 }
}

test('PERF-010 imports unscaled JPEG, WebP and PNG without canvas or extra copy',async()=>{
 for(const type of ['image/jpeg','image/webp','image/png']){
  const {result,tracking}=await fakeImport({type});
  assert.equal(result.src,'data:'+type+';base64,YWJj');
  assert.equal(result.w,800);assert.equal(result.h,450);
  assert.deepEqual([tracking.created,tracking.revoked,tracking.read,tracking.canvas],[1,1,1,0]);
 }
});

test('PERF-010 scales JPEG/WebP in their compressed format and clears large canvases',async()=>{
 for(const type of ['image/jpeg','image/webp','image/png']){
  const {result,tracking}=await fakeImport({type,width:4400,height:2200});
  assert.equal(result.src.startsWith('data:'+type+';base64,'),true);
  assert.equal(result.w,800);assert.equal(result.h,400);
  assert.deepEqual([tracking.created,tracking.revoked,tracking.read,tracking.canvas],[1,1,0,1]);
  assert.deepEqual(tracking.requested[0],[type,type==='image/png'?undefined:.88]);
  assert.equal(tracking.canvases[0].width,0);
  assert.equal(tracking.canvases[0].height,0);
 }
});

test('PERF-010 converts unsupported animated GIF to static PNG and revokes failed URLs',async()=>{
 const {result,tracking}=await fakeImport({type:'image/gif',width:42,height:20});
 assert.equal(result.src.startsWith('data:image/png;base64,'),true);
 assert.equal(result.w,42);assert.equal(result.h,20);
 assert.deepEqual([tracking.created,tracking.revoked,tracking.read,tracking.canvas],[1,1,0,1]);
 const old={Image:globalThis.Image,create:URL.createObjectURL,revoke:URL.revokeObjectURL};
 let revoked=0;
 globalThis.Image=class{set src(value){this.onerror?.();}};
 URL.createObjectURL=()=> 'blob:broken';URL.revokeObjectURL=()=>revoked++;
 try{
  await assert.rejects(importImage({type:'image/jpeg',size:100}),/could not be decoded/i);
  assert.equal(revoked,1,'Invalid input must not leak a Blob URL');
 }finally{
  globalThis.Image=old.Image;URL.createObjectURL=old.create;URL.revokeObjectURL=old.revoke;
 }
 await assert.rejects(importImage({type:'application/octet-stream',size:100}),/Choose PNG/);
 await assert.rejects(importImage({type:'image/jpeg',size:15_000_001}),/under 15 MB/);
});

test('PERF-010 PDF uses WebP only for material savings, safely falls back to JPEG',()=>{
 const jpg='data:image/jpeg;base64,'+'A'.repeat(100);
 const small='data:image/webp;base64,'+'B'.repeat(65);
 const large='data:image/webp;base64,'+'B'.repeat(95);
 const encoded=(webp)=>({toDataURL(type,quality){
  assert.equal(quality,type==='image/jpeg'?.86:.88);
  return type==='image/jpeg'?jpg:webp;
 }});
 assert.equal(encodePDFPage(encoded(small)),small);
 assert.equal(encodePDFPage(encoded(large)),jpg);
 assert.equal(encodePDFPage(encoded('data:image/png;base64,Zg==')),jpg);
 assert.equal(encodePDFPage({toDataURL(type){if(type==='image/webp')throw Error('no codec');return jpg;}}),jpg);
});

test('PERF-010 editable backups preserve compressed image and PDF page MIME types',()=>{
 const board=createBoard('Visual algebra');
 board.items=['image/jpeg','image/webp','image/png'].map((mime,index)=>({
  id:'asset'+index,type:'image',x:index*100,y:0,w:80,h:40,
  src:'data:'+mime+';base64,YWJj'
 }));
 const backup=serializeBackup(board),restored=parseBackup(backup);
 assert.deepEqual(restored.items,board.items);
 for(const item of restored.items)assert.ok(item.src.startsWith('data:image/'));
});
