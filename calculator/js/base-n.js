/* REA-049 — independent BASE-N integer and conversion semantics. */
(function(g){'use strict';
const BASES=Object.freeze({DEC:10,BIN:2,OCT:8,HEX:16});
const SPECS=Object.freeze({
 'fx-991es':{BIN:16,DEC:32,OCT:32,HEX:32},
 'fx-991es-plus':{BIN:16,DEC:32,OCT:32,HEX:32},
 'fx-991es-plus-c':{BIN:16,DEC:32,OCT:32,HEX:32}
});
function fail(message='Math ERROR'){throw Error(message)}
function bits(base,model='fx-991es-plus'){const item=SPECS[model];if(!item||!item[base])fail('Argument ERROR');return item[base]}
function range(base,model){
 const size=BigInt(bits(base,model)),half=1n<<(size-1n);
 return {min:-half,max:half-1n,width:Number(size)};
}
function assertSigned(number,base,model){
 const n=BigInt(number),limits=range(base,model);
 if(n<limits.min||n>limits.max)fail('Math ERROR');
 return n;
}
function digitValue(char){const n=parseInt(char,16);return Number.isNaN(n)?-1:n}
function parseLiteral(text,base='DEC',model='fx-991es-plus'){
 const radix=BASES[base];if(!radix)fail('Argument ERROR');
 const digits=String(text).toUpperCase();
 if(!digits||digits.length>40)fail('Syntax ERROR');
 let unsigned=0n;
 for(const c of digits){const d=digitValue(c);if(d<0||d>=radix)fail('Syntax ERROR');unsigned=unsigned*BigInt(radix)+BigInt(d)}
 const spec=bits(base,model),full=1n<<BigInt(spec),half=full>>1n;
 if(base==='DEC')return assertSigned(unsigned,base,model);
 if(unsigned>=full)fail('Math ERROR');
 return unsigned>=half?unsigned-full:unsigned;
}
function format(number,base='DEC',model='fx-991es-plus'){
 const n=assertSigned(number,base,model);
 if(base==='DEC')return n.toString();
 const width=bits(base,model),unsigned=BigInt.asUintN(width,n);
 const places=base==='BIN'?width:base==='HEX'?width/4:Math.ceil(width/3);
 return unsigned.toString(BASES[base]).toUpperCase().padStart(places,'0');
}
// Base-specific two's-complement logic, avoiding Number's implicit 32-bit truncation.
const LOGIC_BINARY=Object.freeze(['and','or','xor','xnor']);
const LOGIC_UNARY=Object.freeze(['Not','Neg']);
function logical(op,a,b,base='DEC',model='fx-991es-plus'){
 const width=bits(base,model),mask=(1n<<BigInt(width))-1n;
 const lhs=BigInt.asUintN(width,BigInt(a));
 if(op==='Not')return BigInt.asIntN(width,(~lhs)&mask);
 if(op==='Neg')return BigInt.asIntN(width,(-lhs)&mask);
 if(b===undefined)fail('Syntax ERROR');
 const rhs=BigInt.asUintN(width,BigInt(b));
 let res;
 switch(op.toLowerCase()){
 case 'and':res=lhs&rhs;break;
 case 'or':res=lhs|rhs;break;
 case 'xor':res=lhs^rhs;break;
 case 'xnor':res=(~(lhs^rhs))&mask;break;
 default:fail('Syntax ERROR');
 }
 return BigInt.asIntN(width,res);
}
function tokens(expression,base){
 const source=String(expression).trim().replace(/−/g,'-').replace(/×/g,'*').replace(/÷/g,'/');
 if(!source)fail('Syntax ERROR');
 const parts=[];let i=0;
 while(i<source.length){
  const c=source[i];
  if(/\s/.test(c)){i++;continue}
  if('()+-*/'.includes(c)){parts.push({kind:c,text:c});i++;continue}
  const match=/^(xnor|xor|and|or|Not|Neg)(?![0-9A-Za-z])/i.exec(source.slice(i));
  if(match){
   const op=match[1].toLowerCase();
   parts.push({kind:op==='not'?'Not':op==='neg'?'Neg':op,text:match[0]});
   i+=match[0].length;continue;
  }
  const word=/^[0-9A-Fa-f]+/.exec(source.slice(i));
  if(!word)fail('Syntax ERROR');
  parts.push({kind:'number',text:word[0]});i+=word[0].length;
  if(parts.length>200)fail('Syntax ERROR');
 }
 return parts;
}
function evaluate(expression,base='DEC',model='fx-991es-plus'){
 const list=tokens(expression,base);let at=0;
 function primary(){
  const t=list[at++];if(!t)fail('Syntax ERROR');
  if(t.kind==='number')return parseLiteral(t.text,base,model);
  if(t.kind==='Not'||t.kind==='Neg'){
   if(list[at]?.kind!=='(')fail('Syntax ERROR');
   at++;const operand=parse(0);
   if(list[at]?.kind!==')')fail('Syntax ERROR');
   at++;return logical(t.kind,operand,undefined,base,model);
  }
  if(t.kind==='('){const z=parse(0);if(list[at]?.kind!==')')fail('Syntax ERROR');at++;return z}
  if(t.kind==='+')return primary();
  if(t.kind==='-'){
   // Signed decimal MIN cannot be parsed as a positive 32-bit operand first.
   if(base==='DEC'&&list[at]?.kind==='number'&&list[at].text==='2147483648'){
    at++;return -2147483648n;
   }
   return assertSigned(-primary(),base,model);
  }
  fail('Syntax ERROR');
 }
 function parse(min){
  let lhs=primary();
  while(at<list.length){
   const op=list[at].kind;
   if(op===')')break;
   const prec=op==='*'||op==='/'?30:op==='+'||op==='-'?20:
    op==='and'?15:op==='xor'||op==='xnor'?10:op==='or'?5:-1;
   if(prec<min)break;
   at++;const rhs=parse(prec+1);
   if(op==='+')lhs+=rhs;
   else if(op==='-')lhs-=rhs;
   else if(op==='*')lhs*=rhs;
   else if(op==='/'){if(!rhs)fail('Math ERROR');lhs/=rhs}
   else lhs=logical(op,lhs,rhs,base,model);
   lhs=assertSigned(lhs,base,model);
  }
  return lhs;
 }
 const result=parse(0);if(at!==list.length)fail('Syntax ERROR');
 return assertSigned(result,base,model);
}
function convert(value,to,model){return format(BigInt(value),to,model)}
function display(value,base,model){return {base,text:format(value,base,model),decimal:Number(value)}}
const API=Object.freeze({BASES,SPECS,bits,range,parseLiteral,format,logical,evaluate,convert,display,LOGIC_BINARY,LOGIC_UNARY});
g.FreshBaseN=API;
if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
