/**
 * Insert a calculator Ans display as an ordinary editable Teaching Board
 * text object. Keep the calculator's selected representation (fraction,
 * decimal, scientific notation, etc.) verbatim; do not re-round the value.
 */
export const CALCULATOR_ANS_PROTOCOL='teaching-board/calculator-ans-v1';
export const CALCULATOR_ANS_MAX_LENGTH=160;

export function validAnsDisplay(value){
 if(typeof value!=='string'||!value.trim()||
    value.length>CALCULATOR_ANS_MAX_LENGTH||
    /[\u0000-\u001f\u007f\ufffc]/u.test(value))return null;
 return value.trim();
}
export function calculatorTextItem(base,display,fontSize=28){
 const text=validAnsDisplay(display);
 if(!text)throw Error('The calculator has no valid Ans to insert.');
 if(!base||base.type!=='text'||!Number.isFinite(base.x)||
    !Number.isFinite(base.y)||!Number.isFinite(fontSize)||
    fontSize<1||fontSize>100000)throw Error('Invalid calculator text placement.');
 // Fit short answers tightly, while keeping longer formatted answers legible.
 const w=Math.min(680,Math.max(200,Math.ceil(text.length*fontSize*.66+32)));
 const h=Math.max(70,Math.ceil(fontSize*2.5));
 return {...base,w,h,fontSize,fill:'none',textAlign:'left',
  textStyle:'normal',text,runs:[{text}],
  paragraphs:[{align:'left',dir:'ltr',list:'none'}]};
}
export function validateAnsResponse(data,id){
 if(!data||typeof data!=='object'||Array.isArray(data)||
    data.protocol!==CALCULATOR_ANS_PROTOCOL||data.type!=='response'||
    data.id!==id)return null;
 if(data.error!==undefined){
  if(data.error==='no-answer')return {error:'Calculate a result before sending Ans.'};
  return null;
 }
 const text=validAnsDisplay(data.display);
 return text?{text}:null;
}
