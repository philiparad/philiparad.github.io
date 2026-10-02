import test from 'node:test';
import assert from 'node:assert/strict';
import {IncrementalInk,refineInk,naturalPathD} from '../js/ink.js';
function stream(raw,strength=.65,zoom=1){const ink=new IncrementalInk(raw[0],strength,zoom);raw.slice(1).forEach(p=>ink.add(p));return ink;}
function near(a,b){assert.equal(a.length,b.length);for(let i=0;i<a.length;i++)for(let k=0;k<2;k++)assert.ok(Math.abs(a[i][k]-b[i][k])<1e-8,`point ${i}, axis ${k}`);}
test('incremental correction matches offline correction at every input step',()=>{
 const raw=Array.from({length:160},(_,i)=>[i*.9,20*Math.sin(i/14)+(i%2?.3:-.3)]);
 for(const strength of [.35,.65,.85])for(const zoom of [.25,1,4]){
  const ink=new IncrementalInk(raw[0],strength,zoom);
  for(let i=1;i<raw.length;i++){ink.add(raw[i]);if(i>1)near(ink.points,refineInk(raw.slice(0,i+1),strength,zoom));}
 }
});
test('settled prefix and completed stroke do not jump',()=>{
 const raw=Array.from({length:100},(_,i)=>[i*2,10*Math.sin(i/8)]),ink=stream(raw.slice(0,60));
 const settled=ink.points.slice(0,-8).map(p=>[...p]);raw.slice(60).forEach(p=>ink.add(p));
 near(ink.points.slice(0,settled.length),settled);near(ink.finish(),ink.points);
 assert.deepEqual(ink.finish().at(-1),raw.at(-1));
 assert.ok(!/NaN|Infinity/.test(naturalPathD(ink.finish())));
});
test('taps, duplicates, smoothing off, and sharp corners are preserved',()=>{
 assert.deepEqual(stream([[3,4],[3,4]]).finish(),[[3,4]]);
 const raw=[[0,0],[10,0],[10,10],[0,10]];assert.deepEqual(stream(raw,0).finish(),raw);
 const corner=stream([[0,0],[10,0],[10,10]]).finish();assert.ok(corner.some(p=>Math.hypot(p[0]-10,p[1])<1e-8));
});
test('correction reduces alternating jitter without moving endpoints',()=>{
 const raw=Array.from({length:101},(_,i)=>[i*1.25,i===0||i===100?0:(i%2?.25:-.25)]),ink=stream(raw);
 const result=ink.finish();assert.ok(result.slice(3,-3).reduce((s,p)=>s+Math.abs(p[1]),0)/result.slice(3,-3).length<.2);
 assert.deepEqual(result[0],raw[0]);assert.deepEqual(result.at(-1),raw.at(-1));
});
