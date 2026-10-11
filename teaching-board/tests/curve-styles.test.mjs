import test from 'node:test';
import assert from 'node:assert/strict';
import {graphSeries,curveAppearance,CURVE_STYLES,CURVE_WIDTHS} from '../js/graph-series.js';
import {createBoard,serializeBackup,parseBackup,validateBoard} from '../js/model.js';
import {createSnippet,snippetCopies} from '../js/snippet-model.js';
const base={source:'x^2',color:'#147d92',visible:true};
test('graph styles support all curve types and preserve legacy defaults',()=>{
 assert.deepEqual(curveAppearance(graphSeries('x^2')[0]),{strokeColor:'#147d92',strokeWidth:3,dash:0});
 for(const kind of ['function','parametric','polar'])for(const lineStyle of Object.keys(CURVE_STYLES))for(const lineWidth of CURVE_WIDTHS){
  const row={...base,kind,source:kind==='function'?'x^2':'sin(t)',xSource:'cos(t)',tmin:0,tmax:6.28,lineStyle,lineWidth};
  const copy=graphSeries([row])[0];assert.deepEqual(curveAppearance(copy),{strokeColor:base.color,strokeWidth:lineWidth,dash:CURVE_STYLES[lineStyle].dash});assert.deepEqual(row,copy);
 }
});
test('invalid graph styles and widths are rejected, including hidden curves',()=>{
 for(const lineStyle of ['unknown','__proto__','constructor',null,1,['solid']])assert.throws(()=>graphSeries([{...base,lineStyle}]),/style/);
 for(const lineWidth of [0,-1,100,2.5,'3',null,NaN,Infinity])assert.throws(()=>graphSeries([{...base,lineWidth}]),/width/);
 assert.throws(()=>graphSeries([base,{...base,visible:false,lineStyle:'invalid'}]),/style/);
});
test('curve styles survive editable backups and independent snippet copies',()=>{
 const b=createBoard();b.items=[{id:'g',type:'graph',x:0,y:0,w:640,h:464,source:'x^2',src:'data:image/png;base64,AAAA',range:[-5,5,5,-5],series:[{...base,lineStyle:'dashed',lineWidth:6}]}];
 const restored=parseBackup(serializeBackup(b));assert.deepEqual(restored.items[0].series,b.items[0].series);
 const copy=snippetCopies(createSnippet('Styled graph',b.items),{x:500,y:300});assert.deepEqual(copy[0].series,b.items[0].series);copy[0].series[0].lineWidth=1;assert.equal(b.items[0].series[0].lineWidth,6);
 restored.items[0].series[0].lineStyle='invalid';assert.throws(()=>validateBoard(restored));
});
