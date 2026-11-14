import test from 'node:test';
import assert from 'node:assert/strict';
import {TEXT_RICH_CLIPBOARD,parseRichClipboard,selectedRichClipboard,
    clipboardPlainText,clipboardHTML,replaceRichClipboard,plainClipboard,
    validateRichClipboard,absoluteCaret,plainPasteStyle} from '../js/text-inline-clipboard.js';
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
 assert.equal(result.paragraphs[1].list,'bullet',
  'A rich fragment splitting one paragraph keeps its new last list style');
 assert.equal(result.paragraphs[1].numberStart,undefined);
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
 assert.equal(inserted.paragraphs[1].numberStart,12,
  'Numbered source content keeps its visible ordinal after a bullet prefix');
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


test('cutting complete preceding paragraphs retains surviving RTL/LTR metadata and ordinal',()=>{
 const doc={runs:[{text:'First\nשני\nThird'}],
  paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:7},
   {align:'left',dir:'ltr',list:'number'},
   {align:'center',dir:'ltr',list:'bullet'}]};
 const cutFirst=replaceRichClipboard(doc,0,'First\n'.length,
  {schema:1,runs:[],paragraphs:[{align:'auto',dir:'auto',list:'none'}]});
 assert(cutFirst);
 assert.equal(cutFirst.text,'שני\nThird');
 assert.equal(cutFirst.paragraphs[0].dir,'ltr');
 assert.equal(cutFirst.paragraphs[0].numberStart,8);
 const cutAcross=replaceRichClipboard(doc,0,doc.runs[0].text.indexOf('ird'),
  {schema:1,runs:[],paragraphs:[{align:'auto',dir:'auto',list:'none'}]});
 assert.equal(cutAcross.text,'ird');
 assert.equal(cutAcross.paragraphs[0].list,'bullet');
 assert.equal(cutAcross.paragraphs[0].dir,'ltr');
});

test('copying lists into a bulleted prefix preserves the next numbered source ordinal',()=>{
 const copied={schema:1,runs:[{text:'שמונה\nNine'}],
  paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:8},
   {align:'left',dir:'ltr',list:'number'}]};
 const target={runs:[{text:'Prefix suffix'}],
  paragraphs:[{align:'right',dir:'rtl',list:'bullet'}]};
 const added=replaceRichClipboard(target,7,7,copied);
 assert(added);
 assert.equal(added.paragraphs[0].list,'bullet');
 assert.equal(added.paragraphs[1].list,'number');
 assert.equal(added.paragraphs[1].numberStart,9);
 assert.equal(added.paragraphs[1].dir,'ltr');
});


test('plain text inherits the style at a collapsed caret in mixed Hebrew/English runs',()=>{
 const doc={runs:[
  {text:'שלום ',bold:true,color:'#b42318'},
  {text:'English',italic:true,underline:true,color:'#147d92'},
  {text:'\nNew line',strike:true}
 ],paragraphs:[
  {align:'right',dir:'rtl',list:'none'},
  {align:'left',dir:'ltr',list:'none'}
 ]};
 const before=replaceRichClipboard(doc,2,2,plainClipboard('X'),{plainText:true});
 const red=before.runs.find(r=>r.text.includes('X'));
 assert.equal(red.bold,true);
 assert.equal(red.color,'#b42318');
 assert.equal(red.italic,false);
 const atBoundary=replaceRichClipboard(doc,5,5,plainClipboard('INSERT'),{plainText:true});
 assert.equal(atBoundary.runs.find(r=>r.text.includes('INSERT')).bold,true,
  'Collapsed caret at a style boundary inherits preceding run');
 const inside=replaceRichClipboard(doc,7,7,plainClipboard('YES'),{plainText:true});
 const teal=inside.runs.find(r=>r.text.includes('YES'));
 assert.equal(teal.italic,true);
 assert.equal(teal.underline,true);
 assert.equal(teal.color,'#147d92');
 const atNext=replaceRichClipboard(doc,14,14,plainClipboard('Z'),{plainText:true});
 const strike=atNext.runs.find(r=>r.text.includes('Z'));
 assert.equal(strike.strike,true);
 assert.equal(strike.color,undefined);
 assert.equal(atNext.paragraphs[1].dir,'ltr');
});

test('plain replacement inherits leading selected text, not style of preceding run',()=>{
 const doc={runs:[{text:'prefix ',bold:true},
                  {text:'colored',italic:true,color:'#7c50b0'},
                  {text:' end'}],
  paragraphs:[{align:'left',dir:'ltr',list:'none'}]};
 const replaced=replaceRichClipboard(doc,7,10,plainClipboard('NEW'),{plainText:true});
 assert(replaced);
 const r=replaced.runs.find(x=>x.text.includes('NEW'));
 assert.equal(r.italic,true);
 assert.equal(r.color,'#7c50b0');
 assert.equal(r.bold,false);
 assert.equal(replaced.text,'prefix NEWored end');
});

