/* REA-022: exact rational arithmetic for finite numeric expressions. */
(function(global){'use strict';
const MAX_DIGITS=300;
const abs=n=>n<0n?-n:n;
function gcd(a,b){a=abs(a);b=abs(b);while(b){const r=a%b;a=b;b=r}return a||1n}
function rational(n,d=1n){
 n=BigInt(n);d=BigInt(d);
 if(d===0n)throw new RangeError('Math ERROR');
 if(d<0n){n=-n;d=-d}
 if(n===0n)return {n:0n,d:1n};
 const g=gcd(n,d);n/=g;d/=g;
 if(n.toString().length>MAX_DIGITS||d.toString().length>MAX_DIGITS)return null;
 return {n,d};
}
function fromNumber(text){
 const m=/^(\d+(?:\.\d*)?|\.\d+)(?:[Ee]([+-]?\d+))?$/.exec(text);
 if(!m)throw new SyntaxError('Syntax ERROR');
 const exp=Number(m[2]||0),fraction=(m[1].split('.')[1]||'').length;
 if(Math.abs(exp)>100) return null;
 const scale=fraction-exp,number=BigInt(m[1].replace('.',''));
 return scale<0?rational(number*10n**BigInt(-scale)):rational(number,10n**BigInt(scale));
}
const negate=a=>a&&{n:-a.n,d:a.d};
const plus=(a,b)=>a&&b?rational(a.n*b.d+b.n*a.d,a.d*b.d):null;
const minus=(a,b)=>plus(a,negate(b));
const mul=(a,b)=>a&&b?rational(a.n*b.n,a.d*b.d):null;
const div=(a,b)=>a&&b?rational(a.n*b.d,a.d*b.n):null;
function power(a,b){
 if(!a||!b||b.d!==1n||abs(b.n)>100n)return null;
 if(b.n<0n)return rational(a.d**(-b.n),a.n**(-b.n));
 return rational(a.n**b.n,a.d**b.n);
}
function fromStored(value){
 if(!value||!/^[-]?\d+$/.test(String(value.numerator))||!/^\d+$/.test(String(value.denominator)))return null;
 return rational(BigInt(value.numerator),BigInt(value.denominator));
}
function serialize(a){return a?{numerator:a.n.toString(),denominator:a.d.toString()}:null}
const toNumber=a=>a?Number(a.n)/Number(a.d):NaN;
function evaluate(source,options={}){
 if(/[\d.]\s+[\d.]/.test(String(source)))throw new SyntaxError('Syntax ERROR');
 const s=String(source).replace(/\s+/g,'').replace(/−/g,'-').replace(/×/g,'*').replace(/÷/g,'/');
 // Expressions outside rational grammar must go through scientific evaluator.
 if(!/^(?:[\d.Ee+*/^()\-]|Ans|PreAns)+$/.test(s))return null;
 const tokens=s.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?|PreAns|Ans|[()+*/^\-]/g);
 if(!tokens||tokens.join('')!==s)return null;
 let at=0;const peek=()=>tokens[at];
 function primary(){
  const token=tokens[at++];
  if(token==='+')return expression(25);
  if(token==='-')return negate(expression(25));
  if(token==='('){const r=expression(0);if(tokens[at++]!==')')throw new SyntaxError('Syntax ERROR');return r}
  if(token==='Ans')return fromStored(options.ansRational);
  if(token==='PreAns')return fromStored(options.preAnsRational);
  if(token&&/^(?:\d|\.)/.test(token))return fromNumber(token);
  throw new SyntaxError('Syntax ERROR');
 }
 function expression(min){
  let left=primary();
  while(at<tokens.length&&peek()!==')'){
   const t=peek(),implicit=t==='('||t==='Ans'||t==='PreAns';
   const op=implicit?'*':t,bp=implicit?24:{'+':10,'-':10,'*':20,'/':20,'^':30}[op];
   if(bp===undefined||bp<min)break;
   if(!implicit)at++;
   const right=expression(op==='^'?bp:bp+1);
   left=op==='+'?plus(left,right):op==='-'?minus(left,right):op==='*'?mul(left,right):op==='/'?div(left,right):power(left,right);
  }
  return left;
 }
 if(!tokens.length)return null;
 const value=expression(0);
 if(at!==tokens.length)throw new SyntaxError('Syntax ERROR');
 return value;
}
const api=Object.freeze({evaluate,rational,fromStored,serialize,toNumber,fromNumber});
global.FreshRational=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
