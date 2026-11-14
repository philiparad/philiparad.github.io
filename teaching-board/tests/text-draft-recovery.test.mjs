import test from 'node:test';
import assert from 'node:assert/strict';
import {draftStorageKey,storeTextDraft,readTextDraft,clearTextDraft,
 rawDraftText,isDifferentDraft} from '../js/text-draft-recovery.js';

const item={id:'note 1',type:'note',text:'Original',fontSize:24};
const boardId='lesson:אבג';
const snapshot={
 runs:[{text:'שלום ',bold:true},{text:'English',italic:true}],
 paragraphs:[{align:'right',list:'none',dir:'rtl'}]
};
function storage(){
 const map=new Map();
 return {map,getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),
  removeItem:k=>map.delete(k)};
}
test('draft key isolates lesson and text item identifiers',()=>{
 const key=draftStorageKey(boardId,item.id);
 assert.ok(key.startsWith('teaching-board:inline-draft:v1:'));
 assert.notEqual(key,draftStorageKey('other lesson',item.id));
 assert.notEqual(key,draftStorageKey(boardId,'other item'));
 assert.equal(draftStorageKey('',item.id),null);
 assert.equal(draftStorageKey(boardId,''),null);
});
test('valid formatted text persists locally, restores safely, and clears on discard',()=>{
 const store=storage(),before=structuredClone(snapshot),now=2000000000000;
 assert.equal(storeTextDraft(store,boardId,item,snapshot,null,now),true);
 assert.deepEqual(snapshot,before);
 const restored=readTextDraft(store,boardId,item,now+12000);
 assert.equal(restored.text,'שלום English');
 assert.deepEqual(restored.runs,snapshot.runs);
 assert.deepEqual(restored.paragraphs,snapshot.paragraphs);
 assert.equal(restored.rawText,restored.text);
 assert.equal(isDifferentDraft(restored,{runs:[{text:'Original'}],paragraphs:snapshot.paragraphs}),true);
 assert.equal(isDifferentDraft(restored,snapshot),false);
 assert.equal(readTextDraft(store,'another board',item,now),null);
 assert.equal(readTextDraft(store,boardId,{...item,type:'text'},now),null);
 assert.equal(clearTextDraft(store,boardId,item.id),true);
 assert.equal(readTextDraft(store,boardId,item,now),null);
});
test('invalid document metadata, expired records, tampering and storage failures are harmless',()=>{
 const now=2000000000000,store=storage();
 assert.equal(storeTextDraft(store,boardId,item,{...snapshot,paragraphs:[]},null,now),false);
 assert.equal(storeTextDraft(store,boardId,item,snapshot,null,now),true);
 const key=draftStorageKey(boardId,item.id);
 const original=JSON.parse(store.map.get(key));
 assert.equal(readTextDraft(store,boardId,item,now+31*24*60*60*1000),null);
 assert.equal(store.map.has(key),false,'Expired unsaved local text must be purged');
 store.map.set(key,JSON.stringify(original));
 store.map.set(key,JSON.stringify({...original,text:'tampered'}));
 assert.equal(readTextDraft(store,boardId,item,now),null);
 store.map.set(key,'{bad');
 assert.equal(readTextDraft(store,boardId,item,now),null);
 const blocked={setItem(){throw Error('Quota exceeded')},getItem(){throw Error('Storage disabled')},removeItem(){throw Error('Storage disabled')}};
 assert.equal(storeTextDraft(blocked,boardId,item,snapshot,null,now),false);
 assert.equal(readTextDraft(blocked,boardId,item,now),null);
 assert.equal(clearTextDraft(blocked,boardId,item.id),false);
});
test('invalid intermediate draft text is retained separately from last valid formatting',()=>{
 const store=storage(),now=2000000000000;
 const invalidRaw='שלום Broken Equation English';
 assert.equal(storeTextDraft(store,boardId,item,snapshot,invalidRaw,now),true);
 const record=readTextDraft(store,boardId,item,now);
 assert.equal(record.rawText,invalidRaw);
 assert.equal(record.runs.map(r=>r.text).join(''),'שלום English');
 assert.equal(isDifferentDraft(record,snapshot),true);
 assert.equal(rawDraftText({innerText:invalidRaw,textContent:'not preferred'}),invalidRaw);
 assert.equal(rawDraftText({textContent:'Fallback'}),'Fallback');
 assert.equal(rawDraftText(null),'');
});
