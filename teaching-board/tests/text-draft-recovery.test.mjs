import test from 'node:test';
import assert from 'node:assert/strict';
import {draftStorageKey,storeTextDraft,readTextDraft,clearTextDraft,
 rawDraftText,isDifferentDraft,listNewTextDrafts} from '../js/text-draft-recovery.js';

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

test('uncommitted new note drafts can be found without restoring existing objects',()=>{
 const store=storage(),now=2000000000000;
 store.length=0;
 store.key=index=>[...store.map.keys()][index]??null;
 store.setItem=(key,value)=>{store.map.set(key,value);store.length=store.map.size;};
 store.removeItem=key=>{store.map.delete(key);store.length=store.map.size;};
 const newNote={id:'new-note',type:'note',x:50,y:80,w:260,h:130,
  fontSize:26,fill:'#fff1a8',rotation:0,text:''};
 const another={...newNote,id:'second-note',x:110};
 assert.equal(storeTextDraft(store,boardId,newNote,snapshot,null,now,{newItem:true}),true);
 assert.equal(storeTextDraft(store,boardId,another,snapshot,null,now+10,{newItem:true}),true);
 const found=listNewTextDrafts(store,boardId,[],now+100);
 assert.deepEqual(found.map(x=>x.item.id),['second-note','new-note']);
 assert.equal(found[1].item.fill,'#fff1a8');
 assert.equal(found[1].item.text,'');
 assert.equal(found[1].text,'שלום English');
 assert.equal(listNewTextDrafts(store,boardId,['new-note'],now+100).length,1);
 assert.equal(listNewTextDrafts(store,'unrelated',[],now+100).length,0);
 assert.equal(listNewTextDrafts(store,boardId,[],now+31*86400000).length,0);
 assert.equal(store.length,0,'Expired new-draft records are purged');
});
test('new-object draft enumeration ignores existing records, invalid templates and storage errors',()=>{
 const store=storage(),now=2000000000000;
 store.key=i=>[...store.map.keys()][i]??null;
 Object.defineProperty(store,'length',{get:()=>store.map.size});
 const valid={id:'new-text',type:'text',x:0,y:10,w:360,h:130,fontSize:24,text:''};
 assert.equal(storeTextDraft(store,boardId,valid,snapshot,null,now),true);
 assert.deepEqual(listNewTextDrafts(store,boardId,[],now),[],'Existing object records must not be orphan candidates');
 assert.equal(storeTextDraft(store,boardId,{...valid,w:Infinity},snapshot,null,now,{newItem:true}),false);
 assert.equal(storeTextDraft(store,boardId,valid,snapshot,null,now,{newItem:true}),true);
 const key=draftStorageKey(boardId,valid.id),record=JSON.parse(store.map.get(key));
 store.map.set(key,JSON.stringify({...record,newItem:{...record.newItem,id:'mismatch'}}));
 assert.deepEqual(listNewTextDrafts(store,boardId,[],now),[]);
 store.map.set(key,JSON.stringify(record));
 assert.equal(listNewTextDrafts(store,boardId,[],now).length,1);
 const broken={length:1,key(){throw Error('denied')}};
 assert.deepEqual(listNewTextDrafts(broken,boardId,[],now),[]);
});

test('new-object recovery rejects malformed numeric styles and geometry',()=>{
 const store=storage(),now=2000000000000;
 store.key=i=>[...store.map.keys()][i]??null;
 Object.defineProperty(store,'length',{get:()=>store.map.size});
 const valid={id:'numeric-guard',type:'note',x:25,y:35,w:260,h:130,fontSize:24,
  rotation:0,strokeOpacity:1,fillOpacity:0.8,opacity:0.9,lineWidth:2,text:''};
 for(const patch of [
  {rotation:NaN},{rotation:Infinity},{opacity:2},{opacity:-0.1},
  {strokeOpacity:'opaque'},{fillOpacity:Infinity},{lineWidth:-1},
  {lineWidth:1001},{lineWidth:0},{x:1e7},{y:-1e7}
 ]){
  assert.equal(storeTextDraft(store,boardId,{...valid,...patch},snapshot,null,now,
   {newItem:true}),false,JSON.stringify(patch));
 }
 assert.equal(storeTextDraft(store,boardId,valid,snapshot,null,now,{newItem:true}),true);
 const key=draftStorageKey(boardId,valid.id);
 const original=JSON.parse(store.map.get(key));
 store.map.set(key,JSON.stringify({...original,newItem:{...original.newItem,rotation:'bad'}}));
 assert.deepEqual(listNewTextDrafts(store,boardId,[],now),[]);
 store.map.set(key,JSON.stringify(original));
 assert.equal(listNewTextDrafts(store,boardId,[],now).length,1);
});

test('new-object draft recovery rejects invalid colors, line styles, alignment and locks',()=>{
 const store=storage(),now=2000000000000;
 store.key=i=>[...store.map.keys()][i]??null;
 Object.defineProperty(store,'length',{get:()=>store.map.size});
 const valid={id:'style-guard',type:'note',x:30,y:60,w:280,h:120,fontSize:26,
  fill:'#fff1a8',stroke:'#203954',locked:false,textAlign:'center',
  textStyle:'bold-italic',lineStyle:'dashed',lineWidth:2,text:''};
 const malformed=[
  {stroke:'blue'},{fill:'#123'},{stroke:{color:'#123456'}},
  {locked:'false'},{textAlign:'justify'},{textStyle:'normal!important'},
  {lineStyle:'zigzag'}
 ];
 for(const patch of malformed){
  assert.equal(storeTextDraft(store,boardId,{...valid,...patch},snapshot,null,now,
   {newItem:true}),false,'Invalid draft was stored: '+JSON.stringify(patch));
 }
 assert.equal(storeTextDraft(store,boardId,valid,snapshot,null,now,{newItem:true}),true);
 const key=draftStorageKey(boardId,valid.id),original=JSON.parse(store.getItem(key));
 const recovered=listNewTextDrafts(store,boardId,[],now);
 assert.equal(recovered.length,1);
 assert.equal(recovered[0].item.textAlign,'center');
 assert.equal(recovered[0].item.lineStyle,'dashed');
 for(const patch of malformed){
  store.setItem(key,JSON.stringify({...original,newItem:{...original.newItem,...patch}}));
  assert.deepEqual(listNewTextDrafts(store,boardId,[],now),[],
   'Tampered invalid metadata was offered for recovery: '+JSON.stringify(patch));
 }
 store.setItem(key,JSON.stringify(original));
 assert.equal(listNewTextDrafts(store,boardId,[],now).length,1);
});
