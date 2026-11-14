/* PLUS-052..056: independent simulator presentation tools; no math-engine changes. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const main=$('face'), actions=document.querySelector('.face-actions');
if(!main||!actions)return;
const btn=(id,label)=>{const b=document.createElement('button');b.type='button';b.id=id;b.className='tool-button';b.textContent=label;actions.appendChild(b);return b;};
const notice=message=>{const node=$('notice');if(node)node.textContent=message;};
const popupButton=btn('popout-lcd','▣ Pop-up LCD');
const fitButton=btn('fit-face','⛶ Fit calculator');
const normalButton=btn('normal-face','↔ Normal size');
const graphicButton=btn('export-graphic-keys','↓ KeyLog PNG');
const copyGraphicButton=btn('copy-graphic-keys','▢ Copy KeyLog image');
const idButton=btn('calculator-id','ID / QR');
const helpButton=btn('calculator-help','? Help');
let lcdWindow=null,frameTimer=0,fit=false,modal=null;
function clearPopup(){
 if(frameTimer){clearInterval(frameTimer);frameTimer=0;}
 lcdWindow=null;
}
function paintPopup(){
 try{
  if(!lcdWindow||lcdWindow.closed){clearPopup();return;}
  const source=$('lcd'),dest=lcdWindow.document.getElementById('remote-lcd');
  if(!dest||!source)return;
  if(dest.width!==source.width)dest.width=source.width;
  if(dest.height!==source.height)dest.height=source.height;
  const ctx=dest.getContext('2d');
  if(ctx){ctx.imageSmoothingEnabled=false;ctx.clearRect(0,0,dest.width,dest.height);ctx.drawImage(source,0,0);}
  dest.setAttribute('aria-label',source.getAttribute('aria-label')||'LCD display');
 }catch(e){clearPopup();}
}
function openPopup(){
 if(lcdWindow&&!lcdWindow.closed){lcdWindow.focus();paintPopup();return;}
 const w=window.open('','calculator-lcd','width=760,height=330,resizable=yes,scrollbars=yes');
 if(!w){$('lcd-panel').hidden=false;notice('Pop-ups blocked. Enlarged LCD shown on this page.');return;}
 lcdWindow=w;
 w.document.open();
 w.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Calculator LCD</title><style>body{margin:0;background:#25313a;color:#f2f5f6;font:16px Arial;padding:16px}canvas{width:100%;height:auto;image-rendering:pixelated;background:#d9e5d7;display:block}main{max-width:900px;margin:auto}p{font-size:13px}button{font:inherit}</style></head><body><main><h1>Calculator LCD — view only</h1><canvas id="remote-lcd" width="960" height="310" role="img"></canvas><p>Resize this window or use browser zoom to enlarge the display. Calculations remain in the original window.</p><button id="close-lcd" onclick="window.close()">Close LCD</button></main></body></html>');
 w.document.close();
 paintPopup();frameTimer=setInterval(paintPopup,100);
}
popupButton.addEventListener('click',openPopup);
function fitFace(){
 fit=true;const available=Math.max(190,window.innerHeight-180);
 const width=Math.min(470,Math.floor(available*274/580),Math.max(190,window.innerWidth-34));
 main.style.width=width+'px';main.style.maxWidth='none';
 fitButton.setAttribute('aria-pressed','true');
 normalButton.setAttribute('aria-pressed','false');
}
function normalFace(){
 fit=false;main.style.removeProperty('width');main.style.removeProperty('max-width');
 fitButton.setAttribute('aria-pressed','false');
 normalButton.setAttribute('aria-pressed','true');
}
fitButton.addEventListener('click',fitFace);
normalButton.addEventListener('click',normalFace);
window.addEventListener('resize',()=>{if(fit)fitFace()});
normalFace();
function entries(){
 const calc=window.FreshCalculator;
 const state=calc?.getState?.();
 const all=state?.keylog||[];
 const nodes=Array.from(document.querySelectorAll('#keylog-list .keylog-entry'));
 let chosen=nodes.filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>Number(b.dataset.index));
 if(!nodes.length||!chosen.length)chosen=all.map((_,i)=>i);
 return window.FreshTeachingTools.formattedEntries(all).filter(x=>chosen.includes(x.index));
}
function renderGraphic(){
 const rows=entries();
 if(!rows.length)throw Error('No recorded keys. Start recording and use the calculator first.');
 const size=42,gap=9,pad=16,cols=10;
 const width=pad*2+cols*(size+gap)-gap;
 const height=pad*2+Math.ceil(rows.length/cols)*(size+gap)-gap;
 if(height>16384)throw Error('KeyLog too long for one image; select fewer keys.');
 const canvas=document.createElement('canvas'),ratio=2;
 canvas.width=width*ratio;canvas.height=height*ratio;
 const c=canvas.getContext('2d');if(!c)throw Error('Canvas unavailable');
 c.scale(ratio,ratio);c.fillStyle='#ffffff';c.fillRect(0,0,width,height);
 c.font='bold 14px Arial';c.textAlign='center';c.textBaseline='middle';
 rows.forEach((entry,i)=>{
  const x=pad+(i%cols)*(size+gap),y=pad+Math.floor(i/cols)*(size+gap);
  c.fillStyle=entry.key==='SHIFT'?'#e9d98f':entry.key==='ALPHA'?'#eab6d6':'#e8ebef';
  c.fillRect(x+2,y+3,size,size);
  c.strokeStyle='#627282';c.lineWidth=1.5;c.strokeRect(x+2,y+3,size,size);
  c.fillStyle='#152434';
  const label=entry.display;
  c.font='bold '+(label.length>7?9:label.length>4?11:14)+'px Arial';
  c.fillText(label,x+size/2+2,y+size/2+3,size-5);
 });
 return canvas;
}
function downloadCanvas(canvas){
 const a=document.createElement('a');a.download='calculator-keylog.png';a.href=canvas.toDataURL('image/png');
 document.body.appendChild(a);a.click();a.remove();
}
graphicButton.addEventListener('click',()=>{try{downloadCanvas(renderGraphic());notice('KeyLog PNG downloaded.')}catch(e){notice(e.message)}});
copyGraphicButton.addEventListener('click',async()=>{
 try{
  const c=renderGraphic();
  if(!navigator.clipboard?.write||!window.ClipboardItem){downloadCanvas(c);notice('Image clipboard unavailable; PNG downloaded instead.');return;}
  const blob=await new Promise(resolve=>c.toBlob(resolve,'image/png'));
  if(!blob)throw Error('Could not encode PNG');
  await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);
  notice('KeyLog image copied.');
 }catch(e){notice('Image copy unavailable: '+e.message);}
});
function showDialog(title,body,onClose){
 closeDialog(false);
 const back=document.createElement('div');back.className='sim-dialog-backdrop';back.id='sim-dialog-backdrop';
 const card=document.createElement('section');card.className='sim-dialog';card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-label',title);
 const h=document.createElement('h2');h.textContent=title;
 const close=document.createElement('button');close.type='button';close.textContent='Close';close.className='tool-button';
 card.append(h,body,close);back.appendChild(card);document.body.appendChild(back);
 modal={back,onClose,previous:document.activeElement};
 close.addEventListener('click',()=>closeDialog(true));
 back.addEventListener('click',e=>{if(e.target===back)closeDialog(true)});
 close.focus();
}
function closeDialog(call){
 if(!modal)return;
 const old=modal;modal=null;old.back.remove();
 if(call&&old.onClose)old.onClose();
 if(old.previous?.focus)old.previous.focus();
}
document.addEventListener('keydown',e=>{
 if(!modal)return;
 if(e.key==='Escape'){
  e.preventDefault();e.stopImmediatePropagation();closeDialog(true);return;
 }
 if(e.key==='Tab'){
  const list=Array.from(modal.back.querySelectorAll('a,button')).filter(x=>!x.disabled);
  const first=list[0],last=list[list.length-1];
  if(!first)return;
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }
},true);
const dummyId='EDU991ESPLUS2026DEMO000001';
function idView(){
 const wrap=document.createElement('div');
 const p=document.createElement('p');p.textContent='Educational demonstration only. This is not a genuine CASIO device ID and does not establish authenticity.';
 const code=document.createElement('code');code.textContent=dummyId;
 const info=document.createElement('p');info.textContent='Official education site: ';
 const link=document.createElement('a');link.href='https://edu.casio.com/';link.target='_blank';link.rel='noopener noreferrer';link.textContent='edu.casio.com';
 info.appendChild(link);
 const qr=document.createElement('p');qr.textContent='The original emulator shows a sample QR code; this independent web edition provides the destination as an accessible direct link.';
 wrap.append(p,code,info,qr);
 showDialog('Calculator ID (demo)',wrap,()=>{if(window.FreshCalculator?.getState?.().screen==='menu')return;});
}
idButton.addEventListener('click',idView);
window.FreshEmulatorExtras=Object.freeze({openId:idView});
function helpView(){
 const wrap=document.createElement('div');
 const p=document.createElement('p');p.textContent='Independent fx-991ES PLUS (2nd edition) educational simulator. Not affiliated with or certified by CASIO. Calculator commands use the 50-key keypad. Pop-up, PNG export and KeyLog are web teaching tools, not hardware features.';
 wrap.appendChild(p);
 const links=[
 ['Official calculator manual','https://support.casio.com/global/en/calc/manual/fx-570ESPLUS_991ESPLUS_en/'],
 ['Source code and application information','https://github.com/philiparad/philiparad.github.io/tree/main/calculator'],
 ['Compatibility and known limitations','https://github.com/philiparad/philiparad.github.io/blob/main/calculator/README.md']
 ];
 const ul=document.createElement('ul');
 links.forEach(([label,url])=>{const li=document.createElement('li'),a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;li.appendChild(a);ul.appendChild(li);});
 wrap.appendChild(ul);
 const details=document.createElement('p');details.textContent='About: browser implementation, modular and generated standalone releases. Check the repository for license and revision information; CASIO Windows emulator licensing does not apply to this independently written UI.';
 wrap.appendChild(details);showDialog('Help / About',wrap);
}
helpButton.addEventListener('click',helpView);
window.FreshEmulatorExtras=Object.freeze({openId:idView,openHelp:helpView,openPopout:openPopup,renderKeylog:renderGraphic});
})();
