import assert from 'node:assert/strict';
import { AdaptiveInk,pointerSamples } from '../js/ink.js';
const e={getCoalescedEvents:()=>[]};assert.deepEqual(pointerSamples(e),[e]);
let f=new AdaptiveInk([0,0],0,0);assert.deepEqual(f.add([3,7],8),[3,7]);
f=new AdaptiveInk([0,0],0,.85);let jitter=0;for(let i=1;i<100;i++)jitter+=Math.abs(f.add([0,i%2?.5:-.5],i*8)[1]);assert(jitter<25,'Slow tremor should be attenuated');
f=new AdaptiveInk([0,0],0,.85);let p;for(let i=1;i<20;i++)p=f.add([i*10,0],i*8);assert(190-p[0]<3,'Fast strokes should track within 3px');
console.log('Adaptive sampling checks passed');
