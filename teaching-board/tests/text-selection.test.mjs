import test from 'node:test';
import assert from 'node:assert/strict';
import {nodePath,resolvePath,captureTextSelection,restoreTextSelection,logicalParagraphs,restoreLogicalSelection,captureLogicalSelection} from '../js/text-selection.js';
function element(...children){
 const node={nodeType:1,childNodes:children,contains(other){return this===other||this.childNodes.some(child=>child===other||child.contains?.(other));}};
 children.forEach(child=>child.parentNode=node);
 return node;
}
function txt(value){return {nodeType:3,textContent:value,childNodes:[]};}

test('selection paths work for nested Hebrew/English text and collapsed carets',()=>{
 const heb=txt('שלום'),eng=txt('English');
 const root=element(element(heb),element(element(eng)));
 const selection={rangeCount:1,anchorNode:heb,anchorOffset:2,focusNode:eng,focusOffset:4};
 const saved=captureTextSelection(root,selection);
 assert.deepEqual(saved,{anchor:[0,0],anchorOffset:2,focus:[1,0,0],focusOffset:4});
 assert.equal(resolvePath(root,[1,0,0]),eng);
 const copy=element(element(txt('שלום')),element(element(txt('English'))));
 const target={setBaseAndExtent(...args){this.args=args;}};
 assert.equal(restoreTextSelection(copy,target,saved),true);
 assert.deepEqual(target.args,[copy.childNodes[0].childNodes[0],2,copy.childNodes[1].childNodes[0].childNodes[0],4]);
});
test('selection restoration clamps offsets and rejects stale paths safely',()=>{
 const original=element(txt('long'));
 const saved=captureTextSelection(original,{rangeCount:1,anchorNode:original.childNodes[0],anchorOffset:4,focusNode:original.childNodes[0],focusOffset:4});
 const shorter=element(txt('x')),selection={setBaseAndExtent(...args){this.args=args;}};
 assert.equal(restoreTextSelection(shorter,selection,saved),true);
 assert.equal(selection.args[1],1);
 assert.equal(selection.args[3],1);
 assert.equal(restoreTextSelection(element(),selection,saved),false);
 assert.equal(nodePath(original,txt('elsewhere')),null);
 assert.equal(captureTextSelection(original,{rangeCount:0}),null);
});

test('logical caret restores across rewritten spans and bullet/number DOM grouping',()=>{
 const node=(tag,...children)=>{
  const e={nodeType:1,tagName:tag.toUpperCase(),childNodes:children,children:children.filter(c=>c.nodeType===1),
   contains(other){return this===other||this.childNodes.some(c=>c===other||c.contains?.(other));}};
  for(const c of children){c.parentNode=e;c.parentElement=e;}
  return e;
 };
 const old=node('div',node('div',node('span',txt('שלום'))),node('div',node('span',txt('English'))));
 const rebuilt=node('div',node('ol',node('li',node('span',txt('של')),node('span',txt('ום')))),
  node('div',node('span',txt('Eng')),node('span',txt('lish'))));
 const selection={setBaseAndExtent(...args){this.args=args;}};
 const saved={anchor:{paragraph:0,offset:2},focus:{paragraph:1,offset:4}};
 assert.equal(logicalParagraphs(old).length,2);
 assert.equal(logicalParagraphs(rebuilt).length,2);
 assert.equal(restoreLogicalSelection(rebuilt,selection,saved),true);
 assert.equal(selection.args[0].textContent,'של');
 assert.equal(selection.args[1],2);
 assert.equal(selection.args[2].textContent,'lish');
 assert.equal(selection.args[3],1);
 assert.equal(restoreLogicalSelection(rebuilt,selection,{...saved,focus:{paragraph:8,offset:1}}),false);
});
test('logical offsets treat a complete inline equation as a single atomic character',()=>{
 const eq={nodeType:1,tagName:'SPAN',dataset:{equation:'{"source":"x"}'},childNodes:[],children:[]};
 const t1=txt('x='),t2=txt('42');
 const root={nodeType:1,tagName:'DIV',childNodes:[],children:[],contains(other){return this===other||this.childNodes.some(c=>c.contains?.(other)||c===other);}};
 const block={nodeType:1,tagName:'DIV',childNodes:[t1,eq,t2],children:[eq],contains(other){return this===other||this.childNodes.some(c=>c===other);}};
 for(const child of block.childNodes){child.parentNode=block;child.parentElement=block;}block.parentNode=root;root.childNodes=[block];root.children=[block];
 const selection={setBaseAndExtent(...args){this.args=args;}};
 assert.equal(restoreLogicalSelection(root,selection,{anchor:{paragraph:0,offset:2},focus:{paragraph:0,offset:3}}),true);
 assert.equal(selection.args[0],t1);
 assert.equal(selection.args[1],2);
 assert.equal(selection.args[2],block);
 assert.equal(selection.args[3],2);
 assert.equal(restoreLogicalSelection(root,selection,{anchor:{paragraph:0,offset:999},focus:{paragraph:0,offset:999}}),true);
 assert.equal(selection.args[3],2);
});

test('logical selection counts text returned inside browser Range DocumentFragments',()=>{
 const make=(tag,value)=>{
  const textNode=txt(value),span={nodeType:1,tagName:'SPAN',childNodes:[textNode]};
  const block={nodeType:1,tagName:tag,childNodes:[span],children:[span],
   contains(n){return n===this||n===span||n===textNode;}};
  span.parentNode=block;textNode.parentNode=span;
  return {block,textNode};
 };
 const first=make('DIV','שלום Middle'),second=make('DIV','English נוסחה');
 const root={nodeType:1,tagName:'DIV',children:[first.block,second.block],childNodes:[first.block,second.block],
  contains(n){return n===this||this.children.some(b=>b.contains(n));}};
 first.block.parentNode=root;second.block.parentNode=root;
 const selection={rangeCount:1,anchorNode:first.textNode,anchorOffset:2,focusNode:second.textNode,focusOffset:3};
 const old=globalThis.document;
 globalThis.document={createRange:()=>({
  selectNodeContents(block){this.block=block;},
  setEnd(node,offset){this.node=node;this.offset=offset;},
  cloneContents(){return {nodeType:11,childNodes:[{nodeType:1,childNodes:[
   {nodeType:3,textContent:this.node.textContent.slice(0,this.offset)}
  ]}]};}
 })};
 try{
  assert.deepEqual(captureLogicalSelection(root,selection),{
   anchor:{paragraph:0,offset:2},focus:{paragraph:1,offset:3}
  });
 }finally{globalThis.document=old;}
});
