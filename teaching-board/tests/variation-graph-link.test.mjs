import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createBoard,validateBoard,serializeBackup,parseBackup} from '../js/model.js';
import {createVariationSpec,analyzeVariation} from '../js/variation-table-model.js';
import {createVariationItem,renderVariationTable} from '../js/variation-table-renderer.js';

test('optional graph identifier is persisted with variation board object',()=>{
    const board=createBoard(),spec=createVariationSpec({zeros:'1',graphId:'g-123'});
    board.items.push(createVariationItem(spec));
    assert.equal(validateBoard(board).items[0].spec.graphId,'g-123');
    assert.equal(parseBackup(serializeBackup(board)).items[0].spec.graphId,'g-123');
});
test('SVG has interactive interval zones only for linked graph',()=>{
    const spec=createVariationSpec({zeros:'0',graphId:'g-123'});
    const node=(name,attrs={})=>({name,attrs,children:[],textContent:'',
        append(...c){this.children.push(...c);},setAttribute(k,v){this.attrs[k]=v;}});
    const get=()=>{const nodes=[];const walk=n=>{nodes.push(n);n.children.forEach(walk);};
        walk(renderVariationTable(createVariationItem(spec),node));return nodes.filter(n=>n.attrs['data-variation-interval']);};
    assert.equal(get().length,2);
    assert.deepEqual(get().map(n=>Number(n.attrs['data-variation-test'])),[-1,1]);
    delete spec.graphId;assert.equal(get().length,0);
});
test('graph highlight integrates with protected editor pointer flow',()=>{
    const editor=readFileSync(new URL('../js/editor.js',import.meta.url),'utf8');
    assert.match(editor,/addEventListener\('pointerdown',this\.variationPointer,true\)/);
    assert.match(editor,/linkVariationInterval\(table,x\)/);
    assert.match(editor,/targets\.some\(i=>this\.isLocked\(i\)\)/);
});
test('combined table classifies inflection without calling it an extremum',()=>{
    const s=createVariationSpec({mode:'combined',secondZeros:'0',secondSource:'6*x',
        derivativeSource:'3*x^2',autoSigns:true,assumeContinuous:true});
    assert.equal(analyzeVariation(s).points[0].inflection,true);
    assert.equal(analyzeVariation(s).points[0].extremum,null);
});
