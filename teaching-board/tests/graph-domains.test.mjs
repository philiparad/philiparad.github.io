import test from 'node:test';
import assert from 'node:assert/strict';
import {graphSeries,compileSeries,functionPlotBounds,seriesLabels} from '../js/graph-series.js';
import {createBoard,serializeBackup,parseBackup,validateBoard} from '../js/model.js';
const row=(extra={})=>({source:'x^2',color:'#147d92',visible:true,...extra});
test('each function has independent optional bounds and is undefined outside them',()=>{
 const rows=graphSeries([row({domainMin:-2,domainMax:1}),row({domainMin:3}),row({domainMax:-1}),row()]);
 assert.equal(compileSeries(rows[0]).y(-2),4);assert.equal(compileSeries(rows[0]).y(1),1);assert.ok(Number.isNaN(compileSeries(rows[0]).y(1.001)));assert.ok(Number.isNaN(compileSeries(rows[0]).y(-2.001)));
 assert.equal(compileSeries(rows[1]).y(4),16);assert.ok(Number.isNaN(compileSeries(rows[1]).y(0)));assert.equal(compileSeries(rows[2]).y(-3),9);assert.equal(compileSeries(rows[3]).y(100),10000);
 assert.deepEqual(functionPlotBounds(rows[0],[-5,5,5,-5]),[-2,1]);assert.deepEqual(functionPlotBounds(rows[1],[-5,5,5,-5]),[3,5]);assert.equal(functionPlotBounds(rows[0],[3,5,8,-5]),null);assert.deepEqual(functionPlotBounds(row(),[-20,5,20,-5]),[-20,20]);
 assert.match(seriesLabels(rows[0])[1],/-2 ≤ x ≤ 1/);assert.equal(seriesLabels(rows[1])[1],'x ≥ 3');
});
test('invalid domains are rejected and restrictions persist through backups',()=>{
 for(const extra of [{domainMin:NaN},{domainMax:Infinity},{domainMin:'2'},{domainMin:-100001},{domainMin:2,domainMax:2},{domainMin:3,domainMax:2},{kind:'polar',source:'cos(t)',tmin:0,tmax:6,domainMin:0}])assert.throws(()=>graphSeries([row(extra)]));
 const b=createBoard();b.items=[{id:'g',type:'graph',x:0,y:0,w:640,h:488,src:'data:image/png;base64,AAAA',source:'x^2',series:[row({domainMin:-2,domainMax:1})],range:[-5,5,5,-5]}];assert.deepEqual(parseBackup(serializeBackup(b)).items,b.items);b.items[0].series[0].domainMax=-3;assert.throws(()=>validateBoard(b));
});
