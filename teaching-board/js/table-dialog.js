import {el} from './ui.js?v=20261125-blank-signs';

export function numberInput(value, min, max) {
    const n=el('input');n.type='text';n.inputMode='numeric';n.value=String(value??'');
    n.dataset.min=min;n.dataset.max=max;return n;
}
export function wholeNumber(n,label) {
    const value=n.value.trim(), number=Number(value);
    if(!/^[0-9]+$/.test(value) || !Number.isSafeInteger(number) || number<+n.dataset.min || number>+n.dataset.max)
        throw Error(label+' must be a whole number from '+n.dataset.min+' to '+n.dataset.max+'.');
    return number;
}
export function choices(options,value) {
    const select=el('select');
    for(const [key,name] of options){const opt=el('option',name);opt.value=key;select.append(opt);}
    select.value=value;return select;
}
export const widthChoices=[['fixed','Fixed columns'],['contents','AutoFit to contents'],['viewport','AutoFit to page or viewport']];
export const directionChoices=[['auto','Automatic'],['ltr','Left to right'],['rtl','Right to left']];
export function labeled(text,input) {
    const label=el('label',text);label.append(input);return label;
}
export function tableDialog(title,submitLabel,onSubmit,onClose) {
    const dialog=el('dialog',null,'form-dialog table-dialog'),form=el('form'),body=el('div',null,'table-fields');
    const heading=el('h2',title);heading.id='table-dialog-'+crypto.randomUUID();dialog.setAttribute('aria-labelledby',heading.id);
    const error=el('p',null,'error');error.setAttribute('role','alert');
    const actions=el('div',null,'actions'),cancel=el('button','Cancel'),submit=el('button',submitLabel,'primary');
    cancel.type='button';cancel.onclick=()=>dialog.close();submit.type='submit';
    actions.append(cancel,submit);form.append(heading,body,error,actions);dialog.append(form);
    const run=fn=>{try{error.textContent='';fn();}catch(e){error.textContent=e.message;}};
    form.onsubmit=event=>{event.preventDefault();run(()=>{onSubmit();dialog.close('saved');});};
    dialog.onclose=()=>{dialog.remove();onClose?.(dialog.returnValue);};
    return {dialog,body,error,submit,run,open(focus){document.body.append(dialog);dialog.showModal();focus?.focus();}};
}
