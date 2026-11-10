/* REA-077: native-style CALC substitution session (independent web model).
 * Detect all source variables, keep prompts in first-reference order, validate
 * all substitutions before committing register memory, and retain expression
 * for repeat CALC/= runs. No CASIO ROM, eval, or host side effects.
 */
(function(global){'use strict';
const KNOWN=Object.freeze([
 'RanInt','PreAns','Ran','Ans','Conjg','conj','arg','sqrt','cbrt',
 'nthroot','abs','sin','cos','tan','asin','acos','atan','sinh','cosh',
 'tanh','asinh','acosh','atanh','log','ln','exp','floor','ceil',
 'round','rnd','intg','int','gcd','lcm','min','max','sign','pol',
 'rec','Prod','Sum','RPT','pi','nPr','nCr','i','e'
].sort((a,b)=>b.length-a.length));
const WORD=new RegExp('^(?:'+KNOWN.filter(x=>x.length>1).map(x=>x.replace(/[.*+?^$\u007b\u007d()|[\]\\]/g,'\\$&')).join('|')+')','i');
function scan(source,available){
 const allowed=new Set(available);
 const all=new Set(['A','B','C','D','E','F','X','Y','M']);
 const text=String(source).replace(/π/g,'pi');
 const found=[],seen=new Set();
 let i=0;
 while(i<text.length){
  const c=text[i];
  if(/[0-9]/.test(c)){
   const match=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+\-]?\d+)?/.exec(text.slice(i));
   if(match){i+=match[0].length;continue}
  }
  if(/[A-Za-z]/.test(c)){
   const word=WORD.exec(text.slice(i));
   if(word){i+=word[0].length;continue}
   if(c==='i'||c==='e'){i++;continue}
   if(all.has(c)){
    if(!allowed.has(c))throw Error('Variable ERROR: '+c);
    if(!seen.has(c)){seen.add(c);found.push(c)}
    i++;continue;
   }
   throw Error('Variable ERROR: '+c);
  }
  i++;
 }
 return found;
}
function statementParts(source){
 const text=String(source);
 let depth=0,start=0,items=[];
 for(let i=0;i<text.length;i++){
  if(text[i]==='(')depth++;
  else if(text[i]===')')depth--;
  else if(text[i]===':'&&depth===0){
   items.push(text.slice(start,i).trim());start=i+1;
  }
  if(depth<0)throw Error('Syntax ERROR');
 }
 if(depth)throw Error('Syntax ERROR');
 items.push(text.slice(start).trim());
 if(items.some(s=>!s))throw Error('Syntax ERROR');
 return items;
}
function equality(segment){
 let depth=0,at=-1;
 for(let i=0;i<segment.length;i++){
  const c=segment[i];if(c==='(')depth++;else if(c===')')depth--;
  if(c==='='&&depth===0){if(at!==-1)throw Error('Syntax ERROR');at=i}
 }
 if(at===-1)return {expression:segment,target:null};
 const left=segment.slice(0,at).trim(),right=segment.slice(at+1).trim();
 if(!/^[A-FMXY]$/.test(left)||!right)throw Error('Syntax ERROR');
 return {expression:right,target:left};
}
function prepare(source,modelRegisters,mode='COMP',current={}){
 if(!['COMP','CMPLX'].includes(mode))throw Error('Argument ERROR');
 const parts=statementParts(source),segments=parts.map(equality);
 const allowed=new Set(modelRegisters);
 // An equality label uses a physical register too; unsupported E/F on
 // the original fx-991ES must never slip through as a free output name.
 for(const item of segments)if(item.target&&!allowed.has(item.target))
  throw Error('Variable ERROR: '+item.target);
 const output=String(source);
 if(!output.trim())throw Error('Syntax ERROR');
 const names=scan(segments.map(x=>mode==='CMPLX'?
  x.expression.replace(/(?:►|▶|→)\s*(?:r∠θ|a\+bi)\s*$/i,''):x.expression).join(':'),modelRegisters);
 // For Y=X^2+3, Y is the output label and must not be prompted for.
 const fields=names.map(name=>({id:name,label:name+'?',value:String(current[name]??0)}));
 return {source:output,segments,names,fields,mode};
}
function normalize(source){
 // Adjacent variable letters denote multiplication on the CASIO keypad:
 // 2AX = 2*A*X, and in CMPLX the imaginary unit can follow B (Bi).
 return String(source)
  .replace(/([A-FMXY]{2,})(?![A-Za-z])/g,word=>word.split('').join('*'))
  .replace(/([A-FMXY])i(?![A-Za-z])/g,'$1*i');
}
function evaluate(session,inputs,context){
 const memory={...context.memory};
 const complexMemory={...context.complexMemory};
 const changes={};
 // Compute all prompt values before any output evaluation. Invalid entries
 // leave the real state untouched so users can correct a specific field.
 for(const name of session.names){
  if(!Object.prototype.hasOwnProperty.call(inputs,name))throw Error('Variable ERROR: '+name);
  const raw=String(inputs[name]).trim();
  if(!raw)throw Error('Syntax ERROR');
  const current={...memory,...complexMemory};
  const v=session.mode==='CMPLX'?
   context.complex.evaluate(normalize(raw),{
    angle:context.angle,memory:current,ans:context.complexAns,
    preAns:context.preComplexAns||0,model:context.model
   }):
   context.math.evaluate(raw,{...context,ans:context.ans,preAns:context.preAns,memory});
  if(session.mode==='COMP'&&(!Number.isFinite(v)||Math.abs(v)>9.999999999e99))throw Error('Math ERROR');
  changes[name]=v;memory[name]=session.mode==='CMPLX'?v.re:v;
  if(session.mode==='CMPLX')complexMemory[name]=v;
 }
 let result=null;
 const output=[];
 let answer=context.ans;
 let complexAnswer=context.complexAns;
 let formatOverride=null;
 const statementResults=[];
 for(const segment of session.segments){
  if(session.mode==='CMPLX'){
   const parsed=context.complex.splitDisplayCommand(normalize(segment.expression));
   result=context.complex.evaluate(parsed.expression,{
    angle:context.angle,memory:{...memory,...complexMemory},ans:complexAnswer,
    preAns:context.preComplexAns||0,model:context.model
   });
   complexAnswer=result;
   formatOverride=parsed.format||formatOverride;
   const shown=context.complex.format(result,context.angle,formatOverride||context.complexFormat);
   output.push(shown);
   statementResults.push({target:segment.target,text:shown,value:result});
  }else{
   result=context.math.evaluate(normalize(segment.expression),{
    ...context,ans:answer,preAns:context.preAns,memory
   });
   if(!Number.isFinite(result)||Math.abs(result)>9.999999999e99)throw Error('Math ERROR');
   answer=result;
   output.push(String(result));
   statementResults.push({target:segment.target,text:String(result),value:result});
  }
 }
 return {kind:'calc-substitution',value:result,changes,output,
  source:session.source,mode:session.mode,formatOverride,statementResults};
}
const api=Object.freeze({scan,statementParts,equality,normalize,prepare,evaluate});
global.FreshCalcSubstitution=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
