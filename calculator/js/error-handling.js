/* REA-024: calculator error categories and editable error recovery. */
(function(global){'use strict';
const LABELS=Object.freeze([
 'Math ERROR','Stack ERROR','Syntax ERROR','Argument ERROR',
 'Dimension ERROR','Variable ERROR',"Can't Solve",'Insufficient MEM','Time Out'
]);
function classify(message,mode='COMP'){
 const original=String(message||'');
 if(/can't solve|cannot solve/i.test(original))return "Can't Solve";
 if(/insufficient mem/i.test(original))return 'Insufficient MEM';
 if(/time out|timeout/i.test(original))return 'Time Out';
 if(/dimension error/i.test(original))return 'Dimension ERROR';
 if(/stack error|maximum call stack/i.test(original))return 'Stack ERROR';
 if(/argument error/i.test(original))return 'Argument ERROR';
 if(/variable error/i.test(original))return mode==='SOLVE'?'Variable ERROR':'Syntax ERROR';
 if(/syntax error|missing|unexpected|invalid editor/i.test(original))return 'Syntax ERROR';
 if(/math error|rangeerror|division by zero|input limit/i.test(original))return 'Math ERROR';
 return 'Math ERROR';
}
function location(source,message){
 const s=String(source||''),text=String(message||'');
 // Match known illegal operations; pointing near them is a best-effort
 // editor hint, NOT a native device cursor reference.
 const div=/\/\s*\(?\s*[+-]?0+(?:\.0*)?(?=\s*(?:\)|[+\-*/^]|$))/g;
 let match=div.exec(s);
 if(/math error/i.test(text)&&match)return Math.min(s.length,match.index+1);
 const sqrt=/\b(?:sqrt|log|ln|asin|acos|acosh|atanh)\s*\(/.exec(s);
 if(/math error/i.test(text)&&sqrt)return sqrt.index;
 const invalid=/\d\.\./.exec(s);
 if(invalid)return invalid.index+2;
 if(/variable error/i.test(text)){
  match=/[A-Za-z_][A-Za-z_0-9]*/g.exec(s);
  if(match)return match.index;
 }
 if(/syntax error|missing/i.test(text)){
  const stack=[];
  for(let i=0;i<s.length;i++){
   if(s[i]==='(')stack.push(i);
   if(s[i]===')'){if(!stack.length)return i;stack.pop()}
  }
  if(stack.length)return stack[stack.length-1];
  const end=/[+\-*/^(,]\s*$/.exec(s);if(end)return s.length;
 }
 return s.length;
}
function checkStack(source,maxDepth=40){
 let level=0,peak=0;
 for(const ch of String(source||'')){
  if(ch==='('){level++;peak=Math.max(peak,level)}
  if(ch===')')level=Math.max(0,level-1);
 }
 if(peak>maxDepth)throw new Error('Stack ERROR');
}
const api=Object.freeze({classify,location,checkStack,LABELS});
global.FreshErrors=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
