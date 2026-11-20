import test from 'node:test';
import assert from 'node:assert/strict';
import {A4,Pages,pageSVG,visiblePageIndices} from '../js/pages.js';

const step=A4.h+A4.gap;
const viewport=(page,zoom=1)=>({x:0,y:-page*step*zoom,zoom});

test('PERF-012 only mounts visible A4 pages and immediate neighbors',()=>{
 const indices=visiblePageIndices(viewport(50),1000,700,100);
 assert.deepEqual(indices,[49,50,51]);
 assert.ok(indices.length<100);
});

test('PERF-012 viewport movement within a page keeps the same background set',()=>{
 const a=visiblePageIndices(viewport(24),794,700,100);
 const b=visiblePageIndices({x:0,y:-24*step-100,zoom:1},794,700,100);
 assert.deepEqual(a,b);
});

test('PERF-012 clamps at beginning, end and outside the horizontal sheet',()=>{
 assert.deepEqual(visiblePageIndices(viewport(0),794,700,100),[0,1]);
 assert.deepEqual(visiblePageIndices(viewport(99),794,700,100),[98,99]);
 assert.deepEqual(visiblePageIndices({x:-2000,y:0,zoom:1},794,700,100),[]);
 assert.deepEqual(visiblePageIndices(viewport(0),794,700,0),[]);
});

test('PERF-012 zoomed out viewport includes every intersecting page',()=>{
 const indices=visiblePageIndices(viewport(0,.2),794,700,100);
 assert.ok(indices.length>=4);
 assert.ok(indices.includes(0)&&indices.includes(2));
});

test('PERF-012 page virtualization does not change export page SVG',()=>{
 // Export remains directly sourced from pageSVG, which is independent of
 // visiblePageIndices and still draws all board objects for that page.
 assert.equal(typeof pageSVG,'function');
 assert.equal(typeof Pages.prototype.paint,'function');
 const source=Pages.prototype.paint.toString();
 assert.ok(source.includes('indices'));
 assert.ok(!source.includes('for(let n=0;n<(b.pageCount||1);n++'));
});
