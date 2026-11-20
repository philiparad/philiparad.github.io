import {canvasTextFont} from './text-font.js?v=20261120-perf012';

// PERF-003 — One lazily-created canvas context per document and a bounded LRU
// of token widths shared by every text layout (including versioned importers).
// Canvas fonts depend on the available font faces: discard widths when those
// faces finish loading. Keep no DOM nodes inside the token-width cache.
const MAX_WIDTHS=4096;
const widths=new Map();
let currentDocument;
let context=null;
let assignedFont=null;
let fontSet=null;

function clearWidths(){
 widths.clear();
 assignedFont=null;
}

function textContext(){
 const active=typeof document==='undefined'?null:document;
 if(active!==currentDocument){
  fontSet?.removeEventListener?.('loadingdone',clearWidths);
  fontSet?.removeEventListener?.('loadingerror',clearWidths);
  currentDocument=active;
  context=active?.createElement?.('canvas')?.getContext?.('2d')||null;
  fontSet=active?.fonts||null;
  fontSet?.addEventListener?.('loadingdone',clearWidths);
  fontSet?.addEventListener?.('loadingerror',clearWidths);
  clearWidths();
 }
 return context;
}

export function textMeasurer(size){
 const ctx=textContext();
 // Preserve the original server-side/no-canvas approximation exactly.
 if(!ctx)return text=>Array.from(text).length*size*.55;
 return (text,run)=>{
  const font=canvasTextFont(size,run);
  const key=font+'\0'+text;
  const cached=widths.get(key);
  if(cached!==undefined){
   // LRU: frequently used words survive large documents.
   widths.delete(key);widths.set(key,cached);
   return cached;
  }
  if(assignedFont!==font){ctx.font=font;assignedFont=font;}
  const width=ctx.measureText(text).width;
  if(widths.size>=MAX_WIDTHS)widths.delete(widths.keys().next().value);
  widths.set(key,width);
  return width;
 };
}
