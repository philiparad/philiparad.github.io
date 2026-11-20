import test from 'node:test';
import assert from 'node:assert/strict';
import {visualBounds,visibleItems,invalidateTextBounds,clearTextBoundsCache,invalidatePointBounds,clearPointBoundsCache} from '../js/visibility.js';
import {bounds,sceneSVG} from '../js/scene.js';
const view={x:0,y:0,zoom:1};
const rect=(id,x,y=100)=>({id,type:'rectangle',x,y,w:40,h:40,lineWidth:3});
const shown=(item)=>visibleItems([item],view,1000,700).length===1;
test('viewport uses pan, zoom, margins and keeps selection order',()=>{
 const items=[rect('near',10),rect('far',2000),rect('left',-1000)];
 assert.deepEqual(visibleItems(items,view,1000,700).map(i=>i.id),['near']);
 assert.deepEqual(visibleItems(items,{x:-1900,y:0,zoom:1},1000,700).map(i=>i.id),['far']);
 assert.deepEqual(visibleItems(items,{x:0,y:0,zoom:.25},1000,700).map(i=>i.id),['near','far']);
 assert.deepEqual(visibleItems(items,view,1000,700,new Set(['left'])).map(i=>i.id),['near','left']);
 assert.equal(visibleItems(items,view,0,0),items);
});
test('rotation, wave amplitude, pressure dots and arrowheads cannot lose visible edges',()=>{
 const rotated={...rect('rotated',1100),w:20,h:500,rotation:90};assert.ok(shown(rotated));
 assert.ok(!shown({...rotated,rotation:0}));
 assert.ok(shown({...rect('wave',-110),w:1,lineWidth:30,lineStyle:'wavy'}));
 assert.ok(shown({id:'dot',type:'path',x:-90,y:100,w:1,h:1,points:[[0,0]],pressures:[1],lineWidth:40}));
 assert.ok(shown({id:'arrow',type:'arrow',x:1090,y:100,w:10,h:1,points:[[0,0],[10,0]],lineWidth:10}));
});
test('curve and preset bounds enclose control overshoot and ignore stale nominal point boxes',()=>{
 const curve={id:'curve',type:'curve',x:0,y:0,w:1,h:1,points:[[100,100],[1000,1000],[50,800]],lineWidth:2};
 const b=visualBounds(curve);assert.ok(b.x<0&&b.y<0&&b.x+b.w>1100&&b.y+b.h>1100);
 assert.ok(shown({...curve,x:-900}));
 const preset=visualBounds({...rect('preset',0),type:'shape',shape:'parabola',w:100,h:100});
 assert.ok(preset.y+preset.h>=200);
 assert.ok(!shown({...rect('text',10000),type:'text',text:'Offscreen label'}));
 assert.ok(!shown({...rect('note',10000),type:'note',text:'Offscreen sticky note'}));
});

test('PERF-004 safely culls offscreen text and notes while keeping selected text',()=>{
 const near={id:'near-text',type:'text',x:100,y:100,w:180,h:20,fontSize:24,text:'שלום English'};
 const far={id:'far-text',type:'text',x:18000,y:100,w:180,h:20,fontSize:24,text:'Hidden from viewport'};
 const note={id:'far-note',type:'note',x:-19000,y:100,w:160,h:20,fontSize:24,text:'Sticky note',fill:'#fff1a8'};
 assert.deepEqual(visibleItems([near,far,note],view,1000,700).map(i=>i.id),['near-text']);
 assert.deepEqual(visibleItems([near,far,note],view,1000,700,new Set([note.id])).map(i=>i.id),['near-text','far-note']);
 assert.deepEqual(visibleItems([near,far,note],{x:-17950,y:0,zoom:1},1000,700).map(i=>i.id),['far-text']);
 assert.equal(visualBounds(near)===null,false);
 assert.equal(visualBounds(note)===null,false);
});

test('PERF-004 includes wrapped overflow, sticky-note padding, and rotation in text bounds',()=>{
 const tall={id:'tall',type:'text',x:120,y:-400,w:52,h:12,fontSize:26,
  text:'שלום English long words need enough space to wrap on many separate lines for students'};
 const measured=bounds(tall),safe=visualBounds(tall);
 assert.ok(measured.h>400,'Wrapped text must exceed the old stored height');
 assert.ok(safe.x<=measured.x&&safe.y<=measured.y);
 assert.ok(safe.x+safe.w>=measured.x+measured.w&&safe.y+safe.h>=measured.y+measured.h);
 assert.ok(shown(tall),'Wrapped text entering the viewport must stay mounted');
 const note={...tall,id:'note',type:'note',fill:'#fff1a8'};
 const noteBounds=visualBounds(note);
 assert.ok(noteBounds.h>safe.h,'Sticky note adds padding and a background');
 const rotated={id:'rotated-text',type:'text',x:1100,y:40,w:20,h:500,
  fontSize:22,rotation:90,text:'Rotated label'};
 assert.ok(!shown({...rotated,rotation:0}));
 assert.ok(shown(rotated),'Rotated paragraph crossing viewport edge must be visible');
});

