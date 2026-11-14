import test from 'node:test';
import assert from 'node:assert/strict';
import {paragraphDirectionIsRtl,drawEquationText,equationLines} from '../js/inline-equation.js';

const row=(text,dir='auto')=>({align:'auto',dir,list:'none',runs:[{text}]});
const svgEl=(tag,attrs={})=>({tag,attrs,children:[],append(node){this.children.push(node);},textContent:''});
function draw(rowData){
 const previous=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({measureText(text){
  return {width:Array.from(text).length*10};
 }})})};
 try{
  return drawEquationText({w:72,fontSize:24},[rowData],svgEl).children.filter(n=>n.tag==='text');
 }finally{
  if(previous===undefined)delete globalThis.document;
  else globalThis.document=previous;
 }
}
test('TXT-066 auto direction uses the first strong letter of the whole paragraph',()=>{
 assert.equal(paragraphDirectionIsRtl(row('123 English שלום')),false);
 assert.equal(paragraphDirectionIsRtl(row(' 123 שלום English')),true);
 assert.equal(paragraphDirectionIsRtl(row('سلام English')),true);
 assert.equal(paragraphDirectionIsRtl(row('שלום English','ltr')),false);
 assert.equal(paragraphDirectionIsRtl(row('English שלום','rtl')),true);
 assert.equal(paragraphDirectionIsRtl(row('123 456')),false);
 assert.equal(paragraphDirectionIsRtl({dir:'auto',runs:[
  {text:'\uFFFC',equation:{source:'x'}},{text:' שלום'}
 ]}),true);
});
test('TXT-066 wrapped lines keep the original English-first LTR direction',()=>{
 const p=row('English English שלום שלום');
 const layout=equationLines([p],72,24,text=>Array.from(text).length*10);
 assert(layout.length>=3);
 const tokens=draw(p);
 const hebrew=tokens.filter(n=>/[\p{Script=Hebrew}]/u.test(n.textContent));
 const latin=tokens.filter(n=>/[\p{Script=Latin}]/u.test(n.textContent));
 assert(hebrew.length>0&&latin.length>0);
 assert(Math.min(...hebrew.map(n=>+n.attrs.y))>Math.min(...latin.map(n=>+n.attrs.y)));
 assert(hebrew.every(n=>n.attrs['text-anchor']==='end'),
  'Hebrew tokens remain embedded in an LTR paragraph after wrapping');
});
test('TXT-066 wrapped lines keep the original Hebrew-first RTL direction',()=>{
 const p=row('שלום שלום English English');
 const tokens=draw(p);
 const hebrew=tokens.filter(n=>/[\p{Script=Hebrew}]/u.test(n.textContent));
 assert(hebrew.length>0);
 assert(hebrew.every(n=>n.attrs['text-anchor']==='start'));
 assert.equal(paragraphDirectionIsRtl(p),true);
});
test('TXT-066 explicit RTL and LTR settings override first strong text',()=>{
 const latinRTL=draw(row('English English שלום','rtl'));
 const hebrew=latinRTL.filter(n=>/[\p{Script=Hebrew}]/u.test(n.textContent));
 assert(hebrew.every(n=>n.attrs['text-anchor']==='start'));
 const hebrewLTR=draw(row('שלום שלום English','ltr'));
 assert(hebrewLTR.filter(n=>/[\p{Script=Hebrew}]/u.test(n.textContent))
  .every(n=>n.attrs['text-anchor']==='end'));
});
