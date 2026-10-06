import test from 'node:test';
import assert from 'node:assert/strict';
import {ParameterPlayback,advanceParameter} from '../js/parameter-playback.js';
const parameter=()=>({name:'a',value:0,min:-1,max:1});
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('animation stays in range and reverses at both bounds',()=>{
 const p=parameter();let direction=1,sawTop=false,sawBottom=false;
 for(let i=0;i<400;i++){const n=advanceParameter(p,direction);p.value=n.value;direction=n.direction;assert.ok(p.value>=p.min&&p.value<=p.max);if(p.value===1){sawTop=true;assert.equal(direction,-1);}if(p.value===-1){sawBottom=true;assert.equal(direction,1);}}
 assert.ok(sawTop&&sawBottom);
});
test('playback waits for preview and cannot restart after cancellation',async()=>{
 let finish;const queued=[],clock={set:fn=>{queued.push(fn);return fn;},clear:()=>{}};
 const p=parameter(),playback=new ParameterPlayback(()=>new Promise(r=>{finish=r;}),()=>{},clock);
 playback.start(p,()=>{});assert.equal(queued.length,0);const value=p.value;playback.stop();finish(true);await settle();assert.equal(queued.length,0);assert.equal(p.value,value);assert.equal(playback.active,null);
});
test('switching parameters cancels old queued frames; rendering failure stops playback',async()=>{
 const queued=[],clock={set:fn=>{queued.push(fn);return fn;},clear:()=>{}};let ok=true;
 const a=parameter(),b={...parameter(),name:'b'},playback=new ParameterPlayback(async()=>ok,()=>{},clock);
 playback.start(a,()=>{});await settle();const old=queued.shift(),value=a.value;playback.start(b,()=>{});await settle();await old();assert.equal(a.value,value);assert.equal(playback.active,b);
 ok=false;await queued.pop()();assert.equal(playback.active,null);
});

test('rounding cannot push values outside irrational bounds',()=>{const p={value:Math.PI,min:-Math.PI,max:Math.PI};assert.equal(advanceParameter(p,1).value,Math.PI);p.value=-Math.PI;assert.equal(advanceParameter(p,-1).value,-Math.PI);});
