import test from 'node:test';
import assert from 'node:assert/strict';
import {firstStrongTextDirection,paragraphDirectionIsRtl,drawEquationText}
 from '../js/inline-equation.js';

const paragraph=(text,dir='auto')=>({align:'auto',dir,list:'none',runs:[{text}]});
const svgEl=(tag,attributes={})=>({
 tag,attributes,children:[],append(node){this.children.push(node);},
 set textContent(value){this.content=value;},
 get textContent(){return this.content||'';}
});
const textNodes=p=>{
 const prior=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({measureText(text){return {width:Array.from(text).length*8};}})})};
 try{return drawEquationText({type:'text',w:520,fontSize:24},[p],svgEl).children.filter(n=>n.tag==='text');}
 finally{
  if(prior===undefined)delete globalThis.document;
  else globalThis.document=prior;
 }
};
test('TXT-068: Greek mathematics, Cyrillic and other LTR scripts are strong before Hebrew',()=>{
 for(const source of ['α + β שלום','Δx² שלום','123 π שלום','Привет שלום','你好 שלום','१२३ α שלום']){
  assert.equal(firstStrongTextDirection(source),'ltr',source);
  assert.equal(paragraphDirectionIsRtl(paragraph(source)),false,source);
 }
 assert.equal(firstStrongTextDirection('𞤀 Hello'),'rtl','Adlam is RTL');
 assert.equal(firstStrongTextDirection('ܫܠܡ English'),'rtl','Syriac is RTL');
});
test('TXT-068: Hebrew and Arabic remain RTL; explicit direction wins',()=>{
 for(const source of ['שלום α + β','١٢٣ مرحبا Δ','123 שלום Δ']){
  assert.equal(paragraphDirectionIsRtl(paragraph(source)),true,source);
 }
 assert.equal(paragraphDirectionIsRtl(paragraph('α שלום','rtl')),true);
 assert.equal(paragraphDirectionIsRtl(paragraph('שלום α','ltr')),false);
 assert.equal(firstStrongTextDirection('123 + 456','rtl'),'rtl');
 assert.equal(firstStrongTextDirection('123 + 456'),'ltr');
});
test('TXT-068: inline equations remain neutral for paragraph direction',()=>{
 const p={dir:'auto',runs:[
  {text:'\uFFFC',equation:{source:'x^2'}},
  {text:'123 Δ + y שלום'}
 ]};
 assert.equal(paragraphDirectionIsRtl(p),false);
});
test('TXT-068: SVG anchors use Greek/math and Hebrew token directions independently',()=>{
 const lines=textNodes(paragraph('שלום α β Δ English'));
 const greek=lines.filter(n=>/[αβΔ]/u.test(n.textContent));
 const hebrew=lines.find(n=>n.textContent.includes('שלום'));
 assert.equal(hebrew.attributes.direction,'rtl');
 assert.equal(hebrew.attributes['text-anchor'],'start');
 assert(greek.length>=3);
 assert(greek.every(n=>n.attributes.direction==='ltr'));
 assert(greek.every(n=>n.attributes['text-anchor']==='end'));
 const reverse=textNodes(paragraph('α β שלום'));
 assert.equal(reverse.find(n=>n.textContent==='α').attributes.direction,'ltr');
 assert.equal(reverse.find(n=>n.textContent==='שלום').attributes.direction,'rtl');
 assert.equal(reverse.find(n=>n.textContent==='שלום').attributes['text-anchor'],'end');
});
