import {validateRuns,validateParagraphs} from './rich-text.js?v=20261017-history-budget';

const PREFIX='teaching-board:inline-draft:v1:';
const MAX_AGE_MS=30*24*60*60*1000;

/**
 * Best-effort local recovery for an unsaved inline text edit.
 * Records are plain, validated document data—never untrusted HTML.
 * All persistence errors (private browsing, quota, unavailable storage)
 * leave the editor usable.
 */
export function draftStorageKey(boardId,itemId){
 if(typeof boardId!=='string'||!boardId||boardId.length>200||
    typeof itemId!=='string'||!itemId||itemId.length>200)return null;
 return PREFIX+encodeURIComponent(boardId)+':'+encodeURIComponent(itemId);
}
function validateSnapshot(snapshot){
 if(!snapshot||!Array.isArray(snapshot.runs)||!Array.isArray(snapshot.paragraphs))
  throw new Error('Invalid recovery snapshot');
 const text=snapshot.runs.map(run=>run.text).join('');
 validateRuns(snapshot.runs,text);
 validateParagraphs(snapshot.paragraphs,text);
 return {text,runs:structuredClone(snapshot.runs),paragraphs:structuredClone(snapshot.paragraphs)};
}
const NEW_ITEM_FIELDS=['id','type','x','y','w','h','stroke','strokeOpacity',
 'fill','fillOpacity','lineWidth','lineStyle','opacity','rotation','locked',
 'fontSize','textAlign','textStyle'];
function newItemTemplate(item){
 if(!item||!['text','note'].includes(item.type))return null;
 const result={};
 for(const field of NEW_ITEM_FIELDS){
  if(item[field]!==undefined)result[field]=item[field];
 }
 result.text='';
 if(typeof result.id!=='string'||!result.id||result.id.length>200||
    ![result.x,result.y,result.w,result.h,result.fontSize].every(Number.isFinite)||
    result.w<1||result.h<1||result.w>10000||result.h>10000||
    result.fontSize<1||result.fontSize>1000)return null;
 return result;
}
export function storeTextDraft(storage,boardId,item,snapshot,rawText=null,now=Date.now(),options={}){
 const key=draftStorageKey(boardId,item?.id);
 if(!key||!storage)return false;
 try{
  const valid=validateSnapshot(snapshot);
  if(options.newItem===true&&!newItemTemplate(item))return false;
  const raw=typeof rawText==='string'?rawText.slice(0,10000):valid.text;
  storage.setItem(key,JSON.stringify({
   version:1,itemId:item.id,itemType:item.type,updatedAt:now,...valid,rawText:raw,
   ...(options.newItem===true?{newItem:newItemTemplate(item)}:{})
  }));
  return true;
 }catch{return false;}
}
export function readTextDraft(storage,boardId,item,now=Date.now()){
 const key=draftStorageKey(boardId,item?.id);
 if(!key||!storage)return null;
 try{
  const raw=storage.getItem(key);
  if(!raw||raw.length>200000)return null;
  const record=JSON.parse(raw);
  if(record.version!==1||record.itemId!==item.id||record.itemType!==item.type||
     !Number.isFinite(record.updatedAt)||record.updatedAt>now+60000||
     typeof record.rawText!=='string'||record.rawText.length>10000)return null;
  if(now-record.updatedAt>MAX_AGE_MS){
   // Expired unsaved content should not remain indefinitely in local storage.
   try{storage.removeItem(key);}catch{/* Storage can be blocked. */}
   return null;
  }
  const valid=validateSnapshot(record);
  if(valid.text!==record.text)return null;
  return {...valid,rawText:record.rawText,updatedAt:record.updatedAt};
 }catch{return null;}
}
export function clearTextDraft(storage,boardId,itemId){
 const key=draftStorageKey(boardId,itemId);
 if(!key||!storage)return false;
 try{storage.removeItem(key);return true;}catch{return false;}
}
export function rawDraftText(root){
 const text=typeof root?.innerText==='string'?root.innerText:root?.textContent;
 return typeof text==='string'?text.slice(0,10000):'';
}
export function isDifferentDraft(record,snapshot){
 if(!record)return false;
 try{
  const valid=validateSnapshot(snapshot);
  return valid.text!==record.text||
   JSON.stringify(valid.runs)!==JSON.stringify(record.runs)||
   JSON.stringify(valid.paragraphs)!==JSON.stringify(record.paragraphs)||
   record.rawText!==record.text;
 }catch{return true;}
}

/**
 * Find uncommitted new text/note drafts belonging to a lesson, excluding
 * objects which are already present. Reading never inserts anything.
 */
export function listNewTextDrafts(storage,boardId,existingIds=[],now=Date.now()){
 if(typeof boardId!=='string'||!boardId||boardId.length>200||!storage)return [];
 const stem=PREFIX+encodeURIComponent(boardId)+':';
 const known=new Set(existingIds),candidates=[];
 try{
  const limit=Math.min(storage.length,5000);
  for(let index=0;index<limit;index++){
   const key=storage.key(index);
   if(typeof key!=='string'||!key.startsWith(stem))continue;
   const raw=storage.getItem(key);
   if(typeof raw!=='string'||raw.length>200000)continue;
   let parsed;
   try{parsed=JSON.parse(raw);}catch{continue;}
   const template=newItemTemplate(parsed?.newItem);
   if(!template||known.has(template.id)||draftStorageKey(boardId,template.id)!==key||
      parsed.itemId!==template.id||parsed.itemType!==template.type)continue;
   const record=readTextDraft(storage,boardId,template,now);
   if(!record||(!record.text&&record.rawText===''))continue;
   candidates.push({item:template,...record});
  }
 }catch{/* Storage enumeration may be disallowed. */}
 return candidates.sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,20);
}
