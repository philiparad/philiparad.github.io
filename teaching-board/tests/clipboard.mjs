import assert from 'node:assert/strict';
import { clipboardImages,editingText } from '../js/clipboard.js';
const png={name:'test.png',type:'image/png'},jpg={name:'test.jpg',type:'image/jpeg'};
assert.deepEqual(clipboardImages({items:[{kind:'file',type:'image/png',getAsFile:()=>png}],files:[png]}),[png]);
assert.deepEqual(clipboardImages({files:[png,jpg,{type:'text/plain'}]}),[png,jpg]);
assert.deepEqual(clipboardImages({items:[{kind:'string',type:'text/html'},{kind:'file',type:'image/png',getAsFile:()=>null}],files:[]}),[]);
assert.deepEqual(clipboardImages(null),[]);
assert.equal(editingText({closest:()=>({})}),true);assert.equal(editingText({isContentEditable:true}),true);assert.equal(editingText({closest:()=>null}),false);
console.log('7 clipboard regression checks passed');