test('plain multiline paste inherits color and marks on each line without altering next paragraph',()=>{
 const doc={runs:[{text:'שלום עולם',bold:true,color:'#b42318'},
                  {text:'\nNext',italic:true,color:'#147d92'}],
  paragraphs:[{align:'right',dir:'rtl',list:'number',numberStart:7},
              {align:'left',dir:'ltr',list:'bullet'}]};
 const pasted=replaceRichClipboard(doc,5,5,plainClipboard('a\nb\nc'),{plainText:true});
 assert(pasted);
 assert.equal(pasted.text,'שלום a\nb\ncעולם\nNext');
 assert.deepEqual(pasted.paragraphs.map(x=>x.dir),['rtl','rtl','rtl','ltr']);
 for(const value of ['a\nb\nc']){
  assert(pasted.runs.some(r=>r.text.includes(value)&&r.bold&&r.color==='#b42318'));
 }
 assert.equal(pasted.runs.at(-1).italic,true);
 assert.equal(pasted.runs.at(-1).color,'#147d92');
});

test('pending formatting explicitly overrides inherited style for multiline plain paste',()=>{
 const doc={runs:[{text:'ערך',bold:true,italic:true,underline:true,strike:true,color:'#b42318'}],
  paragraphs:[{align:'right',dir:'rtl',list:'none'}]};
 const pasted=replaceRichClipboard(doc,2,2,plainClipboard('one\ntwo'),{
  plainText:true,marks:{bold:false,italic:false,underline:false,
   strikeThrough:false,color:'#147d92'}
 });
 assert(pasted);
 const middle=pasted.runs.filter(r=>r.text.includes('one')||r.text.includes('two'));
 assert.equal(middle.length,1);
 assert.equal(middle[0].text,'one\ntwo');
 assert.equal(middle[0].bold,false);
 assert.equal(middle[0].italic,false);
 assert.equal(middle[0].underline,false);
 assert.equal(middle[0].strike,false);
 assert.equal(middle[0].color,'#147d92');
 assert.deepEqual(pasted.paragraphs.map(p=>p.dir),['rtl','rtl']);
 const cleared=replaceRichClipboard(doc,2,2,plainClipboard('clear'),{
  plainText:true,marks:{color:null}
 });
 assert.equal(cleared.runs.find(r=>r.text.includes('clear')).color,undefined);
});

test('plain text pasted next to equations chooses nearby text style, never image source',()=>{
 const eq={source:'x',src:'data:image/png;base64,AAAA',w:45,h:30};
 const doc={runs:[
  {text:'Hello',bold:true,color:'#147d92'},
  {text:'\uFFFC',equation:eq},
  {text:'world',italic:true},
  {text:'\n',bold:false},
  {text:'English',underline:true}
 ],paragraphs:[
  {align:'right',dir:'rtl',list:'none'},
  {align:'left',dir:'ltr',list:'none'}
 ]};
 const next=replaceRichClipboard(doc,6,6,plainClipboard('X'),{plainText:true});
 assert(next);
 assert.equal(next.runs.find(r=>r.text.includes('X')).italic,true,
  'After an equation, inherit the immediately following word style');
 assert.equal(next.runs.find(r=>r.text.includes('X')).color,undefined);
 assert.equal(next.runs.find(r=>r.text.includes('X')).equation,undefined);
 const beforeEquation=replaceRichClipboard(doc,5,5,plainClipboard('B'),{plainText:true});
 assert.equal(beforeEquation.runs.find(r=>r.text.includes('B')).bold,true);
 assert.equal(beforeEquation.runs.find(r=>r.text.includes('B')).color,'#147d92');
 assert.equal(next.runs.find(r=>r.equation).equation.source,'x');
 const beginning=replaceRichClipboard(doc,7,7,plainClipboard('Y'),{plainText:true});
 assert.equal(beginning.runs.find(r=>r.text.includes('Y')).italic,true);
 assert.deepEqual(plainPasteStyle(doc,0,0),{bold:true,color:'#147d92'});
 assert.equal(plainPasteStyle(doc,-1,0),null);
});

test('invalid style overrides cannot inject unsafe HTML or color values into clipboard runs',()=>{
 const doc={runs:[{text:'safe',color:'#147d92'}],
  paragraphs:[{align:'left',dir:'ltr',list:'none'}]};
 const pasted=replaceRichClipboard(doc,2,2,plainClipboard('<img src=x>'),{
  plainText:true,marks:{color:'red;position:absolute',bold:'true',italic:17}
 });
 assert(pasted);
 assert(pasted.runs.some(r=>r.text.includes('<img src=x>')&&r.color==='#147d92'));
 assert(pasted.runs.every(r=>r.bold!==true&&r.italic!==true));
});
