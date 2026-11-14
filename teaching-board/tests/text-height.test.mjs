import test from 'node:test';
import assert from 'node:assert/strict';
import {textLayoutMetrics} from '../js/inline-equation.js';
import {bounds,drawItem,sceneSVG,textObjectHeight} from '../js/scene.js';
import {paragraphRuns} from '../js/rich-text.js';
import {createBoard} from '../js/model.js';

class SvgElement{
 constructor(tag){this.tagName=tag;this.attributes={};this.children=[];}
 setAttribute(key,value){this.attributes[key]=String(value);}
 append(...elements){this.children.push(...elements);}
 getContext(){return {measureText:value=>({width:[...value].length*12})};}
}
const oldDocument=globalThis.document;
globalThis.document={createElementNS:(_,tag)=>new SvgElement(tag),createElement:tag=>new SvgElement(tag)};
const walk=n=>[n,...n.children.flatMap(walk)];

test('the measured layout height includes all wrapped lines and note padding',()=>{
 const note={id:'n',type:'note',x:0,y:0,w:80,h:20,fontSize:24,text:'שלום English longWord'};
 const metrics=textLayoutMetrics(note,paragraphRuns(note),text=>[...text].length*12);
 assert.ok(metrics.lines.length>1);
 assert.equal(metrics.height,Math.ceil(28+metrics.lines.reduce((sum,line)=>sum+line.height,0)));
 assert.ok(metrics.height>note.h);
 assert.ok(metrics.lines.every(line=>line.width<=52));
});

test('legacy text exports expand bounds instead of clipping the text',()=>{
 const board=createBoard();
 const item={id:'t',type:'text',x:100,y:50,w:82,h:18,fontSize:24,text:'Long unbroken word and שלום mixed text'};
 board.items=[item];
 const before=structuredClone(board);
 const expanded=textObjectHeight(item);
 assert.ok(expanded>item.h);
 const b=bounds(item);
 assert.equal(b.h,expanded);
 const svg=sceneSVG(board,0);
 assert.ok(Number(svg.attributes.height)>=expanded);
 const chunks=walk(svg).filter(n=>n.tagName==='text');
 assert.ok(chunks.length>1);
 assert.equal(chunks.map(n=>n.textContent).join(''),item.text);
 assert.deepEqual(board,before);
});

test('old sticky note background expands to the measured content height',()=>{
 const note={id:'note',type:'note',x:0,y:0,w:84,h:18,fontSize:24,text:'English ארוך מאוד long text',fill:'#fff1a8'};
 const draw=drawItem(note),bg=draw.children.find(node=>node.tagName==='rect');
 assert.ok(bg);
 assert.equal(Number(bg.attributes.height),textObjectHeight(note));
 assert.ok(Number(bg.attributes.height)>note.h);
 assert.equal(bounds(note).h,Number(bg.attributes.height));
});

test('saving unchanged text still commits increased height for legacy objects',async()=>{
 const {Editor}=await import('../js/editor.js');
 const item={id:'t',type:'text',x:0,y:0,w:80,h:18,fontSize:24,text:'שלום',runs:[{text:'שלום'}],paragraphs:[{align:'right',list:'none',dir:'rtl'}]};
 const existing=structuredClone(item);
 const fake={board:{items:[existing]},isLocked(){return false;},paint(){this.paints=(this.paints||0)+1;},commit(){this.commits=(this.commits||0)+1;},disposed:false};
 Editor.prototype.applyText.call(fake,item,item.text,95,true);
 assert.equal(existing.h,95);
 assert.equal(fake.commits,1);
 Editor.prototype.applyText.call(fake,item,item.text,95,true);
 assert.equal(fake.commits,1);
 assert.equal(fake.paints,1);
});
