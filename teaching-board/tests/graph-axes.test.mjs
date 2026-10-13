import test from 'node:test';
import assert from 'node:assert/strict';
import {graphAxisOptions,validateAxes} from '../js/graph-axes.js';
import {createBoard,serializeBackup,parseBackup} from '../js/model.js';
test('axis defaults preserve old graphs and custom ticks disable automatic spacing',()=>{
 const range=[-5,5,5,-5],defaults=graphAxisOptions(range);assert.deepEqual(defaults.boundingbox,range);assert.equal(defaults.grid,true);assert.equal(defaults.defaultAxes.x.ticks.drawLabels,true);
 const custom=graphAxisOptions(range,{xTick:2,yTick:.5,grid:false,tickLabels:false});assert.equal(custom.grid,false);assert.equal(custom.defaultAxes.x.ticks.ticksDistance,2);assert.equal(custom.defaultAxes.y.ticks.insertTicks,false);assert.equal(custom.defaultAxes.y.ticks.drawLabels,false);
});
test('equal scaling expands either dimension around its center and contains requested bounds',()=>{
 for(const range of [[-5,5,5,-5],[-20,2,10,-2]]){const box=graphAxisOptions(range,{equalScale:true}).boundingbox;assert.ok(Math.abs(640/(box[2]-box[0])-440/(box[1]-box[3]))<1e-10);assert.ok(box[0]<=range[0]&&box[2]>=range[2]&&box[1]>=range[1]&&box[3]<=range[3]);assert.equal(box[0]+box[2],range[0]+range[2]);}
});
test('invalid and excessive tick settings are rejected, including after equal-scale expansion',()=>{
 for(const axes of [null,[],{grid:1},{xTick:0},{yTick:NaN},{xLabel:'x'.repeat(41)}])assert.throws(()=>validateAxes(axes));
 assert.throws(()=>graphAxisOptions([-5,5,5,-5],{xTick:.01}),/too small/);
 assert.throws(()=>graphAxisOptions([-1,100,1,-100],{equalScale:true,xTick:.1}),/too small/);
});
test('axis controls round-trip through lesson backup and reject corrupt imports',()=>{
 const b=createBoard();b.items=[{id:'g',type:'graph',x:0,y:0,w:640,h:464,src:'data:image/png;base64,AAAA',source:'x',range:[-5,5,5,-5],axes:{xTick:2,yTick:1,xLabel:'Time (s)',yLabel:'Distance (m)',equalScale:true,grid:false,tickLabels:true}}];assert.deepEqual(parseBackup(serializeBackup(b)).items,b.items);b.items[0].axes.xTick=-2;assert.throws(()=>parseBackup(JSON.stringify(b)));
});