test('PERF-004 cache updates with geometry, direct text changes, and explicit rich-run invalidation',()=>{
 const item={id:'editable-text',type:'text',x:0,y:0,w:180,h:15,fontSize:24,text:'Hello'};
 const first=visualBounds(item);
 assert.equal(visualBounds(item),first,'Repeated pans must reuse identical bounds object');
 item.x+=100;
 const moved=visualBounds(item);
 assert.notEqual(moved,first);
 assert.ok(moved.x>first.x);
 item.w=45;
 const narrow=visualBounds(item);
 assert.notEqual(narrow,moved);
 item.text='This sentence is now much longer and wraps over multiple lines';
 const wrapped=visualBounds(item);
 assert.ok(wrapped.h>narrow.h);
 item.runs=[{text:'Hi'}];
 const initial=visualBounds(item);
 item.runs[0].text='A very long long long long long string';
 invalidateTextBounds(item);
 const changed=visualBounds(item);
 assert.notEqual(changed,initial);
 assert.ok(changed.h>initial.h);
 clearTextBoundsCache();
 assert.notEqual(visualBounds(item),changed);
});

test('PERF-004 font loading and document changes invalidate measured text bounds',()=>{
 const old=globalThis.document,listeners=new Map();
 const fonts={addEventListener(name,listener){
   if(!listeners.has(name))listeners.set(name,new Set());
   listeners.get(name).add(listener);
  },removeEventListener(name,listener){listeners.get(name)?.delete(listener);}};
 const item={id:'font-change',type:'text',x:0,y:0,w:160,h:20,fontSize:24,text:'Text'};
 try{
  globalThis.document={fonts};
  const before=visualBounds(item);
  assert.equal(visualBounds(item),before);
  for(const listener of listeners.get('loadingdone')||[])listener();
  assert.notEqual(visualBounds(item),before);
  const after=visualBounds(item);
  for(const listener of listeners.get('loadingerror')||[])listener();
  assert.notEqual(visualBounds(item),after);
  globalThis.document={fonts};
  const replacement=visualBounds(item);
  assert.notEqual(visualBounds(item),undefined);
  assert.notEqual(replacement,after);
 }finally{globalThis.document=old;clearTextBoundsCache();}
});

test('PERF-013 reuses long stroke extents during pan, zoom and rotation',()=>{
 const count=12000;
 let reads=0;
 const points=Array.from({length:count},(_,i)=>[i/4,Math.sin(i/30)*100]);
 const tracked=new Proxy(points,{get(target,key,receiver){
  if(/^[0-9]+$/.test(String(key)))reads++;
  return Reflect.get(target,key,receiver);
 }});
 const stroke={id:'long-ink',type:'path',x:0,y:0,w:3000,h:200,points:tracked,lineWidth:4};
 try{
  const first=visualBounds(stroke);
  assert.ok(first.w>2900);
  assert.equal(reads,count,'First calculation must examine every point');
  for(let i=0;i<80;i++){
   stroke.x=i*9;
   stroke.rotation=i%15;
   visibleItems([stroke],{x:-i*20,y:0,zoom:1+i/100},1100,700);
  }
  assert.equal(reads,count,'Panning, zooming and transforms must reuse point extents');
 }finally{clearPointBoundsCache();}
});

test('PERF-013 replaced points and explicit in-place edits invalidate correctly',()=>{
 const item={id:'ink-edit',type:'path',x:0,y:100,w:10,h:10,points:[[0,0],[10,10]],lineWidth:3};
 const first=visualBounds(item);
 item.points=[[0,0],[200,10]];
 const replaced=visualBounds(item);
 assert.ok(replaced.w>first.w+100);
 item.points[1][0]=400;
 assert.equal(visualBounds(item).w,replaced.w,'In-place updates require explicit invalidation');
 invalidatePointBounds(item);
 assert.ok(visualBounds(item).w>replaced.w+100);
 item.points.push([700,0]);
 assert.ok(visualBounds(item).w>600,'Length changes automatically invalidate extents');
 clearPointBoundsCache();
});

test('PERF-013 padding and rotation remain live when geometry is cached',()=>{
 const item={id:'styled-ink',type:'curve',x:0,y:0,w:100,h:100,points:[[0,0],[100,20]],lineWidth:2};
 const base=visualBounds(item);
 item.lineWidth=20;
 const thick=visualBounds(item);
 assert.ok(thick.w>base.w);
 item.x+=900;
 const moved=visualBounds(item);
 assert.ok(moved.x>thick.x+800);
 item.rotation=90;
 const rotated=visualBounds(item);
 assert.ok(rotated.x!==moved.x||rotated.y!==moved.y);
});
