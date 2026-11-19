import test from 'node:test';
import assert from 'node:assert/strict';
import {snapPoint,buildSnapIndex} from '../js/snapping.js';
import {bounds} from '../js/scene.js';

// Original PERF-006 snapping algorithm, retained as a behavior oracle.
function legacy(point,board,exclude=new Set(),mode='both',anchors=null){
 if(mode==='off')return {...point,guides:[]};
 const tolerance=7/board.viewport.zoom,targets={x:[],y:[]};
 if(mode==='objects'||mode==='both')for(const item of board.items){
  if(exclude.has(item.id))continue;
  const b=bounds(item);
  targets.x.push(b.x,b.x+b.w/2,b.x+b.w);
  targets.y.push(b.y,b.y+b.h/2,b.y+b.h);
 }
 const result={...point,guides:[]};
 for(const axis of ['x','y']){
  const offsets=anchors?.[axis]||[0];let best=tolerance,delta=0,guide=null;
  for(const offset of offsets){
   const value=point[axis]+offset,options=[...targets[axis]];
   if(mode==='grid'||mode==='both')options.push(Math.round(value/32)*32);
   for(const target of options){
    const distance=Math.abs(target-value);
    if(distance<=best){best=distance;delta=target-value;guide=target;}
   }
  }
  result[axis]+=delta;
  if(guide!==null)result.guides.push({axis,value:guide});
 }
 return result;
}
const rect=(id,x,y,w=40,h=30)=>({id,type:'rectangle',x,y,w,h,rotation:0});
function random(seed){let n=seed;return ()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);}

test('PERF-006 index exactly matches legacy object/grid snapping and guide ties',()=>{
 const rng=random(602);
 for(const count of [0,1,4,25,200]){
  const items=Array.from({length:count},(_,i)=>rect('r'+i,
   Math.round(rng()*600-300),Math.round(rng()*400-200),10+Math.round(rng()*80),10+Math.round(rng()*70)));
  // Many shared coordinates exercise same-distance and insertion-order ties.
  if(count>3){items[1].x=items[0].x;items[2].x=items[0].x;}
  for(const zoom of [.25,1,2,4]){
   const board={items,viewport:{zoom}};
   for(const mode of ['off','grid','objects','both']){
    const exclude=new Set(count>1?['r1','r3']:[]);
    const index=buildSnapIndex(items,exclude);
    for(let j=0;j<65;j++){
     const point={x:Math.round(rng()*650-325),y:Math.round(rng()*500-250)};
     const anchors=j%3===0?{x:[0,20,40],y:[0,15,30]}:j%3===1?{x:[0,40],y:[0]}:null;
     const expected=legacy(point,board,exclude,mode,anchors);
     assert.deepEqual(snapPoint(point,board,exclude,mode,anchors,index),expected,
      'indexed snapping parity for '+JSON.stringify({count,zoom,mode,point,anchors}));
     assert.deepEqual(snapPoint(point,board,exclude,mode,anchors),expected);
    }
   }
  }
 }
});

test('PERF-006 index measures each non-excluded item only once, independent of pointer frequency',()=>{
 const items=Array.from({length:1500},(_,i)=>rect(String(i),i*13,i%10*12));
 let measures=0;
 const skip=new Set(['10','20','30']);
 const index=buildSnapIndex(items,skip,item=>{measures++;return bounds(item);});
 assert.equal(measures,1497,'One geometry calculation per included object');
 assert.equal(index.x.length,1497*3);
 assert.equal(index.y.length,1497*3);
 const board={items,viewport:{zoom:1}};
 for(let i=0;i<500;i++)snapPoint({x:i*2,y:i%180},board,skip,'both',
  {x:[0,25,50],y:[0,15,30]},index);
 assert.equal(measures,1497,'Dragging must not recompute indexed bounds');
});

test('PERF-006 snap index is independent from future geometry mutations and exclusions',()=>{
 const a=rect('a',10,10),b=rect('b',120,10),board={items:[a,b],viewport:{zoom:1}};
 const index=buildSnapIndex(board.items,new Set(['a']));
 const point={x:9,y:10};
 assert.deepEqual(snapPoint(point,board,new Set(['a']),'objects',null,index).guides,[]);
 b.x=9;
 // Gesture snapshot is deliberately immutable until editor invalidates it.
 assert.deepEqual(snapPoint(point,board,new Set(['a']),'objects',null,index).guides,[]);
 const refreshed=buildSnapIndex(board.items,new Set(['a']));
 assert.equal(snapPoint(point,board,new Set(['a']),'objects',null,refreshed).x,9);
 assert.equal(snapPoint({x:10,y:10},board,new Set(),'off').x,10);
});

test('PERF-006 preserves last-candidate wins for coincident targets and grid',()=>{
 const items=[rect('a',0,0,32,32),rect('b',0,0,32,32)];
 const board={items,viewport:{zoom:1}};
 for(const x of [0,8,16,24,32,35]){
  const point={x,y:16};
  for(const mode of ['objects','both']){
   const anchors={x:[0,8],y:[0,8]};
   assert.deepEqual(snapPoint(point,board,new Set(),mode,anchors,buildSnapIndex(items)),legacy(point,board,new Set(),mode,anchors));
  }
 }
});
