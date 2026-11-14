import {el,btn} from './ui.js?v=20261017-history-budget';
import {toolIcon} from './tool-icons.js?v=20261017-history-budget';

export const CALCULATOR_URL='https://philiparad.github.io/calculator/?key=calculator';
let nextDialogId=0;

/**
 * A calculator tool, independent of whiteboard state.
 * Loading starts only when the user opens the dialog, and the iframe
 * is unloaded when it closes so it cannot keep working in the background.
 */
export class CalculatorModal {
 constructor(){
  this.disposed=false;
  this.dialog=el('dialog',null,'board-calculator-dialog');
  this.dialog.id='board-calculator-dialog-'+(++nextDialogId);
  this.dialog.setAttribute('aria-label','CASIO calculator');
  const heading=el('div',null,'board-calculator-heading');
  const title=el('h2','CASIO calculator');
  this.closeButton=btn('×',()=>this.close(),'board-calculator-close');
  this.closeButton.title='Close calculator';
  this.closeButton.setAttribute('aria-label','Close calculator');
  heading.append(title,this.closeButton);
  this.frame=el('iframe',null,'board-calculator-frame');
  this.frame.title='CASIO fx-991ES PLUS calculator';
  this.frame.setAttribute('referrerpolicy','no-referrer');
  this.frame.setAttribute('loading','eager');
  this.dialog.append(heading,this.frame);
  this.button=btn('',()=>this.toggle(),'tool calculator-toggle');
  this.button.replaceChildren(toolIcon('calculator'));
  this.button.title='Open calculator';
  this.button.setAttribute('aria-label','Open calculator');
  this.button.setAttribute('aria-haspopup','dialog');
  this.button.setAttribute('aria-controls',this.dialog.id);
  this.button.setAttribute('aria-expanded','false');
  this.dialog.addEventListener('close',()=>{
   this.frame.removeAttribute('src');
   this.button.setAttribute('aria-expanded','false');
   this.button.setAttribute('aria-label','Open calculator');
   this.button.title='Open calculator';
   if(!this.disposed&&this.button.isConnected)this.button.focus();
  });
  document.body.append(this.dialog);
 }
 open(){
  if(this.disposed||this.dialog.open)return false;
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
  this.dialog.close();
  return true;
 }
 toggle(){
  return this.dialog.open?this.close():this.open();
 }
 dispose(){
  if(this.disposed)return;
  this.disposed=true;
  if(this.dialog.open)this.dialog.close();
  this.frame.removeAttribute('src');
  this.dialog.remove();
 }
}
