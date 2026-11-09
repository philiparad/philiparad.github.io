/* Independent numerical/expression engine. No eval, new Function, CASIO binary or ROM. */
(function(global){'use strict';
const TAU=2*Math.PI;
const SETTINGS={angle:'DEG',format:'Norm2',digits:3,math:true};
class MathFault extends Error{constructor(message){super(message);this.name='CalculatorError'}}
const fail=(message)=>{throw new MathFault(message)};
function factorial(n){if(!Number.isInteger(n)||n<0||n>170)fail('Math ERROR');let a=1;for(let i=2;i<=n;i++)a*=i;return a}
function permutation(n,r){if(!Number.isInteger(n)||!Number.isInteger(r)||n<0||r<0||r>n||n>170)fail('Math ERROR');let a=1;for(let k=0;k<r;k++)a*=n-k;return a}
function combination(n,r){if(!Number.isInteger(n)||!Number.isInteger(r)||n<0||r<0||r>n)fail('Math ERROR');r=Math.min(r,n-r);let a=1;for(let k=1;k<=r;k++)a=a*(n-k+1)/k;return Math.round(a)}
function toRadians(n,unit){return unit==='RAD'?n:unit==='GRAD'?n*Math.PI/200:n*Math.PI/180}
function fromRadians(n,unit){return unit==='RAD'?n:unit==='GRAD'?n*200/Math.PI:n*180/Math.PI}
function gcd(a,b){while(b!==0n){const t=a%b;a=b;b=t}return a<0n?-a:a}
function fraction(value,tolerance=1e-11,maxDenominator=10000){
 if(!Number.isFinite(value))return null;
 if(Math.abs(value)<tolerance)return [0,1];
 if(Math.abs(value)>1e10)return null;
 const sign=value<0?-1:1;let x=Math.abs(value),n0=0,n1=1,d0=1,d1=0;
 for(let i=0;i<25;i++){
  const a=Math.floor(x),n=a*n1+n0,d=a*d1+d0;
  if(d>maxDenominator)break;
  if(Math.abs(value-sign*n/d)<=tolerance*Math.max(1,Math.abs(value)))return [sign*n,d];
  n0=n1;n1=n;d0=d1;d1=d;const rem=x-a;if(rem<1e-14)break;x=1/rem;
 }
 return null;
}
function format(value,settings={},preferFraction=false){
 const cfg={...SETTINGS,...settings};
 if(typeof value==='string')return value;
 if(!Number.isFinite(value))return 'Math ERROR';
 if(preferFraction&&cfg.math&&cfg.format.startsWith('Norm')){
  const f=fraction(value);
  if(f&&f[1]!==1)return f[0]+'/'+f[1];
 }
 return global.FreshNumberFormat?
  global.FreshNumberFormat.format(value,cfg):Number(value.toPrecision(10)).toString();
}
const T={NUMBER:'number',IDENT:'identifier',OP:'operator'};
function tokenize(source){
 if(/[\d.]\s+[\d.]/.test(String(source)))fail('Syntax ERROR');
 let raw=[],s=String(source).replace(/−/g,'-').replace(/×/g,'*').replace(/÷/g,'/').replace(/π/g,'pi').replace(/√/g,'sqrt').replace(/²/g,'^2').replace(/³/g,'^3').replace(/\s+/g,'');
 for(let i=0;i<s.length;){const sub=s.slice(i);let m;
  if((m=/^(?:\d+(?:\.\d*)?|\.\d+)(?:[Ee][+-]?\d+)?/.exec(sub))){raw.push({type:T.NUMBER,value:Number(m[0]),text:m[0]});i+=m[0].length;continue}
  if(s.startsWith('nPr',i)||s.startsWith('nCr',i)){raw.push({type:T.OP,value:s.slice(i,i+3)});i+=3;continue}
  if((m=/^[A-Za-z_][A-Za-z_0-9]*/.exec(sub))){raw.push({type:T.IDENT,value:m[0]});i+=m[0].length;continue}
  if('+-*/^!()% ,°′″'.includes(s[i])&&s[i]!== ' '){raw.push({type:T.OP,value:s[i]});i++;continue}
  fail('Syntax ERROR');
 }
 return raw;
}
function evaluate(source,opts={}){
 // REA-021: exact base-10 intermediates for numeric arithmetic expressions.
 // Scientific functions, register variables and unsupported powers use the existing engine.
 if(global.FreshDecimal){
  try{
   const decimalValue=global.FreshDecimal.evaluate(source);
   if(decimalValue!==null)return decimalValue;
  }catch(error){fail(error instanceof SyntaxError?'Syntax ERROR':'Math ERROR')}
 }
 const st={...SETTINGS,...opts};const memory=opts.memory||{};
 const raw=tokenize(source);
 // Recombine nPr/nCr even if the tokenizer recognized the letters as identifiers.
 for(const token of raw)if(token.type===T.IDENT&&/^(nPr|nCr)$/.test(token.value))token.type=T.OP;
 let i=0;const peek=()=>raw[i];const take=()=>raw[i++];
 const names=new Set(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh','log','ln','sqrt','cbrt','abs','exp','floor','ceil','round','rnd','int','pol','rec','min','max','sign','RanInt']);
 const variables={pi:Math.PI,e:Math.E,Ans:opts.ans??0,PreAns:opts.preAns??0,rand:Math.random(),Ran:Math.random(),...memory};
 function call(name,args){
  const x=args[0];const unit=st.angle;
  switch(name.toLowerCase()){
   case 'sin':return Math.sin(toRadians(x,unit));case 'cos':return Math.cos(toRadians(x,unit));case 'tan':if(Math.abs(Math.cos(toRadians(x,unit)))<1e-13)fail('Math ERROR');return Math.tan(toRadians(x,unit));
   case 'asin':return fromRadians(Math.asin(x),unit);case 'acos':return fromRadians(Math.acos(x),unit);case 'atan':return fromRadians(Math.atan(x),unit);
   case 'sinh':return Math.sinh(x);case 'cosh':return Math.cosh(x);case 'tanh':return Math.tanh(x);
   case 'asinh':return Math.asinh(x);case 'acosh':return Math.acosh(x);case 'atanh':return Math.atanh(x);
   case 'ln':return Math.log(x);case 'log':return args.length===2?Math.log(args[1])/Math.log(x):Math.log10(x);
   case 'sqrt':return Math.sqrt(x);case 'cbrt':return Math.cbrt(x);case 'abs':return Math.abs(x);
   case 'exp':return Math.exp(x);case 'floor':case 'int':return Math.floor(x);case 'ceil':return Math.ceil(x);
   case 'round':return Math.round(x);case 'rnd':return Number(x.toFixed(st.digits));
   case 'min':return Math.min(...args);case 'max':return Math.max(...args);case 'sign':return Math.sign(x);
   case 'ranint':if(args.length!==2||!args.every(Number.isInteger)||x>args[1])fail('Argument ERROR');return Math.floor(Math.random()*(args[1]-x+1))+x;
   default:fail('Syntax ERROR');
  }
 }
 function begin(t){return t&&(t.type===T.IDENT||t.value==='(')}
 function primary(){const t=take();if(!t)fail('Syntax ERROR');
  if(t.value==='+')return expr(25);
  if(t.value==='-')return -expr(25);
  if(t.value==='('){const x=expr(0);if(!peek()||take().value!==')')fail('Syntax ERROR');return x}
  if(t.type===T.NUMBER)return t.value;
  if(t.type===T.IDENT){
   if(peek()?.value==='('&&names.has(t.value)){take();let args=[];if(peek()?.value!==')'){while(true){args.push(expr(0));if(peek()?.value!==',')break;take()}}if(!peek()||take().value!==')')fail('Syntax ERROR');return call(t.value,args)}
   if(Object.prototype.hasOwnProperty.call(variables,t.value))return Number(variables[t.value]);
   fail('Variable ERROR: '+t.value);
  }
  fail('Syntax ERROR');
 }
 function expr(min){let left=primary();while(true){const t=peek();if(!t||t.value===')'||t.value===',')break;
  if(t.value==='!'||t.value==='%'||t.value==='°'||t.value==='′'||t.value==='″'){if(45<min)break;take();if(t.value==='!')left=factorial(left);else if(t.value==='%')left=left/100;else left=fromRadians(toRadians(left/(t.value==='°'?1:t.value==='′'?60:3600),'DEG'),st.angle);continue}
  const implicit=begin(t);const operator=implicit?'*':t.value;
  const binding=implicit?24:{'nPr':23,'nCr':23,'+':10,'-':10,'*':20,'/':20,'^':30}[operator];
  if(binding===undefined||binding<min)break;
  if(!implicit)take();const right=expr(operator==='^'?binding:binding+1);
  if(operator==='+')left+=right;else if(operator==='-')left-=right;
  else if(operator==='*')left*=right;else if(operator==='/'){if(right===0)fail('Math ERROR');left/=right}
  else if(operator==='^')left=Math.pow(left,right);else if(operator==='nPr')left=permutation(left,right);
  else if(operator==='nCr')left=combination(left,right);
 }
 return left}
 if(!raw.length)fail('Syntax ERROR');const result=expr(0);if(i<raw.length)fail('Syntax ERROR');if(!Number.isFinite(result))fail('Math ERROR');if(Math.abs(result)>9.999999999e99)fail('Math ERROR');return Math.abs(result)<1e-13?0:result;
}
function derivative(fn,x,h=1e-4){const d=h*Math.max(1,Math.abs(x));return (-fn(x+2*d)+8*fn(x+d)-8*fn(x-d)+fn(x-2*d))/(12*d)}
function integrate(fn,a,b,steps=1200){if(a===b)return 0;let sign=1;if(a>b){[a,b]=[b,a];sign=-1}steps+=steps%2;const h=(b-a)/steps;let sum=fn(a)+fn(b);for(let k=1;k<steps;k++)sum+=(k%2?4:2)*fn(a+k*h);return sign*sum*h/3}
function solve(fn,start=1){let x=Number(start);for(let i=0;i<80;i++){let y=fn(x);if(Math.abs(y)<1e-11)return x;const d=derivative(fn,x);if(!Number.isFinite(d)||Math.abs(d)<1e-13)break;const next=x-y/d;if(!Number.isFinite(next))break;if(Math.abs(next-x)<1e-12)return next;x=next}fail('Cannot Solve')}
function quadratic(a,b,c){if(a===0){if(b===0)fail('Math ERROR');return [-c/b]}const d=b*b-4*a*c;if(d<0)return [];const s=Math.sqrt(d);return d===0?[-b/(2*a)]:[(-b+s)/(2*a),(-b-s)/(2*a)]}
function matrixSolve(rows){const n=rows.length;const m=rows.map(r=>r.slice());for(let i=0;i<n;i++){let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(m[j][i])>Math.abs(m[pivot][i]))pivot=j;[m[i],m[pivot]]=[m[pivot],m[i]];if(Math.abs(m[i][i])<1e-12)fail('Math ERROR');const d=m[i][i];for(let k=i;k<=n;k++)m[i][k]/=d;for(let j=0;j<n;j++)if(j!==i){const f=m[j][i];for(let k=i;k<=n;k++)m[j][k]-=f*m[i][k]}}return m.map(row=>row[n])}
function descriptiveStats(data){if(!data.length)fail('Argument ERROR');const n=data.length,mean=data.reduce((a,b)=>a+b,0)/n,variance=data.reduce((a,b)=>a+(b-mean)**2,0)/n;return {n,sum:data.reduce((a,b)=>a+b,0),mean,variance,sd:Math.sqrt(variance),sampleSD:n>1?Math.sqrt(variance*n/(n-1)):null,min:Math.min(...data),max:Math.max(...data)}}
function parseNumbers(text){const vals=String(text).split(/[,;\s]+/).filter(Boolean).map(Number);if(!vals.length||vals.some(n=>!Number.isFinite(n)))fail('Argument ERROR');return vals}
const API=Object.freeze({evaluate,format,fraction,MathFault,SETTINGS,toRadians,fromRadians,factorial,permutation,combination,derivative,integrate,solve,quadratic,matrixSolve,descriptiveStats,parseNumbers});
global.FreshMath=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
