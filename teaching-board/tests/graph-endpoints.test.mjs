import test from 'node:test';
import assert from 'node:assert/strict';
import {endpointMarkers,domainContains} from '../js/graph-endpoints.js';
import {graphSeries,compileSeries,seriesLabels,piecewiseRows} from '../js/graph-series.js';
const row=(extra={})=>({source:'x^2',color:'#147d92',visible:true,domainMin:-2,domainMax:2,...extra});
test('open and closed endpoints agree in evaluation, markers and inequalities',()=>{
 const r=row({domainMinOpen:true,domainMaxOpen:false});graphSeries([r]);assert.equal(domainContains(r,-2),false);assert.equal(domainContains(r,2),true);assert.ok(Number.isNaN(compileSeries(r).y(-2)));assert.equal(compileSeries(r).y(2),4);assert.equal(seriesLabels(r)[1],'-2 < x ≤ 2');assert.deepEqual(endpointMarkers(r).map(p=>[p.x,p.y,p.open]),[[-2,4,true],[2,4,false]]);
 assert.deepEqual(endpointMarkers(row({source:'1/x',domainMin:0})).map(p=>p.x),[2]);assert.deepEqual(endpointMarkers(r,{},[-1,5,1,-5]),[]);assert.deepEqual(endpointMarkers(row({domainMin:undefined,domainMax:undefined})),[]);
});
test('piecewise membership at shared boundaries is unambiguous and settings are validated',()=>{
 const p={kind:'piecewise',source:'piecewise',color:'#147d92',visible:true,branches:[{source:'x^2',domainMax:0,domainMaxOpen:false},{source:'x+1',domainMin:0,domainMinOpen:true}]};graphSeries([p]);assert.equal(compileSeries(p).y(0),0);assert.equal(piecewiseRows(p)[0].domainMaxOpen,false);assert.equal(piecewiseRows(p)[1].domainMinOpen,true);
 p.branches[1].domainMinOpen=false;assert.throws(()=>graphSeries([p]),/shared endpoints/);p.branches[0].domainMaxOpen=true;assert.equal(compileSeries(graphSeries([p])[0]).y(0),1);p.branches[1].domainMinOpen=true;assert.ok(Number.isNaN(compileSeries(graphSeries([p])[0]).y(0)));
 for(const value of ['true',1,null])assert.throws(()=>graphSeries([row({domainMaxOpen:value})]));
});
