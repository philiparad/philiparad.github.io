import {el,btn} from './ui.js?v=20261120-perf012';
import {toolIcon} from './tool-icons.js?v=20261120-perf012';
import {CALCULATOR_ANS_PROTOCOL,validateAnsResponse} from './calculator-answer.js?v=20261120-perf012';
import {clampFloatingWindowPosition,initialFloatingWindowPosition,readCalculatorWindowPosition,storeCalculatorWindowPosition,restoreCalculatorWindowPosition,windowPositionRatios,clearCalculatorWindowPosition} from './calculator-window-position.js?v=20261120-perf012';

export const CALCULATOR_URL='https://philiparad.github.io/calculator/';
const CALCULATOR_ORIGIN=new URL(CALCULATOR_URL).origin;
let nextDialogId=0;

/**
 * A calculator tool, independent of whiteboard state.
 * The child calculator never receives a reference to board objects. It only
 * answers an explicit, one-time request for its displayed Ans. Both origin
 * and iframe contentWindow must match before the board accepts a response.
 */
export class CalculatorModal {
 constructor(onAnswer=()=>false){
  this.onAnswer=onAnswer;
  this.disposed=false;
  this.loaded=false;
  this.pending=null;
  this.position=null;
  this.positionPreference=readCalculatorWindowPosition(this.positionStorage());
  this.drag=null;
  this.dialog=el('dialog',null,'board-calculator-dialog');
  this.dialog.id='board-calculator-dialog-'+(++nextDialogId);
  this.dialog.setAttribute('aria-label','CASIO calculator');
  const heading=el('div',null,'board-calculator-heading');
  this.heading=heading;
  heading.tabIndex=0;
  heading.setAttribute('role','group');
  heading.setAttribute('aria-label','Move calculator window: drag here or use arrow keys');
  heading.title='Drag to move calculator. Arrow keys move while the header is focused.';
  heading.addEventListener('pointerdown',event=>this.beginDrag(event));
  heading.addEventListener('pointermove',event=>this.moveDrag(event));
  heading.addEventListener('pointerup',event=>this.endDrag(event));
  heading.addEventListener('pointercancel',event=>this.endDrag(event));
  heading.addEventListener('lostpointercapture',event=>this.endDrag(event));
  heading.addEventListener('keydown',event=>this.moveWithKeyboard(event));
  const title=el('h2','CASIO calculator');
  const actions=el('div',null,'board-calculator-actions');
  this.sendButton=el('button','Send Ans to Board','board-calculator-send');
  this.sendButton.type='button';
  this.sendButton.disabled=true;
  this.sendButton.title='Place the displayed Ans as editable text in the center of the board';
  this.sendButton.onclick=()=>this.sendAns();
  this.resetButton=el('button','↺','board-calculator-reset-position');
  this.resetButton.type='button';
  this.resetButton.title='Reset calculator position';
  this.resetButton.setAttribute('aria-label','Reset calculator position');
  this.resetButton.onclick=()=>this.resetWindowPosition();
  this.closeButton=btn('×',()=>this.close(),'board-calculator-close');
  this.closeButton.title='Close calculator';
  this.closeButton.setAttribute('aria-label','Close calculator');
  actions.append(this.sendButton,this.resetButton,this.closeButton);
  heading.append(title,actions);
  this.status=el('p',null,'board-calculator-send-status');
  this.status.setAttribute('role','status');
  this.status.setAttribute('aria-live','polite');
  this.status.hidden=true;
  this.frame=el('iframe',null,'board-calculator-frame');
  this.frame.title='CASIO fx-991ES PLUS calculator';
  this.frame.setAttribute('referrerpolicy','no-referrer');
  this.frame.setAttribute('loading','eager');
  this.frame.addEventListener('load',()=>{
   if(this.dialog.open&&!this.disposed&&
      this.frame.getAttribute('src')===CALCULATOR_URL){
    this.loaded=true;
    this.sendButton.disabled=!!this.pending;
   }
  });
  this.dialog.append(heading,this.status,this.frame);
  this.button=btn('',()=>this.toggle(),'tool calculator-toggle');
  this.button.replaceChildren(toolIcon('calculator'));
  this.button.title='Open calculator';
  this.button.setAttribute('aria-label','Open calculator');
  this.button.setAttribute('aria-haspopup','dialog');
  this.button.setAttribute('aria-controls',this.dialog.id);
  this.button.setAttribute('aria-expanded','false');
  this.responseHandler=event=>this.receiveAnswer(event);
  this.resizeHandler=()=>{if(this.dialog.open)this.positionWindow(true);};
  window.addEventListener('message',this.responseHandler);
  window.addEventListener('resize',this.resizeHandler);
  this.dialog.addEventListener('keydown',event=>{
   if(event.key==='Escape'&&!event.defaultPrevented){
    event.preventDefault();
    event.stopPropagation();
    this.close();
   }
  });
  this.dialog.addEventListener('close',()=>{
   this.endDrag();
   this.cancelRequest();
   this.loaded=false;
   this.sendButton.disabled=true;
   this.status.hidden=true;
   this.status.textContent='';
   this.frame.removeAttribute('src');
   this.button.setAttribute('aria-expanded','false');
   this.button.setAttribute('aria-label','Open calculator');
   this.button.title='Open calculator';
   if(!this.disposed&&this.button.isConnected)this.button.focus();
  });
  document.body.append(this.dialog);
 }
 report(message,success=false){
  this.status.textContent=message;
  this.status.dataset.state=success?'success':'error';
  this.status.hidden=false;
  this.sendButton.disabled=!this.loaded||!!this.pending;
 }
 positionStorage(){
  try{return window.localStorage;}catch{return null;}
 }
 /** Persist only after actual movement; opening at default does not write. */
 saveWindowPosition(){
  if(!this.dialog.open||!this.position)return;
  const rect=this.dialog.getBoundingClientRect();
  this.positionPreference=windowPositionRatios(this.position,
   rect.width,rect.height,window.innerWidth,window.innerHeight);
  storeCalculatorWindowPosition(this.positionStorage(),this.position,
   rect.width,rect.height,window.innerWidth,window.innerHeight);
 }
 /** Return the floating window to its original screen location without
  * closing, reloading, or changing the calculator's active expression.
  * Missing/blocked localStorage must not make the control unusable. */
 resetWindowPosition(){
  if(this.disposed||!this.dialog.open)return false;
  this.positionPreference=null;
  this.position=null;
  clearCalculatorWindowPosition(this.positionStorage());
  this.positionWindow(true);
  return true;
 }
 positionWindow(usePreference=false){
  if(!this.dialog.open)return;
  const rect=this.dialog.getBoundingClientRect();
  const w=window.innerWidth,h=window.innerHeight;
  const wanted=(usePreference||!this.position)
   ?(this.positionPreference
     ?restoreCalculatorWindowPosition(this.positionPreference,rect.width,rect.height,w,h)
     :initialFloatingWindowPosition(rect.width,rect.height,w,h))
   :this.position;
  this.position=clampFloatingWindowPosition(wanted.x,wanted.y,
   rect.width,rect.height,w,h);
  this.dialog.style.left=this.position.x+'px';
  this.dialog.style.top=this.position.y+'px';
 }
 beginDrag(event){
  if(!this.dialog.open||this.disposed||event.button!==0||
     event.isPrimary===false||event.target.closest?.('button'))return;
  const rect=this.dialog.getBoundingClientRect();
  this.drag={pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,
   left:rect.left,top:rect.top,moved:false};
  this.heading.setPointerCapture?.(event.pointerId);
  event.preventDefault();
 }
 moveDrag(event){
  if(!this.drag||this.drag.pointerId!==event.pointerId)return;
  const rect=this.dialog.getBoundingClientRect();
  if(Math.abs(event.clientX-this.drag.startX)+Math.abs(event.clientY-this.drag.startY)>1)
   this.drag.moved=true;
  this.position=clampFloatingWindowPosition(
   this.drag.left+event.clientX-this.drag.startX,
   this.drag.top+event.clientY-this.drag.startY,
   rect.width,rect.height,window.innerWidth,window.innerHeight);
  this.positionWindow();
  event.preventDefault();
 }
 endDrag(event){
  if(!this.drag||(event&&this.drag.pointerId!==event.pointerId))return;
  const {pointerId:id,moved}=this.drag;
  this.drag=null;
  if(moved)this.saveWindowPosition();
  if(this.heading.hasPointerCapture?.(id))this.heading.releasePointerCapture(id);
 }
 moveWithKeyboard(event){
  if(event.target!==this.heading||!this.dialog.open||
     !['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
  const step=event.shiftKey?40:10;
  const rect=this.dialog.getBoundingClientRect();
  const deltaX=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0;
  const deltaY=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;
  this.position=clampFloatingWindowPosition(rect.left+deltaX,rect.top+deltaY,
   rect.width,rect.height,window.innerWidth,window.innerHeight);
  this.positionWindow();
  this.saveWindowPosition();
  event.preventDefault();
  event.stopPropagation();
 }
 cancelRequest(){
  if(this.pending)clearTimeout(this.pending.timeout);
  this.pending=null;
 }
 sendAns(){
  if(this.disposed||!this.dialog.open||!this.loaded||this.pending||
     !this.frame.contentWindow)return false;
  this.status.hidden=true;
  this.status.textContent='';
  const id=crypto.randomUUID();
  const pending={id,timeout:null};
  this.pending=pending;
  this.sendButton.disabled=true;
  pending.timeout=setTimeout(()=>{
   if(this.pending!==pending)return;
   this.cancelRequest();
   if(this.dialog.open)this.report('The calculator did not respond. Try again.');
  },5000);
  try{
   this.frame.contentWindow.postMessage({
    protocol:CALCULATOR_ANS_PROTOCOL,type:'request',id
   },CALCULATOR_ORIGIN);
  }catch(e){
   this.cancelRequest();
   this.report('Unable to communicate with the calculator.');
   return false;
  }
  return true;
 }
 receiveAnswer(event){
  const pending=this.pending;
  if(this.disposed||!this.dialog.open||!pending||
     event.origin!==CALCULATOR_ORIGIN||
     event.source!==this.frame.contentWindow)return;
  const answer=validateAnsResponse(event.data,pending.id);
  if(!answer)return;
  this.cancelRequest();
  if(answer.error){this.report(answer.error);return;}
  try{
   if(this.onAnswer(answer.text)!==true)
    throw Error('The result could not be placed on the board.');
   this.report('Ans sent to the board.',true);
  }catch(error){this.report(error.message||'Unable to add Ans to the board.');}
 }
 open(){
  if(this.disposed||this.dialog.open)return false;
  this.loaded=false;
  this.sendButton.disabled=true;
  this.frame.src=CALCULATOR_URL;
  try{this.dialog.show();this.positionWindow(true);}
  catch(e){this.frame.removeAttribute('src');throw e;}
  this.button.setAttribute('aria-expanded','true');
  this.button.setAttribute('aria-label','Close calculator');
  this.button.title='Close calculator';
  this.closeButton.focus();
  return true;
 }
 close(){
  if(!this.dialog.open)return false;
  this.cancelRequest();
  this.endDrag();
  this.dialog.close();
  return true;
 }
 toggle(){return this.dialog.open?this.close():this.open();}
 dispose(){
  if(this.disposed)return;
  this.disposed=true;
  this.cancelRequest();
  window.removeEventListener('message',this.responseHandler);
  window.removeEventListener('resize',this.resizeHandler);
  this.endDrag();
  if(this.dialog.open)this.dialog.close();
  this.frame.removeAttribute('src');
  this.dialog.remove();
 }
}
