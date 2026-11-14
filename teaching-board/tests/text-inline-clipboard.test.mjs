import test from 'node:test';
import assert from 'node:assert/strict';
import {TEXT_RICH_CLIPBOARD,parseRichClipboard,selectedRichClipboard,
    clipboardPlainText,clipboardHTML,replaceRichClipboard,plainClipboard,
    validateRichClipboard,absoluteCaret} from '../js/text-inline-clipboard.js';
const equation={source:'\\frac{x+1}{2}',src:'data:image/png;base64,AAAA',w:85,h:42};
const snapshot=()=>({
 runs:[{text:'שלום ',bold:true,color:'#b42318'},
       {text:'\uFFFC',equation},
       {text:' English\n',italic:true},
       {text:'Second paragraph',underline:true}],
 paragraphs:[{align:'right',dir:'rtl',list:'none'},
             {align:'left',dir:'ltr',list:'bullet'}]
});
test('rich clipboard carries only selected text, formatting and atomic equation source',()=>{
 const selected=selectedRichClipboard(snapshot(),2,13);
 assert.equal(TEXT_RICH_CLIPBOARD,'application/x-teaching-board-rich-text+json');
 assert(selected);
 assert.equal(selected.runs.map(r=>r.text).join(''),'ום \uFFFC Englis');
 assert.equal(selected.runs.find(r=>r.equation).equation.source,equation.source);
 assert.equal(selected.runs[0].bold,true);
 assert.equal(selected.runs[0].color,'#b42318');
 assert.equal(selected.runs.at(-1).italic,true);
 assert.deepEqual(selected.paragraphs,[snapshot().paragraphs[0]]);
 const plain=clipboardPlainText(selected);
 assert(plain.includes('\\('+equation.source+'\\)'));
 assert(!plain.includes('\uFFFC'));
 const encoded=clipboardHTML(selected);
 assert(encoded.includes('data-teaching-board-rich='));
 assert(encoded.includes('&amp;')===false);
 assert.deepEqual(parseRichClipboard(JSON.stringify(selected)),selected);
});
test('multi-paragraph selection retains paragraph direction and list metadata',()=>{
 const selected=selectedRichClipboard(snapshot(),5,21);
 assert.equal(selected.runs.map(r=>r.text).join(''),'\uFFFC English\nSecond');
 assert.deepEqual(selected.paragraphs,snapshot().paragraphs);
 assert.equal(selected.runs.find(r=>r.equation).equation.source,equation.source);
});
test('rich clipboard insert preserves equations; cut and undo can round-trip',()=>{
 const old=snapshot(),copy=selectedRichClipboard(old,5,6);
 const target={runs:[{text:'Answer: '}],paragraphs:[{align:'left',dir:'ltr',list:'none'}]};
 const inserted=replaceRichClipboard(target,8,8,copy);
 assert.equal(inserted.text,'Answer: \uFFFC');
 assert.equal(inserted.runs.at(-1).equation.source,equation.source);
 assert.deepEqual(inserted.cursor,{paragraph:0,offset:9});
 assert.equal(inserted.paragraphs[0].dir,'ltr');
 const removed=replaceRichClipboard(old,5,6,{schema:1,runs:[],paragraphs:[{align:'auto',dir:'auto',list:'none'}]});
 assert.equal(removed.text,'שלום  English\nSecond paragraph');
 assert.equal(removed.runs.filter(r=>r.equation).length,0);
 assert.deepEqual(removed.cursor,{paragraph:0,offset:5});
 const recovered=replaceRichClipboard(removed,5,5,copy);
 assert.equal(recovered.text,old.runs.map(r=>r.text).join(''));
 assert.equal(recovered.runs.find(r=>r.equation).equation.source,equation.source);
});
test('clipboard paragraph joins keep existing target direction and validate structure',()=>{
 const multi=selectedRichClipboard(snapshot(),0,22);
 const dest={runs:[{text:'Start END'}],paragraphs:[{align:'center',dir:'ltr',list:'number',numberStart:3}]};
 const result=replaceRichClipboard(dest,6,6,multi);
 assert(result);
 assert.equal(result.text,'Start '+multi.runs.map(r=>r.text).join('')+'END');
 assert.equal(result.paragraphs[0].list,'number');
 assert.equal(result.paragraphs[0].numberStart,3);
 assert.equal(result.paragraphs[1].list,'bullet');
 assert.equal(result.paragraphs[1].dir,'ltr');
 assert.deepEqual(absoluteCaret(result,result.cursor.paragraph===0?6:6),{paragraph:0,offset:6});
});
test('malformed data, huge content, non-image URLs and bare equation placeholders are rejected',()=>{
 for(const payload of [
  '{"schema":2,"runs":[],"paragraphs":[]}',
  'not JSON',
  JSON.stringify({schema:1,runs:[{text:'\uFFFC'}],paragraphs:[{align:'auto',list:'none'}]}),
  JSON.stringify({schema:1,runs:[{text:'\uFFFC',equation:{...equation,src:'https://host/image.png'}}],
   paragraphs:[{align:'auto',list:'none'}]}),
  'x'.repeat(4_000_001)
 ])assert.equal(parseRichClipboard(payload),null);
 assert.equal(selectedRichClipboard(snapshot(),5,5),null);
 assert.equal(replaceRichClipboard(snapshot(),0,0,{schema:1,runs:[{text:'\uFFFC'}],paragraphs:[{align:'auto',list:'none'}]}),null);
 assert.equal(plainClipboard('\uFFFC'),null);
 assert.equal(validateRichClipboard({schema:1,runs:[{text:'hello'}],paragraphs:[]}),null);
 assert.equal(replaceRichClipboard(snapshot(),0,0,plainClipboard('z'.repeat(10000))),null);
});
