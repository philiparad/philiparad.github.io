import test from 'node:test';
import assert from 'node:assert/strict';
import {connectionAnchor,syncConnectors} from '../js/connectors.js';
import {copiedItems} from '../js/groups.js';
const rectangle=(id,x,y=0)=>({id,type:'rectangle',x,y,w:100,h:100});
const arrow=()=>({id:'c',type:'arrow',x:0,y:0,w:1,h:1,points:[[0,0],[1,1]],links:{start:'a',end:'b'}});
const world=i=>i.points.map(([x,y])=>[x+i.x,y+i.y]);
test('anchors follow resized, rotated and elliptical target frames',()=>{
 const a=rectangle('a',0),b=rectangle('b',300),c=arrow();syncConnectors([a,b,c]);assert.deepEqual(world(c),[[100,50],[300,50]]);
 b.x=500;syncConnectors([a,b,c]);assert.deepEqual(world(c),[[100,50],[500,50]]);
 a.w=200;syncConnectors([a,b,c]);assert.deepEqual(world(c),[[200,50],[500,50]]);
 a.rotation=90;syncConnectors([a,b,c]);assert.ok(Math.abs(world(c)[0][0]-150)<1e-8);
 const e={...rectangle('e',0),type:'ellipse'};const [x,y]=connectionAnchor(e,[100,100]);assert.ok(Math.abs((x-50)**2+(y-50)**2-2500)<1e-8);
});
test('missing targets detach one end without losing the remaining connection',()=>{
 const a=rectangle('a',0),b=rectangle('b',300),c=arrow();syncConnectors([a,b,c]);const old=world(c);
 b.y=100;syncConnectors([b,c]);assert.equal(c.links.start,null);assert.deepEqual(world(c)[0],old[0]);assert.notDeepEqual(world(c)[1],old[1]);
 const last=world(c);syncConnectors([c]);assert.equal(c.links,undefined);assert.deepEqual(world(c),last);
});
test('copied diagrams remap targets and standalone connector copies detach',()=>{
 const a=rectangle('a',0),b=rectangle('b',300),c=arrow();syncConnectors([a,b,c]);
 const copies=copiedItems([a,b,c]);assert.equal(copies[2].links.start,copies[0].id);assert.equal(copies[2].links.end,copies[1].id);syncConnectors(copies);
 assert.deepEqual(world(copies[2]),world(c).map(p=>p.map(v=>v+30)));
 assert.equal(copiedItems([c])[0].links,undefined);
 const partial=copiedItems([a,c]);assert.equal(partial[1].links.start,partial[0].id);assert.equal(partial[1].links.end,null);
});
test('coincident targets keep finite endpoint geometry',()=>{
 const a=rectangle('a',0),b=rectangle('b',0),c=arrow();syncConnectors([a,b,c]);assert.ok(world(c).flat().every(Number.isFinite));assert.deepEqual(world(c),[[100,50],[0,50]]);
});
