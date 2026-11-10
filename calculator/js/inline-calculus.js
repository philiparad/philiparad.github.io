/* REA-080: parse complete inline differential/integral/summation expressions.
 * Only the source AST supplies required fields; no modal re-entry, eval,
 * remote dependencies or silent calculation of an incomplete placeholder.
 */
(function(global){'use strict';
const FORMS=Object.freeze({
 Diff:Object.freeze({kind:'DERIVATIVE',fields:['expression','at'],tol:'1E-10'}),
 Integral:Object.freeze({kind:'INTEGRAL',fields:['expression','lower','upper'],tol:'1E-5'}),
 Sum:Object.freeze({kind:'SUM',fields:['expression','lower','upper']})
});
function split(text){
 let depth=0,start=0,parts=[];
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='(')depth++;
  else if(c===')'){depth--;if(depth<0)throw Error('Syntax ERROR')}
  else if(c===','&&depth===0){parts.push(text.slice(start,i).trim());start=i+1}
 }
 if(depth!==0)throw Error('Syntax ERROR');
 parts.push(text.slice(start).trim());
 if(parts.some(part=>!part||part.includes('?')))throw Error('Syntax ERROR');
 return parts;
}
function parse(source){
 const text=String(source??'').trim();
 const match=/^(Diff|Integral|Sum)\s*\(/.exec(text);
 if(!match)return null;
 const type=match[1],start=match[0].length,form=FORMS[type];
 let depth=1,end=-1;
 for(let i=start;i<text.length;i++){
  if(text[i]==='(')depth++;
  else if(text[i]===')'&&--depth===0){end=i;break}
 }
 if(end<0||end!==text.length-1)throw Error('Syntax ERROR');
 const parts=split(text.slice(start,end));
 const extraTolerance=!!form.tol&&parts.length===form.fields.length+1;
 if(parts.length!==form.fields.length&&!extraTolerance)throw Error('Syntax ERROR');
 const data={expression:parts[0]};
 if(type==='Diff')data.at=parts[1];
 else{data.a=parts[1];data.b=parts[2]}
 if(form.tol)data.tol=extraTolerance?parts[parts.length-1]:form.tol;
 return {kind:form.kind,type,source:text,data,fields:parts};
}
const api=Object.freeze({parse,split,forms:FORMS});
global.FreshInlineCalculus=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
