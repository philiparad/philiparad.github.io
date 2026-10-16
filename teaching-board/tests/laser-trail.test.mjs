import test from 'node:test';
import assert from 'node:assert/strict';
import {trailSegments,LaserTrail} from '../js/laser-trail.js';
test('laser segments fade, expire, and never join separate gestures',()=>{
 const p=[{x:0,y:0,time:0,start:true},{x:10,y:10,time:100},{x:50,y:50,time:200,start:true}];
 const s=trailSegments(p,350);assert.equal(s.length,3);assert.ok(s[0].opacity<s[1].opacity);assert.equal(s[1].start,p[0]);assert.equal(s[2].start,p[2]);
 assert.equal(trailSegments(p,901).length,0);
});
test('laser rendering uses viewport coordinates without changing lesson data',()=>{
 const old=globalThis.document;const make=()=>({attrs:{},children:[],setAttribute(k,v){this.attrs[k]=v;},append(...n){this.children.push(...n);},remove(){}});globalThis.document={createElementNS:make};
 try{const e={board:{viewport:{x:50,y:-20,zoom:2},items:[]},svg:make()},before=JSON.stringify(e.board),trail=new LaserTrail(e);
 trail.points=[{x:10,y:30,time:100,start:true}];trail.render(200);assert.equal(trail.layer.children[0].attrs.x1,'70');assert.equal(trail.layer.children[0].attrs.y1,'40');assert.equal(JSON.stringify(e.board),before);trail.render(1000);assert.equal(trail.points.length,0);trail.dispose();
 }finally{globalThis.document=old;}
});
