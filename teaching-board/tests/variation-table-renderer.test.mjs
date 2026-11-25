import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,serializeBackup,parseBackup,validateBoard} from '../js/model.js';
import {createVariationSpec,variationKey} from '../js/variation-table-model.js';
import {createVariationItem,variationLayout,renderVariationTable} from '../js/variation-table-renderer.js';
import {History} from '../js/history.js';
import {sceneSVG} from '../js/scene.js';

const svgNode=(name,attrs={})=>({name,attrs,children:[],textContent:'',append(...nodes){this.children.push(...nodes);}});

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
    const g=renderVariationTable(item,svgNode);
    const all=[];const visit=n=>{all.push(n);n.children.forEach(visit);};visit(g);
    assert.equal(g.attrs['data-variation-table'],'');
    assert(all.some(n=>n.name==='rect'&&n.attrs.fill==='#b8d4eb'));
    assert(all.some(n=>n.name==='path'&&n.attrs.d?.startsWith('M')));
    assert(all.some(n=>n.textContent==='מינימום'));
    assert(!all.some(n=>n.name==='foreignObject'));
    assert.equal(variationLayout(spec,item.w,item.h).count,9);
});
test('unanswered derivative cells stay empty alongside graded signs and zeros',()=>{
    const spec=createVariationSpec({mode:'combined',session:'check',zeros:'0',secondZeros:'0',
        derivativeSource:'3*x^2',secondSource:'6*x'});
    spec.samples[variationKey(null,0)]={secondSign:'-'};
    spec.samples[variationKey(0,null)]={sign:'+',secondSign:'?'};
    const item=createVariationItem(spec);
    const table=renderVariationTable(item,svgNode);
    const {first,cell,rows}=variationLayout(spec,item.w,item.h);
    function cellText(key,column){
        const row=rows.find(r=>r.key===key),left=first+column*cell;
        return table.children.filter(n=>n.name==='text'&&n.attrs.x>left&&n.attrs.x<left+cell
            &&n.attrs.y>row.y&&n.attrs.y<row.y+row.h).map(n=>n.textContent);
    }
    assert.deepEqual(cellText('first',0),[]);
    assert.deepEqual(cellText('second',2),[]);
    assert.deepEqual(cellText('first',2),['+','✓']);
    assert.deepEqual(cellText('second',0),['-','✓']);
    assert.deepEqual(cellText('first',1),['0']);
    assert.deepEqual(cellText('second',1),['0']);
});
