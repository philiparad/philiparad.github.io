/** Small expression grammar, no eval or generated JavaScript. */
export function compileExpression(source, variable='x', parameters={},named={}) {
 if(!['x','t'].includes(variable))throw new Error('Unsupported expression variable.');
 if(source.length>400)throw new Error('Use an expression shorter than 400 characters.');
 const tokens=source.toLowerCase().replaceAll('π','pi').match(/(?:\d*\.\d+|\d+\.?\d*)(?:e[+-]?\d+)?|[a-z]+|[+\-*/^(),]|\S/g)||[];let pos=0,depth=0,complexity=source.length;
 const functions={sin:Math.sin,cos:Math.cos,tan:Math.tan,asin:Math.asin,acos:Math.acos,atan:Math.atan,sqrt:Math.sqrt,abs:Math.abs,exp:Math.exp,ln:Math.log,log:Math.log10,floor:Math.floor,ceil:Math.ceil};
 function primary(){if(++depth>40)throw new Error('Expression is too deeply nested.');const t=tokens[pos++];let f;if(t==='('){f=sum();if(tokens[pos++]!==')')throw new Error('Missing closing parenthesis.');}else if(t===variable)f=x=>x;else if(['a','b','c'].includes(t)&&Object.hasOwn(parameters,t)&&Number.isFinite(parameters[t])){const n=parameters[t];f=()=>n;}else if(t==='pi')f=()=>Math.PI;else if(t==='e')f=()=>Math.E;else if(Object.hasOwn(functions,t)||(/^[a-z]+$/.test(t)&&tokens[pos]==='(')){const call=Object.hasOwn(functions,t)?functions[t]:typeof named==='function'?named(t):Object.hasOwn(named,t)?named[t]:null;if(!call)throw new Error('Undefined function: '+t);complexity+=call.complexity||1;if(complexity>4096)throw new Error('Named function expansion is too complex. Simplify repeated references.');if(tokens[pos++]!=='(')throw new Error('Use parentheses after '+t);const a=sum();if(tokens[pos++]!==')')throw new Error('Missing closing parenthesis.');f=x=>call(a(x));}else if(t && /^\d|^\./.test(t) && Number.isFinite(Number(t))){const n=Number(t);f=()=>n;}else throw new Error('Unexpected expression token: '+(t||'end'));depth--;return f;}
 function power(){const a=primary();if(tokens[pos]==='^'){pos++;const b=unary();return x=>a(x)**b(x);}return a;}
 function unary(){if(tokens[pos]==='-'){pos++;const a=unary();return x=>-a(x);}if(tokens[pos]==='+'){pos++;return unary();}return power();}
 function product(){let a=unary();while(['*','/'].includes(tokens[pos])){const op=tokens[pos++],l=a,r=unary();a=op==='*'?x=>l(x)*r(x):x=>l(x)/r(x);}return a;}
 function sum(){let a=product();while(['+','-'].includes(tokens[pos])){const op=tokens[pos++],l=a,r=product();a=op==='+'?x=>l(x)+r(x):x=>l(x)-r(x);}return a;}
 const f=sum();if(pos!==tokens.length)throw new Error('Use * for multiplication, e.g. 2*'+variable+'.');f.complexity=complexity;return f;
}
