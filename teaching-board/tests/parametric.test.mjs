import test from 'node:test';
import assert from 'node:assert/strict';
import {graphSeries,compileSeries,seriesLabels} from '../js/graph-series.js';
import {createBoard,serializeBackup,parseBackup,validateBoard} from '../js/model.js';
import {createSnippet,snippetCopies} from '../js/snippet-model.js';
const circle=()=>({kind:'parametric',xSource:'2*cos(t)',source:'2*sin(t)',tmin:0,tmax:2*Math.PI,color:'#147d92',visible:true});
test('parametric circle and polynomial evaluate both coordinates using t',()=>{
 const r=graphSeries([circle()])[0],f=compileSeries(r);assert.equal(f.x(0),2);assert.ok(Math.abs(f.y(Math.PI/2)-2)<1e-12);assert.ok(Math.abs(f.x(Math.PI/2))<1e-12);
 const g=compileSeries({...r,xSource:'t^2',source:'-t^3'});assert.equal(g.x(2),4);assert.equal(g.y(2),-8);
});
test('ordinary and parametric curves coexist, legacy functions remain unchanged',()=>{
 const legacy=graphSeries('x^2');assert.equal(compileSeries(legacy[0]).y(-3),9);
 assert.equal(graphSeries([...legacy,circle()]).length,2);assert.equal(seriesLabels(circle()).length,2);assert.deepEqual(seriesLabels(legacy[0]),['y = x^2']);
});
test('invalid ranges, variables and injected expressions are rejected',()=>{
 for(const change of [{tmin:7},{tmax:NaN},{xSource:'x'},{source:'window.alert(1)'},{kind:'unknown'},{xSource:''}])assert.throws(()=>graphSeries([{...circle(),...change}]));
 assert.throws(()=>graphSeries([{...circle(),visible:false}]),/Show/);
 const f=compileSeries({...circle(),xSource:'sqrt(t)'});assert.ok(Number.isNaN(f.x(-1))&&Number.isNaN(f.y(-1)));
});
test('parametric source and bounds persist through backups and reusable snippets',()=>{
 const b=createBoard();b.items=[{id:'graph',type:'graph',x:20,y:30,w:640,h:488,source:'2*sin(t)',src:'data:image/png;base64,AAAA',range:[-5,5,5,-5],series:[circle()]}];
 const restored=parseBackup(serializeBackup(b));assert.deepEqual(restored.items[0].series,b.items[0].series);
 const copy=snippetCopies(createSnippet('Circle',b.items),{x:400,y:300});assert.deepEqual(copy[0].series,b.items[0].series);assert.notEqual(copy[0].id,b.items[0].id);
 restored.items[0].series[0].tmax=0;assert.throws(()=>validateBoard(restored));
});
