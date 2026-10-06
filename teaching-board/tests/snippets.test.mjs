import test from 'node:test';
import assert from 'node:assert/strict';
import {createSnippet,validateSnippet,snippetCopies,serializeSnippet,parseSnippet} from '../js/snippet-model.js';
import {union} from '../js/scene.js';
import {syncConnectors} from '../js/connectors.js';
const diagram=()=>{
 const items=[{id:'a',type:'rectangle',x:100,y:200,w:100,h:80,groupId:'g',locked:true},{id:'b',type:'text',x:400,y:240,w:200,h:100,fontSize:26,text:'שלום\nExplain why',groupId:'g'},{id:'arrow',type:'arrow',x:0,y:0,w:1,h:1,points:[[0,0],[1,1]],links:{start:'a',end:'b'},groupId:'g'}];syncConnectors(items);return items;
};
test('saved snippets isolate original objects and preserve internal groups and connections',()=>{
 const source=diagram(),old=structuredClone(source),saved=createSnippet('Diagram',source);
 assert.deepEqual(source,old);assert.notEqual(saved.items[0].id,source[0].id);assert.equal(saved.items[0].locked,false);
 assert.equal(saved.items[2].links.start,saved.items[0].id);assert.equal(saved.items[2].links.end,saved.items[1].id);assert.equal(new Set(saved.items.map(i=>i.groupId)).size,1);
 source[1].text='Changed';assert.equal(saved.items[1].text,'שלום\nExplain why');
});
test('insertions are centered and independent of saved snippet and each other',()=>{
 const saved=createSnippet('Diagram',diagram()),first=snippetCopies(saved,{x:750,y:600}),second=snippetCopies(saved,{x:-200,y:70}),box=union(first);
 assert.equal(box.x+box.w/2,750);assert.equal(box.y+box.h/2,600);
 assert.notEqual(first[0].id,second[0].id);assert.notEqual(first[0].groupId,second[0].groupId);
 first[1].text='Edited';assert.equal(saved.items[1].text,'שלום\nExplain why');assert.equal(second[1].text,'שלום\nExplain why');
 assert.equal(first[2].links.start,first[0].id);assert.equal(second[2].links.end,second[1].id);
});
test('partial selections detach external links without changing the source connector',()=>{
 const source=diagram(),snippet=createSnippet('Partial',[source[0],source[2]]);
 assert.equal(snippet.items[1].links.start,snippet.items[0].id);assert.equal(snippet.items[1].links.end,null);assert.equal(source[2].links.end,'b');
 const arrow=createSnippet('Free arrow',[source[2]]);assert.equal(arrow.items[0].links,undefined);
});
test('snippet export/import roundtrip preserves editable data and restores as a new saved item',()=>{
 const original=createSnippet('Formula diagram',diagram());original.deleted=true;
 const imported=parseSnippet(serializeSnippet(original));assert.notEqual(imported.id,original.id);assert.equal(imported.deleted,false);assert.equal(imported.title,original.title);assert.equal(imported.items[1].text,original.items[1].text);assert.equal(imported.items[2].links.end,imported.items[1].id);
});
test('snippet validation rejects invalid data before it can reach a lesson',()=>{
 assert.throws(()=>createSnippet(' ',diagram()),/name/);assert.throws(()=>createSnippet('Empty',[]),/1,000/);
 const saved=createSnippet('Diagram',diagram());saved.items[0].x=Infinity;assert.throws(()=>validateSnippet(saved),/position/);
 assert.throws(()=>parseSnippet('{"format":"wrong","version":1}'),/exported/);
 assert.throws(()=>parseSnippet(' '.repeat(5_000_201)),/5 MB/);
 const bad=createSnippet('Diagram',diagram());bad.items.push({id:'bad',type:'image',x:0,y:0,w:50,h:50,src:'javascript:alert(1)'});assert.throws(()=>validateSnippet(bad),/image/);
});
