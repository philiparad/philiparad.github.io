import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePDFPages,renderPDFPages} from '../js/pdf-pages.js';
test('PDF selection deduplicates, orders and accepts subsets of long documents',()=>{
 assert.deepEqual(parsePDFPages(' 5, 1, 3-5, 1 ',50),[1,3,4,5]);
 assert.deepEqual(parsePDFPages('31-33',100),[31,32,33]);
 assert.equal(parsePDFPages('1-30, 1-30',30).length,30);
});
test('PDF ranges reject invalid input and enforce the unique-page limit',()=>{
 for(const value of ['', '0','-1','2-1','1-31','31','1,,2','1.5','1e2','all','1-','1;2','2-3-4','1,'.repeat(600)])assert.throws(()=>parsePDFPages(value,30));
 assert.throws(()=>parsePDFPages('1-30,32',50),/30 unique/);
 assert.throws(()=>parsePDFPages('1',0));assert.throws(()=>parsePDFPages('1',NaN));
});
function fixture({fail=false,large=false}={}){
 const requested=[],cleaned=[],canvases=[];
 globalThis.document={createElement(){const c={getContext:()=>({}),toDataURL:()=>large?'x'.repeat(20000001):'data:image/jpeg;base64,AAAA'};canvases.push(c);return c;}};
 const pdf={numPages:40,async getPage(n){requested.push(n);return {getViewport:({scale})=>({width:600*scale,height:900*scale}),render:()=>({promise:fail?Promise.reject(new Error('Render failed')):Promise.resolve()}),cleanup:()=>cleaned.push(n)};}};
 return {pdf,requested,cleaned,canvases};
}
test('PDF rendering requests only selected pages and releases each canvas',async()=>{
 const f=fixture(),progress=[];const result=await renderPDFPages(f.pdf,[33,1,33],s=>progress.push(s));
 assert.deepEqual(f.requested,[1,33]);assert.deepEqual(f.cleaned,[1,33]);assert.equal(result.length,2);assert.ok(Math.abs(result[0].h-1200)<1e-9);assert.ok(progress[1].includes('33 (2 of 2)'));
 assert.ok(f.canvases.every(c=>c.width===0&&c.height===0));
});
test('PDF rendering cleans up on failure and validates before work starts',async()=>{
 let f=fixture({fail:true});await assert.rejects(renderPDFPages(f.pdf,[1,2]),/Render failed/);assert.deepEqual(f.cleaned,[1]);assert.equal(f.canvases[0].width,0);
 f=fixture({large:true});await assert.rejects(renderPDFPages(f.pdf,[1]),/too large/);assert.deepEqual(f.cleaned,[1]);
 f=fixture();await assert.rejects(renderPDFPages(f.pdf,[41]));assert.deepEqual(f.requested,[]);
});
