import test from 'node:test';
import assert from 'node:assert/strict';
import {hitTextBox,pointInTextBox} from '../js/text-hit-test.js';
import {textObjectHeight} from '../js/scene.js';

const item=()=>({id:'legacy',type:'text',x:100,y:80,w:140,h:18,
 fontSize:24,text:'שלום English long words with line wraps',rotation:0});
test('clicking previously empty region of legacy expanded text selects the box',()=>{
 const box=item(),h=textObjectHeight(box);
 assert.ok(h>box.h);
 const p={x:box.x+box.w/2,y:box.y+(box.h+h)/2};
 assert.ok(p.y>box.y+box.h);
 assert.equal(pointInTextBox(box,p),true);
 assert.equal(hitTextBox([box],p)?.id,box.id);
 assert.equal(pointInTextBox(box,{x:box.x-1,y:p.y}),false);
 assert.equal(pointInTextBox(box,{x:p.x,y:box.y+h+1}),false);
});
test('rotation uses inverse transform rather than oversized axis-aligned region',()=>{
 const box={id:'rot',type:'note',x:10,y:20,w:140,h:100,fontSize:24,text:'Hi',rotation:90};
 assert.equal(textObjectHeight(box),100);
 assert.equal(pointInTextBox(box,{x:80,y:70}),true);
 assert.equal(pointInTextBox(box,{x:15,y:25}),false);
 assert.equal(pointInTextBox(box,{x:40,y:8}),true);
});
test('topmost eligible text wins; nontext is not selected by fallback',()=>{
 const first={id:'first',type:'text',x:0,y:0,w:180,h:140,fontSize:24,text:'A'};
 const second={...first,id:'second',type:'note',text:'B'};
 const shape={id:'rect',type:'rectangle',x:0,y:0,w:180,h:140};
 assert.equal(hitTextBox([first,shape,second],{x:50,y:50})?.id,'second');
 assert.equal(hitTextBox([first,shape],{x:50,y:50})?.id,'first');
 assert.equal(hitTextBox([shape],{x:50,y:50}),null);
 assert.equal(hitTextBox([first],{x:NaN,y:50}),null);
});
