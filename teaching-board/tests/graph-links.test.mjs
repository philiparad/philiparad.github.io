import test from 'node:test';
import assert from 'node:assert/strict';
import {linkedGraphs,linkGraphs} from '../js/graph-links.js';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';
const graph=id=>({id,type:'graph',x:0,y:0,w:640,h:440,source:'x',src:'data:image/png;base64,AAAA',range:[-5,5,-5,5]});
test('linking graphs merges complete existing sets without changing geometry or drawing groups',()=>{
 const items=['a','b','c','d','e'].map(graph);items[0].groupId='drawing';linkGraphs(items,new Set(['a','b']));linkGraphs(items,new Set(['c','d']));assert.notEqual(items[0].graphLinkId,items[2].graphLinkId);
 linkGraphs(items,new Set(['a','c']));assert.equal(new Set(items.slice(0,4).map(i=>i.graphLinkId)).size,1);assert.equal(items[4].graphLinkId,undefined);assert.equal(items[0].groupId,'drawing');assert.equal(items[0].w,640);assert.deepEqual(linkedGraphs(items,new Set(['b'])).map(i=>i.id),['a','b','c','d']);assert.equal(linkGraphs(items,new Set(['a','b'])),false);
});
test('invalid and locked selections leave every graph unchanged',()=>{
 const items=['a','b','c'].map(graph);linkGraphs(items,new Set(['a','b']));items[1].locked=true;const before=structuredClone(items);assert.throws(()=>linkGraphs(items,new Set(['a','c'])),/Unlock/);assert.deepEqual(items,before);
 assert.throws(()=>linkGraphs(items,new Set(['c'])),/two graphs/);assert.throws(()=>linkGraphs([...items,{id:'text',type:'text'}],new Set(['c','text'])),/two graphs/);
});
test('graph memberships survive backup and malformed memberships are rejected',()=>{
 const b=createBoard();b.items=['a','b'].map(graph);linkGraphs(b.items,new Set(['a','b']));assert.deepEqual(parseBackup(serializeBackup(b)).items,b.items);
 b.items[0].graphLinkId={};assert.throws(()=>serializeBackup(b),/graph link/);
 b.items=[{id:'t',type:'text',text:'Hi',x:0,y:0,graphLinkId:'wrong'}];assert.throws(()=>serializeBackup(b),/graph link/);
});
