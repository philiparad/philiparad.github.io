import test from 'node:test';
import assert from 'node:assert/strict';
import {compileFunctions} from '../js/named-functions.js';
import {compileExpression} from '../js/expression.js';
import {graphSeries,compileSeries} from '../js/graph-series.js';
import {endpointMarkers} from '../js/graph-endpoints.js';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';
const defs=[{name:'g',source:'f(x+1)+1'},{name:'f',source:'a*x^2'}];
test('named functions support forward references, parameters, composition and every curve type',()=>{
 const f=compileFunctions(defs,{a:2});assert.equal(f.g(2),19);assert.equal(compileExpression('g(f(x))','x',{},f)(1),19);
 const r={source:'g(x)',color:'#147d92',visible:true,domainMin:0};graphSeries([r],[{name:'a',value:2,min:0,max:3}],defs);assert.equal(compileSeries(r,{a:2},f).y(2),19);assert.equal(endpointMarkers(r,{a:2},undefined,f)[0].y,3);
 assert.equal(compileSeries({...r,kind:'parametric',source:'f(t)',xSource:'g(t)',tmin:0,tmax:1},{a:2},f).x(0),3);
 assert.equal(compileSeries({...r,kind:'polar',source:'f(t)',tmin:0,tmax:1},{a:2},f).x(0),0);
});
test('invalid names, missing dependencies, direct and indirect cycles and expensive expansion are rejected',()=>{
 for(const ds of [[{name:'sin',source:'x'}],[{name:'constructor',source:'x'}],[{name:'F',source:'x'}],[{name:'f',source:'x'},{name:'f',source:'x+1'}],[{name:'f',source:'missing(x)'}],[{name:'f',source:'f(x)'}],[{name:'f',source:'g(x)'},{name:'g',source:'f(x)'}]])assert.throws(()=>compileFunctions(ds));
 assert.throws(()=>compileExpression('missing(x)'),/Undefined function/);
 const ds=[{name:'f',source:'x^2'}];for(const name of ['g','h','u','v'])ds.push({name,source:Array(10).fill(ds.at(-1).name+'(x)').join('+')});assert.throws(()=>compileFunctions(ds),/complex/);
});
test('named definitions survive lesson backup without losing forward dependencies',()=>{
 const b=createBoard();b.items=[{id:'g',type:'graph',x:0,y:0,w:640,h:488,src:'data:image/png;base64,AAAA',source:'g(x)',series:[{source:'g(x)',color:'#147d92',visible:true}],parameters:[{name:'a',value:2,min:0,max:3}],definitions:defs,range:[-5,5,5,-5]}];assert.deepEqual(parseBackup(serializeBackup(b)).items,b.items);
});
