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
export function storeTextDraft(storage,boardId,item,snapshot,rawText=null,now=Date.now()){
 const key=draftStorageKey(boardId,item?.id);
 if(!key||!storage)return false;
 try{
  const valid=validateSnapshot(snapshot);
  const raw=typeof rawText==='string'?rawText.slice(0,10000):valid.text;
  storage.setItem(key,JSON.stringify({
   version:1,itemId:item.id,itemType:item.type,updatedAt:now,...valid,rawText:raw
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
     now-record.updatedAt>MAX_AGE_MS||
     typeof record.rawText!=='string'||record.rawText.length>10000)return null;
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
