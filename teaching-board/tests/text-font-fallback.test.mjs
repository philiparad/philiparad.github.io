import test from 'node:test';
import assert from 'node:assert/strict';
import {TEXT_FONT_FAMILY,canvasTextFont,editableTextFont} from '../js/text-font.js';
import {drawEquationText,textLayoutMetrics} from '../js/inline-equation.js';
import {paragraphRuns} from '../js/rich-text.js';

function svgEl(tag,attrs={}){
    return {tag,attrs,children:[],append(child){this.children.push(child);}};
}
const flatten=node=>[node,...node.children.flatMap(flatten)];
test('TXT-065 fallback font chain is consistent for canvas and editable text',()=>{
    assert.match(TEXT_FONT_FAMILY,/^Arial,/);
    assert(TEXT_FONT_FAMILY.includes('Noto Sans Hebrew'));
    assert(TEXT_FONT_FAMILY.endsWith('sans-serif'));
    assert.equal(canvasTextFont(24,{bold:true,italic:true}),
        `italic 700 24px ${TEXT_FONT_FAMILY}`);
    assert.equal(editableTextFont(24,'bold italic'),
        `italic 700 24px/1.3 ${TEXT_FONT_FAMILY}`);
    assert.equal(editableTextFont(30),
        `normal 400 30px/1.3 ${TEXT_FONT_FAMILY}`);
});
test('TXT-065 bilingual Canvas measurements use the same fallback as SVG tokens',()=>{
    const previous=globalThis.document,observedFonts=[];
    try{
        const context={
            set font(value){observedFonts.push(value);},
            measureText(value){return {width:[...value].length*8};}
        };
        globalThis.document={createElement(tag){
            assert.equal(tag,'canvas');
            return {getContext(kind){assert.equal(kind,'2d');return context;}};
        }};
        const item={type:'text',w:360,fontSize:24,text:'שלום English',
            runs:[{text:'שלום ',bold:true},{text:'English',italic:true}],
            paragraphs:[{align:'right',dir:'rtl',list:'none'}]};
        const paragraphs=paragraphRuns(item);
        const metrics=textLayoutMetrics(item,paragraphs);
        assert(metrics.height>0);
        assert(observedFonts.includes(canvasTextFont(24,{bold:true})));
        assert(observedFonts.includes(canvasTextFont(24,{italic:true})));
        assert(observedFonts.every(font=>font.endsWith(TEXT_FONT_FAMILY)));
        const nodes=flatten(drawEquationText(item,paragraphs,svgEl))
            .filter(n=>n.tag==='text');
        assert(nodes.length>=2);
        assert(nodes.every(n=>n.attrs['font-family']===TEXT_FONT_FAMILY));
        assert(nodes.some(n=>n.textContent?.includes('שלום')));
        assert(nodes.some(n=>n.textContent?.includes('English')));
    }finally{
        if(previous===undefined)delete globalThis.document;
        else globalThis.document=previous;
    }
});
