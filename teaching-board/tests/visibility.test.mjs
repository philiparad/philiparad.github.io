import test from 'node:test';
import assert from 'node:assert/strict';
import {visualBounds,visibleItems} from '../js/visibility.js';
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
 assert.ok(shown({...rect('text',10000),type:'text',text:'Overflowing label'}));
 assert.ok(shown({...rect('note',10000),type:'note',text:'Long note'}));
});
