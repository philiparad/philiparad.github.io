/* REA-019 — keylog formatting and LCD export options.
 * Educational visualization; no replay, no calculation editing outside LCD.
 * Uses fresh, independently rendered canvas rather than CASIO bitmap assets.
 */
(function(global){'use strict';
const LABELS=Object.freeze({
 SHIFT:'SHIFT',ALPHA:'ALPHA',MODE:'MODE',ON:'ON',
 EQUAL:'=',DEL:'DEL',AC:'AC',LEFT:'◀',RIGHT:'▶',UP:'▲',DOWN:'▼',
 ADD:'+',SUB:'−',MUL:'×',DIV:'÷',POWER:'x^□',SQUARE:'x²',FRAC:'a/b',
 SQRT:'√',LP:'(',RP:')',DOT:'.',COMMA:',',EXP:'×10ˣ',ANS:'Ans',
 SIN:'sin',COS:'cos',TAN:'tan',LOG:'log',LN:'ln',NEG:'(−)',
 RCL:'RCL',MPLUS:'M+',SD:'S⇔D',DMS:'°′″',INTEGRAL:'∫',
 CALC:'CALC',HYP:'hyp',ENG:'ENG',RECIP:'x⁻¹',LOGBASE:'log□'
});
const isInteger=i=>Number.isInteger(i)&&i>=0;
function labelFor(key){
 const k=String(key||'');
 if(/^TEXT:/.test(k))return k.slice(5);
 return LABELS[k]||k;
}
function formattedEntries(entries){
 return (entries||[]).map((entry,index)=>{
  const before=entry.before||{},key=entry.key||'';
  const keyName=labelFor(key);
  // The emulator key log shows key presses in order, including modifiers.
  // Keep SHIFT/ALPHA as their own recorded events instead of changing order.
  const text=keyName;
  return {index,id:index,key,display:text,mode:before.mode||'',shift:!!before.shift,
   alpha:!!before.alpha,screen:entry.after?.screen||'',result:entry.after?.result||''};
 });
}
function selectionIndices(entries,selected){
 const values=new Set((selected||[]).filter(isInteger));
 return [...values].filter(i=>i<entries.length).sort((a,b)=>a-b);
}
function trace(entries,indices){
 const rows=formattedEntries(entries);
 const chosen=indices===undefined?rows:selectionIndices(entries,indices).map(i=>rows[i]);
 return chosen.map(row=>row.display).join(' ');
}
function createImage(canvas,options={}){
 if(!canvas||typeof document==='undefined')throw Error('Missing source LCD canvas');
 const zoom=Math.max(1,Math.min(6,Math.trunc(Number(options.zoom)||1)));
 const frame=options.frame!==false;
 // Canvas contains the web project's 768×248 LCD raster. Work from that
 // original bitmap and scale with nearest-neighbor to preserve pixel edges.
 const border=frame?Math.max(6,6*zoom):0;
 const output=document.createElement('canvas');
 output.width=canvas.width*zoom+2*border;
 output.height=canvas.height*zoom+2*border;
 const ctx=output.getContext('2d');
 if(!ctx)throw Error('Canvas export unsupported');
 if(frame){
  ctx.fillStyle='#151719';ctx.fillRect(0,0,output.width,output.height);
  const lip=Math.max(1,Math.round(zoom));
  ctx.fillStyle='#696d67';ctx.fillRect(border-lip,border-lip,
   canvas.width*zoom+2*lip,canvas.height*zoom+2*lip);
 }
 ctx.imageSmoothingEnabled=false;
 ctx.drawImage(canvas,border,border,canvas.width*zoom,canvas.height*zoom);
 return output;
}
function captureConfig(options){
 const zoom=Number(options?.zoom);
 return {zoom:Number.isInteger(zoom)&&zoom>=1&&zoom<=6?zoom:1,
  frame:options?.frame!==false};
}
const api=Object.freeze({labels:LABELS,labelFor,formattedEntries,selectionIndices,
 trace,createImage,captureConfig});
global.FreshTeachingTools=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
