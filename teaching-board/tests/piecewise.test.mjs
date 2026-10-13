import test from 'node:test';
import assert from 'node:assert/strict';
import {graphSeries,compileSeries,piecewiseRows,seriesLabels} from '../js/graph-series.js';
import {createBoard,serializeBackup,parseBackup,validateBoard} from '../js/model.js';
const row=()=>({kind:'piecewise',source:'piecewise',color:'#147d92',visible:true,branches:[{source:'x^2',domainMax:0},{source:'x+1',domainMin:0}]});
test('piecewise branches evaluate without bridges and use the next branch at shared boundaries',()=>{
 const r=graphSeries([row()])[0],f=compileSeries(r);assert.equal(f.y(-2),4);assert.equal(f.y(0),1);assert.equal(f.y(2),3);
 const pieces=piecewiseRows(r);assert.equal(pieces.length,2);assert.ok(Number.isNaN(compileSeries(pieces[0]).y(0)));assert.equal(compileSeries(pieces[1]).y(0),1);assert.match(seriesLabels(r)[1],/x < 0/);
 const gap=row();gap.branches[1].domainMin=2;assert.ok(Number.isNaN(compileSeries(graphSeries([gap])[0]).y(1)));
 const param=row();param.branches[1].source='a*x';assert.equal(compileSeries(graphSeries([param],[{name:'a',value:2,min:0,max:3}])[0],{a:2}).y(3),6);
});
test('piecewise validation rejects overlap, invalid formulas, empty and excessive branches',()=>{
 for(const branches of [[],Array(9).fill({source:'x'}),[{source:'x'},{source:'x'}],[{source:'x',domainMin:2,domainMax:1}],[{source:'sin('}],[{source:'x',domainMax:2},{source:'x',domainMin:1}], [null]])assert.throws(()=>graphSeries([{...row(),branches}]));
 const b=createBoard();b.items=[{id:'g',type:'graph',x:0,y:0,w:640,h:536,src:'data:image/png;base64,AAAA',source:'piecewise',series:[row()],range:[-5,5,5,-5]}];assert.deepEqual(parseBackup(serializeBackup(b)).items,b.items);b.items[0].series[0].branches[1].domainMin=-1;assert.throws(()=>validateBoard(b));
});
