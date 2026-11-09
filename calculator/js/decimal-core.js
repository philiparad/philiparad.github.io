/* REA-021: independent decimal-based arithmetic, not manufacturer firmware. */
(function(global){'use strict';
const PRECISION=15;
const ten=n=>10n**BigInt(n);
const digits=n=>(n<0n?-n:n).toString().length;
function decimal(coefficient,scale){
 let n=BigInt(coefficient),s=scale;
 if(!n)return {n:0n,s:0};
 if(digits(n)>PRECISION){
  const excess=digits(n)-PRECISION, div=ten(excess),negative=n<0n;
  const abs=negative?-n:n;let q=abs/div;
  if((abs%div)*2n>=div)q++;
  n=negative?-q:q;s-=excess;
 }
 while(n%10n===0n){n/=10n;s--}
 return {n,s}
}
function parse(text){
 const m=/^(\d+(?:\.\d*)?|\.\d+)(?:[Ee]([+-]?\d+))?$/.exec(text);
 if(!m)throw new SyntaxError('Syntax ERROR');
 const fraction=(m[1].split('.')[1]||'').length,exponent=Number(m[2]||0);
 if(!Number.isInteger(exponent)||Math.abs(exponent)>1000)throw new RangeError('Math ERROR');
 return decimal(BigInt(m[1].replace('.','')),fraction-exponent)
}
function add(a,b){
 if(!a.n)return b;if(!b.n)return a;
 const scale=Math.max(a.s,b.s);
 return decimal(a.n*ten(scale-a.s)+b.n*ten(scale-b.s),scale)
}
const minus=a=>({n:-a.n,s:a.s});
const subtract=(a,b)=>add(a,minus(b));
const multiply=(a,b)=>decimal(a.n*b.n,a.s+b.s);
function divide(a,b){
 if(!b.n)throw new RangeError('Math ERROR');
 if(!a.n)return decimal(0n,0);
 const guard=19,absA=a.n<0n?-a.n:a.n,absB=b.n<0n?-b.n:b.n;
 const scaled=absA*ten(guard),q=scaled/absB,r=scaled%absB;
 const rounded=q+(r*2n>=absB?1n:0n);
 return decimal((a.n<0n)!==(b.n<0n)?-rounded:rounded,a.s-b.s+guard)
}
function pow(a,b){
 if(b.s>0||b.s< -3)throw new RangeError('Unsupported power');
 const value=Number(b.n)*10**-b.s;
 if(!Number.isInteger(value)||Math.abs(value)>100)throw new RangeError('Unsupported power');
 let result=decimal(1n,0),base=a,k=Math.abs(value);
 while(k){if(k%2)result=multiply(result,base);base=multiply(base,base);k=Math.floor(k/2)}
 return value<0?divide(decimal(1n,0),result):result
}
const asNumber=v=>Number(v.n.toString()+'e'+String(-v.s));
function evaluate(expression){
 if(!/^[\d.Ee+\-*/^()\s]+$/.test(expression))return null;
 if(/[\d.]\s+[\d.]/.test(expression))throw new SyntaxError('Syntax ERROR');
 const source=expression.replace(/\s+/g,'');
 const tokens=source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?|[()+*/^\-]/g);
 if(!tokens||tokens.join('')!==source){
  // Letter constants and scientific functions continue through legacy evaluator.
  if(/[Ee]/.test(source))return null;
  throw new SyntaxError('Syntax ERROR')
 }
 let at=0;const peek=()=>tokens[at];
 function primary(){
  const token=tokens[at++];
  if(token==='+')return expr(25);
  if(token==='-')return minus(expr(25));
  if(token==='('){const v=expr(0);if(tokens[at++]!==')')throw new SyntaxError('Syntax ERROR');return v}
  if(token&&/^(?:\d|\.)/.test(token))return parse(token);
  throw new SyntaxError('Syntax ERROR')
 }
 function expr(min){
  let left=primary();
  while(at<tokens.length&&peek()!==')'){
   const t=peek(),implicit=t==='(',op=implicit?'*':t;
   const priority=implicit?24:{'+':10,'-':10,'*':20,'/':20,'^':30}[op];
   if(priority===undefined||priority<min)break;
   if(!implicit)at++;
   const right=expr(op==='^'?priority:priority+1);
   left=op==='+'?add(left,right):op==='-'?subtract(left,right):
    op==='*'?multiply(left,right):op==='/'?divide(left,right):pow(left,right)
  }
  return left
 }
 try{
  const result=expr(0);if(at!==tokens.length)throw new SyntaxError('Syntax ERROR');
  const number=asNumber(result);
  if(!Number.isFinite(number)||Math.abs(number)>9.999999999e99)throw new RangeError('Math ERROR');
  return number
 }catch(error){if(error.message==='Unsupported power')return null;throw error}
}
const API=Object.freeze({evaluate,parse,add,subtract,multiply,divide,decimal,asNumber,PRECISION});
global.FreshDecimal=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
