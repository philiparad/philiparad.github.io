import test from 'node:test';
import assert from 'node:assert/strict';
import {GRAPH_EXAMPLES,graphExample} from '../js/graph-examples.js';
import {graphSeries,compileSeries} from '../js/graph-series.js';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';
test('every example compiles, has usable bounds and retains editable data through backup',()=>{
 assert.equal(new Set(GRAPH_EXAMPLES.map(x=>x.id)).size,GRAPH_EXAMPLES.length);
 for(const entry of GRAPH_EXAMPLES){const e=graphExample(entry.id);assert.ok(e.range.every(Number.isFinite));assert.ok(e.range[0]<e.range[2]&&e.range[3]<e.range[1]);const rows=graphSeries(e.series,e.parameters),params=Object.fromEntries(e.parameters.map(p=>[p.name,p.value]));for(const row of rows){const f=compileSeries(row,params);assert.ok(Number.isFinite(f.x(0))&&Number.isFinite(f.y(0)));}const board=createBoard();board.items=[{id:'example',type:'graph',x:0,y:0,w:640,h:488,src:'data:image/png;base64,AAAA',source:rows[0].source,series:rows,parameters:e.parameters,range:e.range}];assert.deepEqual(parseBackup(serializeBackup(board)).items,board.items);}
});
test('editing a loaded example cannot change future examples or leave old parameters behind',()=>{
 const a=graphExample('parameter');a.series[0].source='x';a.parameters[0].value=2;a.range[0]=0;
 const b=graphExample('parameter');assert.equal(b.series[0].source,'a*x^2');assert.equal(b.parameters[0].value,1);assert.equal(b.range[0],-5);assert.deepEqual(graphExample('linear').parameters,[]);assert.throws(()=>graphExample('missing'));
});
