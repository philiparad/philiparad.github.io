import {el,btn} from './ui.js?v=20261017-history-budget';
import {toolIcon} from './tool-icons.js?v=20261114-calculator-modal';
import {CALCULATOR_ANS_PROTOCOL,validateAnsResponse} from './calculator-answer.js';

export const CALCULATOR_URL='https://philiparad.github.io/calculator/?key=calculator';
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
  this.dialog=el('dialog',null,'board-calculator-dialog');
  this.dialog.id='board-calculator-dialog-'+(++nextDialogId);
  this.dialog.setAttribute('aria-label','CASIO calculator');
  const heading=el('div',null,'board-calculator-heading');
  const title=el('h2','CASIO calculator');
  const actions=el('div',null,'board-calculator-actions');
  this.sendButton=el('button','Send Ans to Board','board-calculator-send');
  this.sendButton.type='button';
  this.sendButton.disabled=true;
  this.sendButton.title='Place the displayed Ans as editable text in the center of the board';
  this.sendButton.onclick=()=>this.sendAns();
  this.closeButton=btn('×',()=>this.close(),'board-calculator-close');
  this.closeButton.title='Close calculator';
  this.closeButton.setAttribute('aria-label','Close calculator');
  actions.append(this.sendButton,this.closeButton);
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
  window.addEventListener('message',this.responseHandler);
  this.dialog.addEventListener('close',()=>{
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
 report(message){
  this.status.textContent=message;
  this.status.hidden=false;
  this.sendButton.disabled=!this.loaded||!!this.pending;
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
   this.close();
  }catch(error){this.report(error.message||'Unable to add Ans to the board.');}
 }
 open(){
  if(this.disposed||this.dialog.open)return false;
  this.loaded=false;
  this.sendButton.disabled=true;
  this.frame.src=CALCULATOR_URL;
  try{this.dialog.showModal();}
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
  this.dialog.close();
  return true;
 }
 toggle(){return this.dialog.open?this.close():this.open();}
 dispose(){
  if(this.disposed)return;
  this.disposed=true;
  this.cancelRequest();
  window.removeEventListener('message',this.responseHandler);
  if(this.dialog.open)this.dialog.close();
  this.frame.removeAttribute('src');
  this.dialog.remove();
 }
}
