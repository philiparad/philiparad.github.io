import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createVariationSpec,analyzeVariation,variationKey} from '../js/variation-table-model.js';
import {createVariationItem} from '../js/variation-table-renderer.js';
const dialog=readFileSync(new URL('../js/variation-table-dialog.js',import.meta.url),'utf8');
const editor=readFileSync(new URL('../js/editor.js',import.meta.url),'utf8');

test('point lists and sample answers preserve edits on stable intervals',()=>{
    const original=createVariationSpec({zeros:'1,4',undefinedPoints:'-2,2'});
    original.samples[variationKey(1,2)]={x:1.5,sign:'+'};
    const updated=createVariationSpec({zeros:'1,4',undefinedPoints:'-2,2'});
    updated.samples=structuredClone(original.samples);
    assert.equal(analyzeVariation(updated).intervals[2].sign,'+');
    assert.equal(createVariationItem(updated).spec.samples['1|2'].x,1.5);
});
test('editor exposes insertion and editing with separated modal',()=>{
    assert.match(editor,/variationDialog\(existing\?\.spec/);
    assert.match(editor,/if\(i\.type==='variationTable'\)/);
    assert.match(editor,/bar\.insertBefore\(this\.variationButton/);
    assert.match(dialog,/createVariationSpec\(config\(\)\)/);
    assert.match(dialog,/samples\[it\.key\]/);
});
