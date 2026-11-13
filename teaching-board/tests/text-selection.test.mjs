import test from 'node:test';
import assert from 'node:assert/strict';
import {nodePath,resolvePath,captureTextSelection,restoreTextSelection} from '../js/text-selection.js';
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
