import test from 'node:test';
import assert from 'node:assert/strict';
import {graphSeries,compileSeries,seriesLabels} from '../js/graph-series.js';
import {createBoard,serializeBackup,parseBackup,validateBoard} from '../js/model.js';
import {createSnippet,snippetCopies} from '../js/snippet-model.js';
const polar=()=>({kind:'polar',source:'2*(1+cos(t))',tmin:0,tmax:2*Math.PI,color:'#147d92',visible:true});
test('polar radius converts radians to Cartesian coordinates, including negative radii',()=>{
 const f=compileSeries(graphSeries([polar()])[0]);assert.equal(f.x(0),4);assert.ok(Math.abs(f.y(Math.PI/2)-2)<1e-12);assert.ok(Math.abs(f.x(Math.PI))<1e-12);
 const negative=compileSeries({...polar(),source:'-2'});assert.equal(negative.x(0),-2);assert.ok(Math.abs(negative.y(Math.PI/2)+2)<1e-12);
 const undefinedRadius=compileSeries({...polar(),source:'sqrt(t)'});assert.ok(Number.isNaN(undefinedRadius.x(-1)));assert.ok(Number.isNaN(undefinedRadius.y(-1)));
});
test('polar, parametric and ordinary functions coexist and reject invalid polar data',()=>{
 const rows=graphSeries([...graphSeries('x^2'),polar(),{...polar(),kind:'parametric',xSource:'cos(t)',source:'sin(t)'}]);assert.equal(rows.length,3);assert.match(seriesLabels(rows[1])[0],/^r\(t\)/);
 for(const change of [{source:'x'},{source:''},{tmin:7},{tmax:NaN},{tmin:-100001},{source:'alert(t)'}])assert.throws(()=>graphSeries([{...polar(),...change}]));
});
test('polar equations remain editable through backup and snippet round trips',()=>{
 const b=createBoard();b.items=[{id:'graph',type:'graph',x:20,y:30,w:640,h:488,source:polar().source,src:'data:image/png;base64,AAAA',range:[-5,5,5,-5],series:[polar()]}];
 const restored=parseBackup(serializeBackup(b));assert.deepEqual(restored.items[0].series,b.items[0].series);
 const copy=snippetCopies(createSnippet('Cardioid',b.items),{x:400,y:300});assert.deepEqual(copy[0].series,b.items[0].series);
 restored.items[0].series[0].tmax=0;assert.throws(()=>validateBoard(restored));
});
