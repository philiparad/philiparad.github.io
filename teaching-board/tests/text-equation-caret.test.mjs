import test from 'node:test';
import assert from 'node:assert/strict';
import {equationAtOffset,equationArrowStep} from '../js/text-equation-caret.js';

function text(value){return {nodeType:3,textContent:value,childNodes:[]};}
function element(...children){return {nodeType:1,childNodes:children};}
function math(source){return {nodeType:1,dataset:{equation:JSON.stringify({source})},childNodes:[
    element(text('image alt must never be counted'))
]};}

test('atomic math lookup counts one placeholder, not image descendants',()=>{
    const first=math('x^2'),second=math('y^2');
    const block=element(text('שלום '),first,text(' English '),second,text(' done'));
    assert.equal(equationAtOffset(block,5,1)?.node,first);
    assert.equal(equationAtOffset(block,6,-1)?.node,first);
    assert.equal(equationAtOffset(block,15,1)?.node,second);
    assert.equal(equationAtOffset(block,16,-1)?.node,second);
    for(const [offset,step] of [[4,1],[5,-1],[7,-1],[10,1],[15,-1],[17,-1]]){
        assert.equal(equationAtOffset(block,offset,step),null,offset+','+step);
    }
    assert.equal(equationAtOffset(block,NaN,1),null);
    assert.equal(equationAtOffset(block,6,0),null);
});
test('physical arrows map to logical paragraph flow around inline mathematics',()=>{
    assert.equal(equationArrowStep('ArrowRight','ltr'),1);
    assert.equal(equationArrowStep('ArrowLeft','ltr'),-1);
    assert.equal(equationArrowStep('ArrowRight','rtl'),-1);
    assert.equal(equationArrowStep('ArrowLeft','rtl'),1);
    assert.equal(equationArrowStep('ArrowUp','ltr'),0);
});
