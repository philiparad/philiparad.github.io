/* Independent educational calculator kernel — no proprietary firmware or assets. */
(function(global){
'use strict';
const MODES_STD=['COMP','CMPLX','STAT','BASE-N','EQN','MATRIX','TABLE','VECTOR'];
const MODES_C=[...MODES_STD,'INEQ','VERIF','DIST'];
const MODELS=Object.freeze({standard:Object.freeze({id:'fx991esplus-2',name:'fx-991ES PLUS',modes:Object.freeze(MODES_STD),tableMax:30,tableDual:false}),c:Object.freeze({id:'fx991esplus-c-2',name:'fx-991ES PLUS C',modes:Object.freeze(MODES_C),tableMax:30,tableDual:true,dualMax:20})});
const ERROR=Object.freeze({MATH:'Math ERROR',SYNTAX:'Syntax ERROR',ARGUMENT:'Argument ERROR',DIMENSION:'Dimension ERROR',UNSUPPORTED:'Not implemented',CANT_SOLVE:"Can't Solve Error",MEM:'Insufficient MEM Error',STACK:'Stack ERROR',VARIABLE:'Variable ERROR',TIME_OUT:'Time Out Error'});
class CalcError extends Error {constructor(code,position=0){super(code);this.name='CalcError';this.code=code;this.position=position}}
function gcd(a,b){a=a<0n?-a:a;b=b<0n?-b:b;while(b){[a,b]=[b,a%b]}return a||1n}
function rat(n,d=1n){n=BigInt(n);d=BigInt(d);if(!d)throw new CalcError(ERROR.MATH);if(d<0n){n=-n;d=-d}const g=gcd(n,d);return {kind:'rational',n:n/g,d:d/g}}
function dec(v){if(!Number.isFinite(v))throw new CalcError(ERROR.MATH);const D=global.FX991_DECIMAL;if(!D)return {kind:'decimal',value:v};let fraction=D.parseDecimal(Number(v).toString()),q=D.quantize(fraction.n,fraction.d,15);return {kind:'decimal',value:Number(q.n)/Number(q.d),n:q.n,d:q.d}}
function pi(c=rat(1n)){return {kind:'pi',coefficient:c}}
const isRat=v=>v.kind==='rational';const isPi=v=>v.kind==='pi';
const isExactRadical=v=>v&&v.kind==='radical';
const isRadicalSum=v=>v&&v.kind==='radical-sum';
// Bounded exact expression: a rational term and up to eight unlike square roots.
// The representation is internal and independently authored, not CASIO firmware.
function radicalSum(parts){
 let scalar=rat(0n),terms=new Map();
 for(const v of parts){
  if(isRat(v)){scalar=rat(scalar.n*v.d+v.n*scalar.d,scalar.d*v.d);continue}
  const items=isRadicalSum(v)?[v.scalar,...v.radicals.map(t=>({kind:'radical',...t}))]:[v];
  if(items.length>1){const nested=radicalSum(items);if(isRadicalSum(nested)){scalar=add(scalar,nested.scalar);for(const term of nested.radicals){const old=terms.get(term.radicand)||rat(0n);terms.set(term.radicand,add(old,term.coefficient))}}else if(isRat(nested))scalar=add(scalar,nested);else{const old=terms.get(nested.radicand)||rat(0n);terms.set(nested.radicand,add(old,nested.coefficient))}continue}
  if(!isExactRadical(v)||!isRat(v.coefficient))throw new CalcError(ERROR.ARGUMENT);
  const old=terms.get(v.radicand)||rat(0n);terms.set(v.radicand,rat(old.n*v.coefficient.d+v.coefficient.n*old.d,old.d*v.coefficient.d));
 }
 const radicals=[...terms].filter(([,c])=>c.n!==0n).sort(([a],[b])=>a>b?-1:a<b?1:0).map(([radicand,coefficient])=>({radicand,coefficient}));
 if(!radicals.length)return scalar;
 if(scalar.n===0n&&radicals.length===1)return {kind:'radical',...radicals[0]};
 if(radicals.length>8)throw new CalcError(ERROR.ARGUMENT);
 return {kind:'radical-sum',scalar,radicals};
}
function exactRadicalParts(v){return isRadicalSum(v)?[v.scalar,...v.radicals.map(t=>({kind:'radical',...t}))]:[v]}
function normalizeRadicalProduct(a,b){
 if(isRat(a)&&isRat(b))return mul(a,b);
 if(isRat(a)&&isExactRadical(b))return {kind:'radical',radicand:b.radicand,coefficient:mul(a,b.coefficient)};
 if(isRat(b)&&isExactRadical(a))return {kind:'radical',radicand:a.radicand,coefficient:mul(a.coefficient,b)};
 if(isExactRadical(a)&&isExactRadical(b)){
  const coefficient=mul(a.coefficient,b.coefficient),root=sqrt(rat(a.radicand*b.radicand));
  return isRat(root)?mul(coefficient,root):{kind:'radical',radicand:root.radicand,coefficient:mul(coefficient,root.coefficient)};
 }
 throw new CalcError(ERROR.ARGUMENT)
}

function numeric(v){if(isRat(v))return Number(v.n)/Number(v.d);if(isPi(v))return numeric(v.coefficient)*Math.PI;if(v.kind==='radical')return numeric(v.coefficient)*Math.sqrt(Number(v.radicand));if(isRadicalSum(v))return numeric(v.scalar)+v.radicals.reduce((acc,t)=>acc+numeric(t.coefficient)*Math.sqrt(Number(t.radicand)),0);if(v.kind==='decimal')return v.n!==undefined?Number(v.n)/Number(v.d):v.value;throw new CalcError(ERROR.ARGUMENT)}
function add(a,b){if((a.kind==='decimal'||b.kind==='decimal')&&global.FX991_DECIMAL){let x=asRational(a),y=asRational(b);return decFromFraction(x.n*y.d+y.n*x.d,x.d*y.d)}if(isRat(a)&&isRat(b))return rat(a.n*b.d+b.n*a.d,a.d*b.d);if(isPi(a)&&isPi(b))return pi(add(a.coefficient,b.coefficient));if((isExactRadical(a)||isRadicalSum(a)||isRat(a))&&(isExactRadical(b)||isRadicalSum(b)||isRat(b))&&(isExactRadical(a)||isRadicalSum(a)||isExactRadical(b)||isRadicalSum(b)))return radicalSum([...exactRadicalParts(a),...exactRadicalParts(b)]);return dec(numeric(a)+numeric(b))}
function neg(a){if(a.kind==='decimal'&&a.n!==undefined)return {...a,n:-a.n,value:-a.value};if(isRat(a))return rat(-a.n,a.d);if(isPi(a))return pi(neg(a.coefficient));if(a.kind==='radical')return {...a,coefficient:neg(a.coefficient)};if(isRadicalSum(a))return radicalSum([neg(a.scalar),...a.radicals.map(t=>({kind:'radical',radicand:t.radicand,coefficient:neg(t.coefficient)}))]);return dec(-numeric(a))}
function sub(a,b){return add(a,neg(b))}
function mul(a,b){if((a.kind==='decimal'||b.kind==='decimal')&&global.FX991_DECIMAL){let x=asRational(a),y=asRational(b);return decFromFraction(x.n*y.n,x.d*y.d)}if(isRat(a)&&isRat(b))return rat(a.n*b.n,a.d*b.d);if(isPi(a)&&isRat(b))return pi(mul(a.coefficient,b));if(isPi(b)&&isRat(a))return pi(mul(b.coefficient,a));if((isExactRadical(a)||isRadicalSum(a)||isRat(a))&&(isExactRadical(b)||isRadicalSum(b)||isRat(b))&&(isExactRadical(a)||isRadicalSum(a)||isExactRadical(b)||isRadicalSum(b))){
  const products=[];for(const x of exactRadicalParts(a))for(const y of exactRadicalParts(b)){
   if(products.length>=64)throw new CalcError(ERROR.ARGUMENT);
   products.push(normalizeRadicalProduct(x,y))
  }return radicalSum(products)
 }return dec(numeric(a)*numeric(b))}
function div(a,b){if((a.kind==='decimal'||b.kind==='decimal')&&global.FX991_DECIMAL){let x=asRational(a),y=asRational(b);if(y.n===0n)throw new CalcError(ERROR.MATH);return decFromFraction(x.n*y.d,x.d*y.n)}if(isRat(b)&&b.n===0n)throw new CalcError(ERROR.MATH);if(isRat(a)&&isRat(b))return rat(a.n*b.d,a.d*b.n);if(isPi(a)&&isRat(b))return pi(div(a.coefficient,b));if(a.kind==='radical'&&isRat(b))return {...a,coefficient:div(a.coefficient,b)};if(isRadicalSum(a)&&isRat(b))return radicalSum([div(a.scalar,b),...a.radicals.map(t=>({kind:'radical',radicand:t.radicand,coefficient:div(t.coefficient,b)}))]);let bv=numeric(b);if(bv===0)throw new CalcError(ERROR.MATH);return dec(numeric(a)/bv)}
function pow(a,b){if(isRat(a)&&isRat(b)&&b.d===1n&&b.n>=-999n&&b.n<=999n){let p=b.n<0n?-b.n:b.n;return b.n>=0n?rat(a.n**p,a.d**p):rat(a.d**p,a.n**p)}return dec(Math.pow(numeric(a),numeric(b)))}
function sqrt(a){if(isRat(a)&&a.n>=0n&&a.n<=1000000000000n&&a.d<=1000000000000n){let n=a.n,d=a.d,coef=1n,radicand=n*d; if(n===0n)return rat(0n); // sqrt(n/d)=sqrt(n*d)/d
 for(let q=2n;q*q<=radicand&&q<1000000n;q++){let sq=q*q;while(radicand%sq===0n){radicand/=sq;coef*=q}}
 if(radicand===1n)return rat(coef,d);
 return {kind:'radical',coefficient:rat(coef,d),radicand};}
 return dec(Math.sqrt(numeric(a)))}
function asRational(v){if(isRat(v))return v;if(v.kind==='decimal'){if(v.n!==undefined)return rat(v.n,v.d);const d=global.FX991_DECIMAL.parseDecimal(String(v.value));return rat(d.n,d.d)}throw new CalcError(ERROR.ARGUMENT)}
function decFromFraction(n,d){if(d<0n){n=-n;d=-d}if(d===0n)throw new CalcError(ERROR.MATH);const q=global.FX991_DECIMAL.quantize(n,d,15);return {kind:'decimal',n:q.n,d:q.d,value:Number(q.n)/Number(q.d)}}
function decimalRational(v){if(isRat(v))return v;if(v.kind==='decimal')return asRational(v);return global.FX991_DECIMAL.parseDecimal(String(numeric(v)))}
function validateRange(v){let magnitude=Math.abs(numeric(v));if(!Number.isFinite(magnitude)||magnitude>=1e100)throw new CalcError(ERROR.MATH);if(magnitude!==0&&magnitude<1e-99)throw new CalcError(ERROR.MATH);return v}
function valueToString(v){if(isRat(v))return v.d===1n?String(v.n):String(v.n)+'/'+String(v.d);if(isPi(v)){let c=v.coefficient;if(isRat(c)&&c.n===0n)return '0';if(isRat(c)&&c.d===1n&&c.n===1n)return 'π';if(isRat(c)&&c.d===1n&&c.n===-1n)return '-π';return valueToString(c)+'π'}if(v.kind==='radical'){let c=valueToString(v.coefficient);return (c==='1'?'':c==='-1'?'-':c)+'√'+String(v.radicand)}if(isRadicalSum(v)){const terms=[...v.radicals];let parts=[];
  if(v.scalar.n!==0n)parts.push(valueToString(v.scalar));
  for(const t of terms){const n=t.coefficient.n<0n?-t.coefficient.n:t.coefficient.n;
   const c=valueToString(rat(n,t.coefficient.d));
   const body=(c==='1'?'':c)+'√'+t.radicand;
   parts.push((t.coefficient.n<0n?'-':parts.length?'+':'')+body);
  }return parts.join('')
 }return v.n!==undefined?global.FX991_DECIMAL.plain(v.n,v.d,15):Number(v.value.toPrecision(11)).toString()}
function displayNumber(n,setup){if(!Number.isFinite(n))throw new CalcError(ERROR.MATH);const D=global.FX991_DECIMAL;if(!D)return Number(n.toPrecision(10)).toString();const r=D.parseDecimal(String(n));return D.format(r.n,r.d,setup)}
function format(v,setup={},decimalView=false){
 if(!decimalView&&setup.format!=='Fix'&&setup.format!=='Sci'&&v.kind!=='decimal')return valueToString(v);
 if(global.FX991_DECIMAL){let r=decimalRational(v);return global.FX991_DECIMAL.format(r.n,r.d,setup)}
 return displayNumber(numeric(v),setup);
}
const TOKEN_RE=/(?:\d+(?:\.\d*)?|\.\d+|asin|acos|atan|sin|cos|tan|sqrt|abs|log|ln|exp|Rnd|Ans|pi|[A-FMXY]|[()+\-*/^!])/iy;
function tokenize(src){let s=String(src).replace(/\s/g,'').replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/π/g,'pi').replace(/√\(/g,'sqrt(');const out=[];let i=0;while(i<s.length){TOKEN_RE.lastIndex=i;let m=TOKEN_RE.exec(s);if(!m)throw new CalcError(ERROR.SYNTAX,i);out.push({value:m[0],pos:i});i=TOKEN_RE.lastIndex}if(!out.length)throw new CalcError(ERROR.SYNTAX,0);return out}
function parse(src){const t=tokenize(src);let i=0;let peek=()=>t[i]?.value;let take=v=>{if(peek()===v){i++;return true}return false};let required=v=>{if(!take(v))throw new CalcError(ERROR.SYNTAX,t[i]?.pos??String(src).length)};
 function atom(){let token=t[i];if(!token)throw new CalcError(ERROR.SYNTAX,String(src).length);if(take('(')){let a=sum();required(')');return {type:'group',arg:a}}let v=token.value;if(['sin','cos','tan','asin','acos','atan','sqrt','abs','log','ln','exp','Rnd'].includes(v)){i++;required('(');let a=sum();required(')');return {type:'fn',name:v,arg:a}}i++;if(v==='pi'||v==='Ans'||/^[A-FMXY]$/.test(v))return {type:'symbol',name:v};if(/^\d/.test(v)||/^\./.test(v))return {type:'number',raw:v,pos:token.pos};throw new CalcError(ERROR.SYNTAX,token.pos)}
 function power(){let a=atom();while(take('!'))a={type:'fact',arg:a};if(take('^'))a={type:'binary',op:'^',left:a,right:unary()};return a}
 function unary(){if(take('-'))return {type:'neg',arg:unary()};if(take('+'))return unary();return power()}
 // Juxtaposition binds more tightly than explicit multiplication/division in the
 // documented ES-style Natural Display calculation order. Examples:
 // 1/2pi means 1/(2*pi); 2(3+4) means 2*(3+4).
 // The document editor and semantic evaluator remain independent.
 function startsImplicit(v){return v==='('||v==='pi'||v==='Ans'||/^[A-FMXY]$/.test(v||'')||['sin','cos','tan','asin','acos','atan','sqrt','abs','log','ln','exp','Rnd'].includes(v)}
 function juxtaposition(){let a=unary();while(startsImplicit(peek()))a={type:'binary',op:'*',implicit:true,left:a,right:unary()};return a}
 function product(){let a=juxtaposition();while(['*','/'].includes(peek())){let op=t[i++].value;a={type:'binary',op,left:a,right:juxtaposition()}}return a}
 function sum(){let a=product();while(['+','-'].includes(peek())){let op=t[i++].value;a={type:'binary',op,left:a,right:product()}}return a}
 let ast=sum();if(i!==t.length)throw new CalcError(ERROR.SYNTAX,t[i].pos);return ast}
function sourcePosition(ast){if(Number.isInteger(ast.pos))return ast.pos;if(ast.arg)return sourcePosition(ast.arg);if(ast.left)return sourcePosition(ast.left);return 0}
function evaluate(ast,context){const angle=context.setup?.angle||'DEG';const factor=angle==='DEG'?Math.PI/180:angle==='GRAD'?Math.PI/200:1;
 function walk(a){if(a.type==='group')return walk(a.arg);if(a.type==='number'){if(!a.raw.includes('.'))return rat(BigInt(a.raw));let [left,right]=a.raw.split('.');return rat(BigInt((left||'0')+(right||'')),10n**BigInt(right?.length||0))}
 if(a.type==='symbol')return a.name==='pi'?pi():a.name==='Ans'?context.ans:(context.memory[a.name]||rat(0n));if(a.type==='neg')return neg(walk(a.arg));if(a.type==='binary'){let l=walk(a.left),r=walk(a.right);if(a.op==='/'&&numeric(r)===0)throw new CalcError(ERROR.MATH,sourcePosition(a.right));return {'+':add,'-':sub,'*':mul,'/':div,'^':pow}[a.op](l,r)}if(a.type==='fact'){let x=walk(a.arg);let n=numeric(x);if(!Number.isInteger(n)||n<0||n>69)throw new CalcError(ERROR.MATH);let z=1n;for(let i=2n;i<=BigInt(n);i++)z*=i;return rat(z)}
 let x=walk(a.arg);if(a.name==='sqrt')return sqrt(x);if(a.name==='Rnd'){const D=global.FX991_DECIMAL;let r=decimalRational(x),out=D.format(r.n,r.d,context.setup||{}),q=D.parseDecimal(out);return rat(q.n,q.d)}let v=numeric(x);let trig={sin:()=>Math.sin(v*factor),cos:()=>Math.cos(v*factor),tan:()=>Math.tan(v*factor),asin:()=>Math.asin(v)/factor,acos:()=>Math.acos(v)/factor,atan:()=>Math.atan(v)/factor,abs:()=>Math.abs(v),log:()=>Math.log10(v),ln:()=>Math.log(v),exp:()=>Math.exp(v)};return dec(trig[a.name]())}
 return validateRange(walk(ast))}
function buildDocument(source){return global.FX991_EDITOR?global.FX991_EDITOR.fromSource(source):{kind:'Sequence',id:'root',children:[{kind:'Token',id:'input',value:String(source)}]}}
function buildAst(document){return parse(global.FX991_EDITOR?global.FX991_EDITOR.serialize(document.root?document:{root:document,anchor:{sequenceId:document.id,offset:0}}):document.children.map(x=>x.value||'').join(''))}
function parseComplex(s){let parts=String(s).split(';').map(x=>x.split(',').map(v=>Number(v.trim())));if(parts.length!==2||parts.some(x=>x.length!==2||x.some(v=>!Number.isFinite(v))))throw new CalcError(ERROR.ARGUMENT);let a=parts[0],b=parts[1];return {kind:'complex',re:dec(a[0]+b[0]),im:dec(a[1]+b[1])}}
function baseCalculate(source){let m=String(source).trim().match(/^(BIN|OCT|DEC|HEX)\s*:\s*([0-9A-F]+)\s*(?:(\+|\-|AND|OR|XOR|XNOR)\s*([0-9A-F]+))?$/i);if(!m)throw new CalcError(ERROR.SYNTAX);let radix={BIN:2,OCT:8,DEC:10,HEX:16}[m[1].toUpperCase()];let parseIntRadix=s=>{let v=0n;for(let c of s.toUpperCase()){let x=BigInt(parseInt(c,16));if(x>=BigInt(radix))throw new CalcError(ERROR.SYNTAX);v=v*BigInt(radix)+x}return v};let a=parseIntRadix(m[2]);let b=m[4]?parseIntRadix(m[4]):0n;let op=(m[3]||'').toUpperCase();let z={'':()=>a,'+':()=>a+b,'-':()=>a-b,'AND':()=>a&b,'OR':()=>a|b,'XOR':()=>a^b,'XNOR':()=>~(a^b)}[op]();let bits=radix===2?16n:32n,mask=(1n<<bits)-1n;z&=mask;let width=radix===2?16:radix===16?8:radix===8?11:1;return {kind:'base',value:z,radix,text:z.toString(radix).toUpperCase().padStart(width,'0')}}
// Display preference controls formatting only, never mathematical evaluation.
// MathO = exact natural text; LineO/LineIO = decimal first, S⇔D toggles exact text.
// Physical CASIO glyph placement, fractional thresholds and firmware parity are unverified.
const DISPLAY_STYLES=Object.freeze(['MathO','LineO','LineIO']);
function effectiveDisplayStyle(setup={},mode='COMP'){
 if(['STAT','BASE-N','MATRIX','VECTOR'].includes(mode))return 'LineIO';
 return DISPLAY_STYLES.includes(setup.displayStyle)?setup.displayStyle:'MathO';
}
function mixedFractionText(v){
 if(!v||v.kind!=='rational'||v.d<=1n)return null;
 const whole=v.n/v.d,rem=(v.n<0n?-v.n:v.n)%v.d;
 if(whole===0n||rem===0n)return null;
 const w=String(whole),n=String(rem),d=String(v.d);
 // Manufacturer documents a ten-character mixed fraction conversion limit.
 if(w.length+n.length+d.length+2>10)return null;
 return w+' '+n+'/'+d;
}
function valueDisplay(value,setup={},decimalView=false,mode='COMP'){
 if(value.kind==='complex'){let a=format(value.re,setup,true),b=numeric(value.im);return a+(b<0?' - ':' + ')+format(dec(Math.abs(b)),setup,true)+'i'}
 if(value.kind==='base')return value.text;
 if(value.kind==='mode-result')return value.text;
 const style=effectiveDisplayStyle(setup,mode);
 if(style==='MathO')return format(value,setup,decimalView);
 // Linear output uses the selected Norm/Fix/Sci number format; exact linear
 // text is still reachable by S⇔D, without changing the underlying typed value.
 if(decimalView&&setup.format!=='Fix'&&setup.format!=='Sci'&&value.kind!=='decimal')return valueToString(value);
 return format(value,setup,true);
}
function calculateExpression(mode,source,context){if(mode!=='COMP'&&global.FX991_MODES)return global.FX991_MODES.calculate(mode,source,context);if(mode==='COMP')return evaluate(buildAst(buildDocument(source)),context);if(mode==='CMPLX')return parseComplex(source);if(mode==='BASE-N')return baseCalculate(source);throw new CalcError(ERROR.UNSUPPORTED)}
function createState(model='standard'){const editor=global.FX991_EDITOR;const memory=Object.fromEntries(['A','B','C','D','E','F','M','X','Y'].map(k=>[k,rat(0n)]));return {model,mode:'COMP',view:'edit',menuPage:0,setup:{angle:'DEG',format:'Norm2',digits:3,displayStyle:'MathO'},shift:false,alpha:false,power:true,expression:'',cursor:0,document:editor?editor.create():null,ans:rat(0n),memory,lastValue:null,decimalView:false,mixedView:false,resultScrollX:0,result:'',error:null,errorPos:0,history:[],historyCursor:-1,trace:[]}}
function modeList(state){return MODELS[state.model].modes}
function serialValue(v){if(!v)return null;if(v.kind==='rational')return {kind:v.kind,n:v.n.toString(),d:v.d.toString()};if(v.kind==='pi')return {kind:v.kind,coefficient:serialValue(v.coefficient)};if(v.kind==='radical')return {kind:v.kind,coefficient:serialValue(v.coefficient),radicand:v.radicand.toString()};if(isRadicalSum(v))return {kind:'radical-sum',scalar:serialValue(v.scalar),radicals:v.radicals.map(t=>({radicand:t.radicand.toString(),coefficient:serialValue(t.coefficient)}))};if(v.kind==='mode-result')return {kind:v.kind,text:v.text,ans:serialValue(v.ans),data:v.data};if(v.kind==='complex')return {kind:v.kind,re:serialValue(v.re),im:serialValue(v.im)};if(v.kind==='base')return {kind:'base',value:v.value.toString(),radix:v.radix,text:v.text};if(v.kind==='decimal'&&v.n!==undefined)return {kind:'decimal',value:v.value,n:v.n.toString(),d:v.d.toString()};return v}
function semanticScreen(s){const modes=modeList(s);let message='';if(!s.power)message='OFF';else if(s.view==='mode')message=(s.menuPage===0?modes.slice(0,8).map((m,i)=>(i+1)+':'+m):modes.slice(8).map((m,i)=>(i+1)+':'+m)).join(' ');else if(s.view==='setup')message='1:DEG 2:RAD 3:GRA';else if(s.view==='error')message=s.error;else message=s.result;return {mode:s.mode,view:s.view,expression:s.expression,result:message,displayStyle:effectiveDisplayStyle(s.setup,s.mode),resultValue:s.view==='result'&&s.mode==='COMP'&&!s.mixedView&&effectiveDisplayStyle(s.setup,s.mode)==='MathO'&&!s.decimalView&&s.setup.format!=='Fix'&&s.setup.format!=='Sci'?s.lastValue:null,indicators:[s.setup.angle[0],s.shift?'S':null,s.alpha?'A':null,s.setup.format==='Fix'?'F'+s.setup.digits:s.setup.format==='Sci'?'S'+s.setup.digits:null].filter(Boolean),cursor:s.cursor,resultScrollX:s.resultScrollX||0,document:s.mode==='COMP'&&effectiveDisplayStyle(s.setup,s.mode)!=='LineIO'?s.document:null}}
function dispatchKey(state,key){let s={...state,setup:{...state.setup},memory:{...state.memory},history:state.history.slice(),trace:state.trace.slice()};const E=global.FX991_EDITOR;const sync=()=>{if(E&&s.mode==='COMP'&&s.document){s.expression=E.serialize(s.document);s.cursor=E.sourceCursor(s.document)}};const finish=()=>{sync();s.trace.push({key,mode:s.mode,view:s.view,expression:s.expression,result:s.result});if(s.trace.length>200)s.trace.shift();return s};
 if(key==='ON'){s.power=true;s.view='edit';return finish()}if(!s.power)return finish();if(key==='SHIFT'){s.shift=!s.shift;s.alpha=false;return finish()}if(key==='ALPHA'){s.alpha=!s.alpha;s.shift=false;return finish()}
 if(key==='AC'&&s.shift){s.power=false;s.shift=false;s.view='off';return finish()}
 if(key==='MODE'){s.view=s.shift?'setup':'mode';s.menuPage=0;s.shift=false;s.alpha=false;return finish()}
 if(s.view==='mode'){let modes=modeList(s);
  if(key==='UP'||key==='DOWN'){s.menuPage=key==='DOWN'&&modes.length>8?1:0;return finish()}
  if(/^[1-8]$/.test(key)){
   const n=Number(key),idx=s.menuPage===0?n-1:n+7;
   if(idx>=0&&idx<modes.length){
    s.mode=modes[idx];s.expression='';s.cursor=0;
    if(E)s.document=E.create();s.result='';s.view='edit';s.history=[];s.historyCursor=-1
   }
  }
  if(key==='AC')s.view='edit';return finish()
 }
 if(s.view==='setup'){let selected={1:'DEG',2:'RAD',3:'GRAD'}[key];if(selected){s.setup.angle=selected;s.view='edit'}else if(key==='AC')s.view='edit';return finish()}
 if(s.view==='error'){if(['LEFT','RIGHT'].includes(key)){s.view='edit';s.cursor=Math.max(0,Math.min(s.expression.length,s.errorPos))}else if(key==='AC'){s.expression='';s.cursor=0;s.view='edit';s.result='';s.error=null}return finish()}
 if(key==='AC'){s.expression='';s.cursor=0;if(E)s.document=E.create();s.result='';s.resultScrollX=0;s.mixedView=false;s.view='edit';s.shift=false;s.alpha=false;return finish()}
 if((key==='LEFT'||key==='RIGHT')&&s.view==='result'){
  const D=global.FX991_DISPLAY;
  if(D){const range=D.resultExtent(semanticScreen(s));if(range.maxScroll>0){
   const delta=key==='RIGHT'?16:-16;
   s.resultScrollX=Math.max(0,Math.min(range.maxScroll,(s.resultScrollX||0)+delta));
   return finish()
  }}
 }
  if(key==='LEFT'||key==='RIGHT'){if(E&&s.mode==='COMP'&&s.document)s.document=E.move(s.document,key);else s.cursor=Math.max(0,Math.min(s.expression.length,s.cursor+(key==='RIGHT'?1:-1)));s.view='edit';return finish()}
 if(key==='UP'||key==='DOWN'){if(E&&s.mode==='COMP'&&s.document&&s.view==='edit'){let old=s.document.anchor;s.document=E.move(s.document,key);if(old.sequenceId!==s.document.anchor.sequenceId||old.offset!==s.document.anchor.offset)return finish()}if(s.history.length){let i=s.historyCursor+(key==='UP'?1:-1);s.historyCursor=Math.max(0,Math.min(s.history.length-1,i));s.expression=s.history[s.historyCursor].expression;s.cursor=s.expression.length;if(E)s.document=E.fromSource(s.expression);s.result=s.history[s.historyCursor].display;s.view='edit'}return finish()}
 if(key==='RP'&&E&&s.mode==='COMP'&&s.document){s.document=E.exitSlot(s.document);s.view='edit';s.result='';return finish()}
 if(key==='DEL'){if(E&&s.mode==='COMP'&&s.document)s.document=E.del(s.document);else if(s.cursor>0){s.expression=s.expression.slice(0,s.cursor-1)+s.expression.slice(s.cursor);s.cursor--}s.view='edit';return finish()}
 if(key==='S-D'){if(s.lastValue){s.decimalView=!s.decimalView;s.mixedView=false;s.resultScrollX=0;s.result=valueDisplay(s.lastValue,s.setup,s.decimalView,s.mode)}return finish()}
 if(key==='MIX'&&s.view==='result'&&s.mode==='COMP'&&s.lastValue){
  const exact=(effectiveDisplayStyle(s.setup,s.mode)==='MathO'?!s.decimalView:s.decimalView);
  const mixed=exact&&s.setup.format!=='Fix'&&s.setup.format!=='Sci'?mixedFractionText(s.lastValue):null;
  if(mixed){s.mixedView=!s.mixedView;s.result=s.mixedView?mixed:valueDisplay(s.lastValue,s.setup,s.decimalView,s.mode);s.resultScrollX=0}
  return finish()
 }
 if(key==='STO'){let reg=s.selectedRegister||'A';s.memory[reg]=s.lastValue||s.ans;return finish()}
 if(key==='RCL'){key=s.selectedRegister||'A'}
 if(key==='='){try{sync();if(E&&s.mode==='COMP'&&s.document&&E.invalidSlots(s.document).length){let missing=E.firstMissingAnchor(s.document);throw new CalcError(ERROR.SYNTAX,missing?E.sourceCursor(missing):s.cursor)}if(E&&s.mode==='COMP'&&s.document){
   const examine=(seq)=>{for(const child of seq.children){
     if(child.kind==='MixedFraction'){
       const digits=x=>x.children.every(t=>t.kind==='Token'&&/^[0-9]$/.test(t.value))?
         x.children.map(t=>t.value).join(''):null;
       const whole=digits(child.whole),num=digits(child.numerator),den=digits(child.denominator);
       if(whole===null||num===null||den===null||whole.length>10||num.length>10||den.length>10||
          BigInt(whole||'0')<1n||BigInt(num||'0')<1n||BigInt(den||'0')<=BigInt(num||'0'))
         throw new CalcError(ERROR.ARGUMENT);
     }
     for(const part of ['whole','numerator','denominator','exponent','radicand','degree','argument','body'])
       if(child[part]&&child[part].kind==='Sequence')examine(child[part]);
   }};
   examine(s.document.root);
  }
  let value=calculateExpression(s.mode,s.expression,s);
  // CASIO distinguishes a dedicated fraction template from a ÷ operation.
  // Under LineIO, a fraction-entry template initially displays an exact
  // fraction; S⇔D then toggles to decimal. Ordinary DIV remains decimal-first.
  const hasFraction=(node)=>node&&typeof node==='object'&&
   (node.kind==='Fraction'||node.kind==='MixedFraction'||(node.kind==='Sequence'&&node.children.some(hasFraction))||
    ['whole','numerator','denominator','exponent','radicand','degree','argument','body'].some(k=>node[k]&&hasFraction(node[k])));
  if(s.mode==='COMP'&&effectiveDisplayStyle(s.setup,s.mode)==='LineIO'){
   s.decimalView=!!(E&&s.document&&hasFraction(s.document.root))&&!s.expression.includes('.');
  }
  s.mixedView=false;s.resultScrollX=0;s.lastValue=value;s.ans=value.kind==='mode-result'?value.ans:value.kind==='base'?rat(value.value):value.kind==='complex'?value.re:value;s.result=valueDisplay(value,s.setup,s.decimalView,s.mode);s.view='result';s.error=null;s.history.unshift({expression:s.expression,display:s.result});s.history=s.history.slice(0,50);s.historyCursor=-1}catch(e){s.error=e.code||ERROR.MATH;s.errorPos=Number.isInteger(e.position)?e.position:s.cursor;s.view='error';s.result=s.error}return finish()}
 if(E&&s.mode==='COMP'&&s.document&&['FRAC','MIXIN','POW','SQRT','NROOT','SIN','COS','TAN','LOG','LN','LP'].includes(key)){if(s.shift&&key==='SQRT')key='NROOT';const kinds={FRAC:['Fraction'],MIXIN:['MixedFraction'],POW:['Power'],SQRT:['Root'],NROOT:['Root','nth'],SIN:['Function',s.shift?'asin':'sin'],COS:['Function',s.shift?'acos':'cos'],TAN:['Function',s.shift?'atan':'tan'],LOG:['Function','log'],LN:['Function','ln'],LP:['Group']};s.document=E.template(s.document,...kinds[key]);s.view='edit';s.result='';s.shift=false;s.alpha=false;return finish()}
 let replacements={ADD:'+',SUB:'-',MUL:'*',DIV:'/',NEG:'-',POW:'^',SQ:'^2',SQRT:'sqrt(',PI:'pi',SIN:'sin(',COS:'cos(',TAN:'tan(',LP:'(',RP:')',ANS:'Ans'};
 let literal=replacements[key]||(/^[0-9.]$/.test(key)?key:/^[A-FMXY]$/.test(key)?key:null);
 if(literal!==null){if(s.view==='result'){s.expression='';s.cursor=0;s.resultScrollX=0;s.mixedView=false;if(E)s.document=E.create()}if(E&&s.mode==='COMP'&&s.document)s.document=E.insertToken(s.document,literal);else{s.expression=s.expression.slice(0,s.cursor)+literal+s.expression.slice(s.cursor);s.cursor+=literal.length}s.view='edit';s.result='';s.shift=false;s.alpha=false}return finish();}
const GLYPHS={};function addGlyph(chars,rows){for(const c of chars)GLYPHS[c]=rows} // independent compact atlas
const glyphData={
 '0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','111'],
 'A':['010','101','111','101','101'],'B':['110','101','110','101','110'],'C':['011','100','100','100','011'],'D':['110','101','101','101','110'],'E':['111','100','110','100','111'],'F':['111','100','110','100','100'],'G':['011','100','101','101','011'],'H':['101','101','111','101','101'],'I':['111','010','010','010','111'],'J':['001','001','001','101','010'],'K':['101','101','110','101','101'],'L':['100','100','100','100','111'],'M':['101','111','111','101','101'],'N':['101','111','111','111','101'],'O':['111','101','101','101','111'],'P':['110','101','110','100','100'],'Q':['111','101','101','111','001'],'R':['110','101','110','101','101'],'S':['011','100','010','001','110'],'T':['111','010','010','010','010'],'U':['101','101','101','101','111'],'V':['101','101','101','101','010'],'W':['101','101','111','111','101'],'X':['101','101','010','101','101'],'Y':['101','101','010','010','010'],'Z':['111','001','010','100','111'],
 '+':['000','010','111','010','000'],'-':['000','000','111','000','000'],'/':['001','001','010','100','100'],'*':['000','101','010','101','000'],'=':['000','111','000','111','000'],'.':['000','000','000','000','010'],':':['000','010','000','010','000'],'(':['001','010','010','010','001'],')':['100','010','010','010','100'],'^':['010','101','000','000','000'],'?':['110','001','010','000','010'],' ':['000','000','000','000','000'],'<':['001','010','100','010','001'],'>':['100','010','001','010','100'],'π':['000','111','101','101','101'],'√':['001','001','101','110','100'],'_':['000','000','000','000','111'],'!':['010','010','010','000','010']};
function rasterizeScreen(screen){if(global.FX991_DISPLAY)return global.FX991_DISPLAY.rasterizeScreen(screen);const width=96,height=31,pixels=new Uint8Array(width*height);let put=(x,y)=>{if(x>=0&&x<width&&y>=0&&y<height)pixels[y*width+x]=1};let draw=(str,x,y,max=24)=>{let col=x;for(const c of String(str).slice(0,max)){let rows=glyphData[c]||glyphData[c.toUpperCase()]||glyphData['?'];for(let j=0;j<5;j++)for(let i=0;i<3;i++)if(rows[j][i]==='1')put(col+i,y+j);col+=4;if(col>width-3)break}};
 draw(screen.indicators.join(' ')+' '+screen.mode,0,1,24);for(let x=0;x<96;x++)put(x,8);
 if(screen.view==='mode'||screen.view==='setup'){draw(screen.view.toUpperCase(),0,11,23);draw(screen.result,0,20,23)}else if(screen.view==='off'){draw('OFF',42,14)}else {let offset=Math.max(0,screen.cursor-22),visible=screen.expression.slice(offset,offset+23);draw(visible,0,12,23);if(screen.view==='edit')for(let x=4*(screen.cursor-offset);x<4*(screen.cursor-offset)+3;x++)put(x,18);draw(screen.result.slice(-23),0,23,23)}return pixels}
function frameHash(frame){let h=2166136261;for(const v of frame){h^=v;h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
function runTrace(test){let state=createState(test.model||'standard');for(const k of test.events)state=dispatchKey(state,k);let screen=semanticScreen(state),frame=rasterizeScreen(screen);return {state,screen,hash:frameHash(frame),pixels:frame}}
const api={MODELS,ERROR,CalcError,rat,dec,pi,radicalSum,mixedFractionText,decimalRational,decFromFraction,validateRange,numeric,add,sub,mul,div,pow,sqrt,format,valueToString,tokenize,parse,evaluate,buildDocument,buildAst,calculateExpression,valueDisplay,effectiveDisplayStyle,DISPLAY_STYLES,createState,modeList,dispatchKey,semanticScreen,rasterizeScreen,frameHash,runTrace,serialValue};
global.FX991=Object.freeze(api);
})(typeof window!=='undefined'?window:globalThis);
