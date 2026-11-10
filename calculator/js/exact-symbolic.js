/* REA-074: bounded source-based exact scalar algebra.
 * Supports rational + one radical OR rational + pi coefficient.
 * No numerical rational reconstruction, broad CAS, or CASIO firmware claims.
 */
(function(global){'use strict';
const LIMIT=1000000000000n, MAX_ROOT=1000000n;
const abs=n=>n<0n?-n:n;
function gcd(a,b){a=abs(a);b=abs(b);while(b){const x=a%b;a=b;b=x}return a||1n}
function q(n,d=1n){
 n=BigInt(n);d=BigInt(d);
 if(!d)throw Error('Math ERROR');
 if(d<0n){n=-n;d=-d}
 const k=gcd(n,d);n/=k;d/=k;
 if(abs(n)>LIMIT||d>LIMIT)return null;
 return {n,d};
}
const zero=()=>q(0n),one=()=>q(1n);
function addQ(a,b){return a&&b?q(a.n*b.d+b.n*a.d,a.d*b.d):null}
function negQ(a){return a&&q(-a.n,a.d)}
function subQ(a,b){return addQ(a,negQ(b))}
function mulQ(a,b){return a&&b?q(a.n*b.n,a.d*b.d):null}
function divQ(a,b){return a&&b&&b.n!==0n?q(a.n*b.d,a.d*b.n):null}
function form(a,b=zero(),kind=null,d=0n){
 if(!a||!b)return null;
 if(b.n===0n){kind=null;d=0n}
 return {a,b,kind,d};
}
const scalar=x=>form(x);
function root(n){
 if(n<0n||n>MAX_ROOT)return null;
 if(n===0n)return scalar(zero());
 let k=1n,d=n;
 for(let i=2n;i*i<=d;i++){
  while(d%(i*i)===0n){k*=i;d/=i*i}
 }
 return d===1n?scalar(q(k)):form(zero(),q(k),'sqrt',d);
}
function compatible(x,y){
 if(!x.kind)return y.kind;
 if(!y.kind)return x.kind;
 return x.kind===y.kind&&x.d===y.d?x.kind:null;
}
function plus(x,y,sign=1){
 if(!x||!y)return null;
 const kind=compatible(x,y);
 if(x.kind&&y.kind&&!kind)return null;
 const a=sign===1?addQ(x.a,y.a):subQ(x.a,y.a);
 const b=sign===1?addQ(x.b,y.b):subQ(x.b,y.b);
 return form(a,b,kind,x.kind?x.d:y.d);
}
function times(x,y){
 if(!x||!y)return null;
 if(!x.kind&&!y.kind)return scalar(mulQ(x.a,y.a));
 if(!x.kind||!y.kind){
  const t=x.kind?x:y,r=x.kind?y:x;
  return form(mulQ(t.a,r.a),mulQ(t.b,r.a),t.kind,t.d);
 }
 if(x.kind==='pi'||y.kind==='pi')return null;
 // Different radicals are reducible only if both are pure radicals.
 if(x.d!==y.d){
  if(x.a.n||y.a.n)return null;
  const factor=mulQ(x.b,y.b),rad=root(x.d*y.d);
  return factor&&rad?times(rad,scalar(factor)):null;
 }
 return form(addQ(mulQ(x.a,y.a),mulQ(mulQ(x.b,y.b),q(x.d))),
  addQ(mulQ(x.a,y.b),mulQ(x.b,y.a)),'sqrt',x.d);
}
function inverse(y){
 if(!y)return null;
 if(!y.kind)return scalar(divQ(one(),y.a));
 if(y.kind==='pi')return null; // No 1/pi exact-format inference.
 const denom=subQ(mulQ(y.a,y.a),mulQ(mulQ(y.b,y.b),q(y.d)));
 if(!denom||!denom.n)return null;
 return form(divQ(y.a,denom),divQ(negQ(y.b),denom),'sqrt',y.d);
}
function divide(x,y){return times(x,inverse(y))}
function power(x,y){
 if(!x||!y||y.kind||y.a.d!==1n||abs(y.a.n)>12n)return null;
 let n=y.a.n,z=scalar(one());
 if(n<0n){x=inverse(x);n=-n}
 if(!x)return null;
 for(let i=0n;i<n;i++){z=times(z,x);if(!z)return null}
 return z;
}
function tokenize(text){
 const s=String(text).replace(/\s+/g,'').replace(/π/g,'pi').replace(/√/g,'sqrt').replace(/×/g,'*').replace(/÷/g,'/');
 if(!s||s.length>180)return null;
 const tokens=[];
 for(let i=0;i<s.length;){
  const tail=s.slice(i);
  const number=/^(?:\d+(?:\.\d*)?|\.\d+)/.exec(tail);
  if(number){tokens.push({type:'num',value:number[0]});i+=number[0].length;continue}
  const name=/^[A-Za-z_][A-Za-z_0-9]*/.exec(tail);
  if(name){if(!['pi','sqrt'].includes(name[0]))return null;tokens.push({type:'id',value:name[0]});i+=name[0].length;continue}
  if(!'+-*/^()'.includes(s[i]))return null;
  tokens.push({type:'op',value:s[i++]});
  if(tokens.length>180)return null;
 }
 return tokens;
}
function literal(s){
 const [integer,fraction='']=s.split('.');
 if(fraction.length>12)return null;
 return q(BigInt(integer||'0')*10n**BigInt(fraction.length)+BigInt(fraction||'0'),10n**BigInt(fraction.length));
}
function evaluate(source){
 try{
  const t=tokenize(source);if(!t)return null;
  let i=0;const peek=()=>t[i];const take=()=>t[i++];
  function primary(){
   const current=take();if(!current)return null;
   if(current.value==='+')return expression(25);
   if(current.value==='-'){const a=expression(25);return a?times(scalar(q(-1n)),a):null}
   if(current.value==='('){const a=expression(0);if(take()?.value!==')')return null;return a}
   if(current.type==='num')return scalar(literal(current.value));
   if(current.value==='pi')return form(zero(),one(),'pi');
   if(current.value==='sqrt'){
    if(take()?.value!=='(')return null;
    const arg=expression(0);
    if(take()?.value!==')'||!arg||arg.kind||arg.a.d!==1n)return null;
    return root(arg.a.n);
   }
   return null;
  }
  function expression(min){
   let left=primary();if(!left)return null;
   while(i<t.length){
    const next=peek();if(next.value===')')break;
    const implicit=next.type==='num'||next.type==='id'||next.value==='(';
    const op=implicit?'*':next.value;
    const bp={'+':10,'-':10,'*':20,'/':20,'^':30}[op];
    if(bp===undefined||bp<min)break;
    if(!implicit)take();
    const right=expression(op==='^'?bp:bp+1);
    if(!right)return null;
    left=op==='+'?plus(left,right):op==='-'?plus(left,right,-1):
     op==='*'?times(left,right):op==='/'?divide(left,right):power(left,right);
    if(!left)return null;
   }
   return left;
  }
  const result=expression(0);
  if(!result||i!==t.length)return null;
  return result;
 }catch{return null}
}
function formatQ(v){
 if(!v)return null;
 return v.d===1n?v.n.toString():v.n.toString()+'/'+v.d.toString();
}
function formatted(f){
 if(!f||!f.kind||f.b.n===0n)return null;
 const a=f.a,b=f.b;
 const mag=abs(b.n),unit=f.kind==='pi'?'π':'√'+f.d;
 const coeff=mag===b.d?'':b.d===1n?mag.toString():mag.toString()+'/'+b.d.toString();
 const irrational=b.d===1n?coeff+unit:
  (mag===1n?'':mag.toString())+unit+'/'+b.d.toString();
 const pre=a.n?formatQ(a):'';
 const text=pre+((a.n||b.n<0n)?b.n<0n?'-':'+':'')+irrational;
 // Keep exact output bounded to native LCD-friendly forms.
 if(text.length>22)return null;
 const numeric=Number(a.n)/Number(a.d)+Number(b.n)/Number(b.d)*
  (f.kind==='pi'?Math.PI:Math.sqrt(Number(f.d)));
 if(!Number.isFinite(numeric))return null;
 return {kind:f.kind==='pi'?'pi':'surd',text,exact:true,
  numeric,coefficient:{numerator:b.n.toString(),denominator:b.d.toString()},
  rational:{numerator:a.n.toString(),denominator:a.d.toString()},
  radicand:f.kind==='sqrt'?Number(f.d):undefined};
}
function rational(source,value){
 const f=evaluate(source);
 if(!f||f.kind||!Number.isFinite(value))return null;
 const exact=Number(f.a.n)/Number(f.a.d);
 if(!Number.isFinite(exact)||Math.abs(exact-value)>2e-10*Math.max(1,Math.abs(value)))return null;
 return {numerator:f.a.n.toString(),denominator:f.a.d.toString()};
}
function symbolic(source,value){
 const f=evaluate(source),out=formatted(f);
 if(!out||!Number.isFinite(value))return null;
 if(Math.abs(out.numeric-value)>2e-10*Math.max(1,Math.abs(value)))return null;
 return out;
}
const api=Object.freeze({evaluate,symbolic,rational,formatted});
global.FreshExactSymbolic=api;
if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
