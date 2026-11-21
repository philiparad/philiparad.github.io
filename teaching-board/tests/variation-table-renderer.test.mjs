import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,serializeBackup,parseBackup,validateBoard} from '../js/model.js';
import {createVariationSpec,analyzeVariation} from '../js/variation-table-model.js';
import {createVariationItem,variationLayout,renderVariationTable} from '../js/variation-table-renderer.js';
import {History} from '../js/history.js';
import {sceneSVG} from '../js/scene.js';

test('first-class variation object survives version-1 backup and undo/redo',()=>{
    const spec=createVariationSpec({zeros:'1,4',undefinedPoints:'-2,2',autoSigns:true,derivativeSource:'(-2*x^2+10*x-8)/(x^2-4)^2'});
    const item=createVariationItem(spec,{x:400,y:250});
    const board=createBoard();board.items.push(item);
    assert.doesNotThrow(()=>validateBoard(board));
    assert.deepEqual(parseBackup(serializeBackup(board)),board);
    const h=new History({items:[]});h.commit({items:[item]});
    assert.deepEqual(h.undo().items,[]);
    assert.equal(h.redo().items[0].spec.points.length,4);
    const bad=structuredClone(board);bad.items[0].spec.mode='invalid';
    assert.throws(()=>validateBoard(bad));
});
test('SVG renderer emits point shading, grid, arrows, labels without foreignObject',()=>{
    const spec=createVariationSpec({zeros:'1,4',undefinedPoints:'-2,2',autoSigns:true,derivativeSource:'(-2*x^2+10*x-8)/(x^2-4)^2'});
    const item=createVariationItem(spec,{x:400,y:250});
    const node=(name,attrs={})=>({name,attrs,children:[],textContent:'',append(...c){this.children.push(...c);}});
    const g=renderVariationTable(item,node);
    const all=[];const visit=n=>{all.push(n);n.children.forEach(visit);};visit(g);
    assert.equal(g.attrs['data-variation-table'],'');
    assert(all.some(n=>n.name==='rect'&&n.attrs.fill==='#b8d4eb'));
    assert(all.some(n=>n.name==='path'&&n.attrs.d?.startsWith('M')));
    assert(all.some(n=>n.textContent==='מינימום'));
    assert(!all.some(n=>n.name==='foreignObject'));
    assert.equal(variationLayout(spec,item.w,item.h).count,9);
});
