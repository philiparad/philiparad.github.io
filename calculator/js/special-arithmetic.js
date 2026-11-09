/* REA-029: independent quotient/remainder, repeating decimal and statement helpers. */
(function(global){'use strict';
const NUM='(?:\\d+(?:\\.\\d*)?|\\.\\d+)';
const recurringPattern=new RegExp('('+NUM+')RPT\\((\\d{1,32})\\)','g');
function expandRecurring(expression){
 const input=String(expression);
 const expanded=input.replace(recurringPattern,(match,prefix,period)=>{
  if(!prefix.endsWith('.'))throw new SyntaxError('Syntax ERROR');
  if(period.length>14)return prefix+period; // CASIO treats an overlong period as terminating input.
  const body=prefix.slice(0,-1),cut=body.split('.');
  const whole=BigInt(cut[0]||'0');
  const nonRepeat=cut[1]||'',scale=10n**BigInt(nonRepeat.length),cyclic=10n**BigInt(period.length)-1n;
  const numerator=whole*scale*cyclic+BigInt(nonRepeat||'0')*cyclic+BigInt(period);
  const denominator=scale*cyclic;
  return '('+numerator.toString()+'/'+denominator.toString()+')';
 });
 if(/RPT\s*\(/.test(expanded))throw new SyntaxError('Syntax ERROR');
 return expanded;
}
function splitStatements(input){
 let level=0,parts=[],start=0;const text=String(input);
 for(let i=0;i<text.length;i++){
  if(text[i]==='(')level++;
  else if(text[i]===')')level--;
  else if(text[i]===':'&&level===0){parts.push(text.slice(start,i).trim());start=i+1}
 }
 parts.push(text.slice(start).trim());
 if(parts.some(s=>!s))throw new SyntaxError('Syntax ERROR');
 return parts;
}
function remainderExpression(input,ans=0){
 const source=String(input);
 const negative=new RegExp('^\\-('+NUM+')÷R('+NUM+')$').exec(source);
 if(negative){
  const divisor=Number(negative[2]);
  if(divisor===0)throw new RangeError('Math ERROR');
  return {expression:'(-'+negative[1]+'/'+negative[2]+')',remainder:null};
 }
 const pat=new RegExp('('+NUM+'|Ans)÷R('+NUM+'|Ans)','g');
 let hits=[],expanded=source.replace(pat,(match,a,b,index)=>{
  const x=a==='Ans'?ans:Number(a),y=b==='Ans'?ans:Number(b);
  if(y===0)throw new RangeError('Math ERROR');
  // Native manual: negatives or overly large operands use ordinary division.
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||Math.abs(x)>=1e10||Math.abs(y)>=1e10)
   return '('+x+'/'+y+')';
  const q=Math.floor(x/y);
  const r=Number((x-q*y).toPrecision(14));
  hits.push({index,quotient:q,remainder:r});
  return String(q);
 });
 if(expanded.includes('÷R'))throw new SyntaxError('Syntax ERROR');
 return {expression:expanded,remainder:hits.length===1&&patWhole(source)?hits[0]:null};
 function patWhole(s){return new RegExp('^('+NUM+'|Ans)÷R('+NUM+'|Ans)$').test(s)}
}
function recurringOf(fraction){
 if(!fraction||!/^-?\d+$/.test(String(fraction.numerator))||!/^\d+$/.test(String(fraction.denominator)))return null;
 const a=BigInt(fraction.numerator),d=BigInt(fraction.denominator);
 if(d===0n||d===1n)return null;
 const abs=a<0n?-a:a,whole=abs/d;let remainder=abs%d;
 const seen=new Map(),digits=[];let periodStart=-1;
 while(remainder!==0n&&digits.length<85){
  const id=remainder.toString();
  if(seen.has(id)){periodStart=seen.get(id);break}
  seen.set(id,digits.length);
  remainder*=10n;digits.push((remainder/d).toString());remainder%=d;
 }
 if(periodStart<0)return null;
 const lead=digits.slice(0,periodStart).join(''),period=digits.slice(periodStart).join('');
 if(period.length>14)return null;
 const initial=(a<0n?'-':'')+whole.toString()+'.'+lead;
 const text=initial+'('+period+')';
 if(initial.replace(/\D/g,'').length+period.length+4>99)return null;
 const mixedLength=whole.toString().length+String(abs%d).length+d.toString().length+2;
 if(mixedLength>10)return null;
 return {kind:'recurring',text,initial,period};
}
const api=Object.freeze({expandRecurring,splitStatements,remainderExpression,recurringOf});
global.FreshSpecial=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
