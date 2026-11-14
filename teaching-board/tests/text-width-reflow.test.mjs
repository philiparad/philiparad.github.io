import test from 'node:test';
import assert from 'node:assert/strict';
import {beginResize,resizeItems} from '../js/selection-transform.js';
import {textObjectHeight} from '../js/scene.js';
import {paragraphRuns} from '../js/rich-text.js';
import {textLayoutMetrics} from '../js/inline-equation.js';

const legacy=(type='text')=>({
 id:'txt',type,x:50,y:80,w:300,h:20,fontSize:24,rotation:0,
 text:'שלום English longWord longWord longWord mathematical explanation with more words',
 runs:[{text:'שלום English longWord longWord longWord mathematical explanation with more words',bold:true}],
 paragraphs:[{align:'right',list:'none',dir:'rtl'}],
 ...(type==='note'?{fill:'#fff1a8'}:{})
});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('east side resize reflows text to more lines without changing font size',()=>{
 const item=legacy(),board={items:[item]},original=structuredClone(item),oldHeight=textObjectHeight(item);
 const drag=beginResize([item],'e',{x:0,y:0});
 resizeItems(board,drag,{x:-205,y:0});
 close(item.w,95);close(item.x,50);close(item.y,80);
 assert.equal(item.fontSize,24);
 assert.ok(item.h>oldHeight);
 assert.equal(item.h,textObjectHeight(item));
 assert.deepEqual(item.runs,original.runs);
 assert.deepEqual(item.paragraphs,original.paragraphs);
 const metrics=textLayoutMetrics(item,paragraphRuns(item));
 assert.ok(metrics.lines.length>=3);
 assert.ok(item.h>=metrics.height);
});
test('west side resize preserves right edge and starts at same y',()=>{
 const item=legacy('note'),board={items:[item]},right=item.x+item.w,originalFont=item.fontSize;
 const drag=beginResize([item],'w',{x:0,y:0});
 resizeItems(board,drag,{x:180,y:0});
 close(item.x+item.w,right);
 close(item.w,120);
 close(item.y,80);
 assert.equal(item.fontSize,originalFont);
 assert.ok(item.h>=textLayoutMetrics(item,paragraphRuns(item)).height);
});
test('width expansion does not shrink a deliberately tall text box',()=>{
 const item=legacy(),board={items:[item]};
 item.h=500;
 const drag=beginResize([item],'e',{x:0,y:0});
 resizeItems(board,drag,{x:100,y:0});
 close(item.h,500);
 close(item.w,400);
 assert.equal(item.fontSize,24);
});
test('corner resizing retains existing proportional font-scaling behavior',()=>{
 const item=legacy(),board={items:[item]},drag=beginResize([item],'se',{x:0,y:0});
 resizeItems(board,drag,{x:150,y:0});
 assert.equal(item.w,450);
 assert.equal(item.fontSize,24);
 resizeItems(board,drag,{x:150,y:50});
 assert.ok(item.fontSize>24);
});
