import test from 'node:test';
import assert from 'node:assert/strict';
import {graphSeries,compileSeries,validateParameters} from '../js/graph-series.js';
import {createBoard,serializeBackup,parseBackup,validateBoard} from '../js/model.js';
import {createSnippet,snippetCopies} from '../js/snippet-model.js';
const parameters=()=>[{name:'a',value:2,min:-10,max:10}];
const row={source:'a*x^2',color:'#147d92',visible:true};
test('shared parameters evaluate ordinary, parametric and polar curves',()=>{
 assert.equal(compileSeries(graphSeries([row],parameters())[0],{a:2}).y(3),18);
 const p=compileSeries({...row,kind:'parametric',xSource:'a*cos(t)',source:'a*sin(t)'},{a:2});assert.equal(p.x(0),2);
 const r=compileSeries({...row,kind:'polar',source:'a'},{a:-2});assert.equal(r.x(0),-2);
 assert.throws(()=>graphSeries([row]));assert.throws(()=>graphSeries([{...row,source:'d*x'}],parameters()));
});
test('parameter bounds, names, duplicates and finite values are validated',()=>{
 for(const p of [{name:'x'},{value:Infinity},{value:11},{min:3},{max:-11},{min:-100001}])assert.throws(()=>validateParameters([{...parameters()[0],...p}]));
 assert.throws(()=>validateParameters([...parameters(),...parameters()]));assert.deepEqual(validateParameters(),[]);
});
test('parameter values and limits persist through backup and snippets',()=>{
 const b=createBoard();b.items=[{id:'graph',type:'graph',x:0,y:0,w:640,h:488,source:row.source,src:'data:image/png;base64,AAAA',range:[-5,5,5,-5],series:[row],parameters:parameters()}];
 assert.deepEqual(parseBackup(serializeBackup(b)).items[0].parameters,parameters());
 const copy=snippetCopies(createSnippet('Parameterized curve',b.items),{x:300,y:300});assert.deepEqual(copy[0].parameters,parameters());copy[0].parameters[0].value=3;assert.equal(b.items[0].parameters[0].value,2);
 b.items[0].parameters[0].value=20;assert.throws(()=>validateBoard(b));
});
