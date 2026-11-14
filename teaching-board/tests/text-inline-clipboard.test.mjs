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
 assert.equal(result.paragraphs[1].list,'number',
  'Surviving destination suffix retains its own list type');
 assert.equal(result.paragraphs[1].numberStart,3,
  'Surviving destination suffix retains its explicit list restart');
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


test('copied middle list starts at its actual visible ordinal, including restarts',()=>{
 const rich={runs:[{text:'אחד\nשניים\nשלוש\nארבע\nחמש'}],
  paragraphs:[
   {align:'right',dir:'rtl',list:'number',numberStart:7},
   {align:'right',dir:'rtl',list:'number'},
   {align:'left',dir:'ltr',list:'number'},
   {align:'right',dir:'rtl',list:'number',numberStart:20},
   {align:'right',dir:'rtl',list:'number'}
  ]};
 const t=rich.runs[0].text,at=t.indexOf('שניים'),after=t.indexOf('\nארבע');
 const selected=selectedRichClipboard(rich,at,after);
 assert.equal(selected.runs.map(x=>x.text).join(''),'שניים\nשלוש');
 assert.equal(selected.paragraphs[0].numberStart,8);
 assert.equal(selected.paragraphs[1].numberStart,undefined);
 const later=selectedRichClipboard(rich,t.indexOf('חמש'),t.length);
 assert.equal(later.paragraphs[0].numberStart,21);
 const lastRestart=selectedRichClipboard(rich,t.indexOf('ארבע'),t.length);
 assert.deepEqual(lastRestart.paragraphs.map(x=>x.numberStart),[20,undefined]);
 const pasted=replaceRichClipboard({runs:[{text:'',bold:false}],
   paragraphs:[{align:'auto',dir:'auto',list:'none'}]},0,0,selected);
 assert.equal(pasted.paragraphs[0].numberStart,8);
 assert.equal(pasted.paragraphs[1].list,'number');
});

test('rich multiline paste preserves its interior numbering and existing trailing paragraph',()=>{
 const source={runs:[{text:'קבוצה\nEnglish\nמספרים'}],
  paragraphs:[
   {align:'right',dir:'rtl',list:'number',numberStart:11},
   {align:'left',dir:'ltr',list:'number'},
   {align:'right',dir:'rtl',list:'number'}
  ]};
 const target={runs:[{text:'Prefix before\nTail remainder'}],
  paragraphs:[
   {align:'center',dir:'ltr',list:'bullet'},
   {align:'left',dir:'ltr',list:'number',numberStart:4}
  ]};
 const inserted=replaceRichClipboard(target,7,19,{schema:1,...source});
 assert(inserted);
 assert.equal(inserted.text,'Prefix קבוצה\nEnglish\nמספריםremainder');
 assert.equal(inserted.paragraphs.length,3);
 assert.equal(inserted.paragraphs[0].list,'bullet');
 assert.equal(inserted.paragraphs[0].align,'center');
 assert.equal(inserted.paragraphs[1].numberStart,undefined);
 assert.equal(inserted.paragraphs[1].dir,'ltr');
 assert.equal(inserted.paragraphs[2].numberStart,4);
 assert.deepEqual(inserted.cursor,{paragraph:2,offset:6});
 const replaceAll=replaceRichClipboard(target,0,target.runs[0].text.length,
  {schema:1,...source});
 assert.deepEqual(replaceAll.paragraphs,source.paragraphs);
});

test('middle cut merges surviving paragraphs without changing their leading style',()=>{
 const doc={runs:[{text:'first\nmiddle\nlast'}],
  paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:7},
   {align:'left',dir:'ltr',list:'number'},
   {align:'center',dir:'ltr',list:'bullet'}]};
 const start=doc.runs[0].text.indexOf('st\n'),end=doc.runs[0].text.indexOf('st',11);
 const removed=replaceRichClipboard(doc,start,end,
  {schema:1,runs:[],paragraphs:[{align:'auto',dir:'auto',list:'none'}]});
 assert(removed);
 assert.equal(removed.paragraphs.length,1);
 assert.equal(removed.paragraphs[0].numberStart,7);
 assert.equal(removed.paragraphs[0].dir,'rtl');
});

test('plain multiline paste inherits target RTL list style but keeps following paragraph',()=>{
 const doc={runs:[{text:'שלום עולם\nEnglish end'}],
  paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:9},
   {align:'left',dir:'ltr',list:'bullet'}]};
 const payload=plainClipboard('first\nsecond\nthird');
 const result=replaceRichClipboard(doc,5,5,payload,{plainText:true});
 assert(result);
 assert.equal(result.text,'שלום first\nsecond\nthirdעולם\nEnglish end');
 assert.deepEqual(result.paragraphs.map(p=>p.list),['number','number','number','bullet']);
 assert.equal(result.paragraphs[0].numberStart,9);
 assert.equal(result.paragraphs[1].numberStart,undefined);
 assert.equal(result.paragraphs[2].numberStart,undefined);
 assert.deepEqual(result.paragraphs.map(p=>p.dir),['rtl','rtl','rtl','ltr']);
});

test('semantic portable HTML carries visible numbered list start and safe bidi paragraphs',()=>{
 const payload={schema:1,runs:[{text:'שלב ראשון\n'},{text:'English ',bold:true},
  {text:'\uFFFC',equation:{...equation,source:'x<2 & y>1'}},{text:'\n• bullet'}],
  paragraphs:[
   {align:'right',dir:'rtl',list:'number',numberStart:12},
   {align:'left',dir:'ltr',list:'number'},
   {align:'right',dir:'rtl',list:'bullet'}
  ]};
 const html=clipboardHTML(payload);
 assert.match(html,/<ol start="12">/);
 assert.match(html,/<li dir="rtl" style="text-align:right">/);
 assert.match(html,/<li dir="ltr" style="text-align:left"><strong>English <\/strong>/);
 assert.match(html,/<\/ol><ul><li dir="rtl"/);
 assert.match(html,/x&lt;2 &amp; y&gt;1/);
 assert(!html.includes('<2 &'));
 assert(html.includes('data-teaching-board-rich='));
 assert.equal(parseRichClipboard(decodeURIComponent(
  html.match(/data-teaching-board-rich="([^"]+)"/)[1])).runs[2].equation.source,
  'x<2 & y>1');
});

test('long multi-paragraph copy/paste respects document length and rejects invalid joins',()=>{
 const p=plainClipboard('A\nB\nC');
 const old={runs:[{text:'x'.repeat(9998)}],paragraphs:[
  {align:'auto',list:'none',dir:'ltr'}]};
 assert.equal(replaceRichClipboard(old,9998,9998,p),null);
 assert.equal(replaceRichClipboard(old,-1,0,p),null);
 assert.equal(replaceRichClipboard(old,4,3,p),null);
 const first=selectedRichClipboard({runs:[{text:'א\nב'}],
  paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:10000},
   {align:'right',dir:'rtl',list:'number'}]},2,3);
 // The schema permits explicit ordinals only up to 10000. A computed 10001
 // is outside that cap; do not generate invalid clipboard JSON or silently reset.
 assert.equal(first,null);
});
