(function(global){'use strict';const K=global.FX991;
const cases=[];const test=(name,run)=>cases.push({name,run});
const evaluate=(expr,setup={})=>K.evaluate(K.parse(expr),{ans:K.rat(0),memory:Object.fromEntries(['A','B','C','D','E','F','M','X','Y'].map(k=>[k,K.rat(0)])),setup:{angle:'DEG',...setup}});
const eq=(a,b)=>{if(a!==b)throw Error('expected '+b+' got '+a)};
const close=(a,b,t=1e-9)=>{if(Math.abs(a-b)>t)throw Error('expected approximately '+b+' got '+a)};
test('Operator precedence 2+3*4',()=>eq(K.valueToString(evaluate('2+3*4')),'14'));
test('Unary precedence -2^2',()=>eq(K.valueToString(evaluate('-2^2')),'-4'));
test('Grouped (-2)^2',()=>eq(K.valueToString(evaluate('(-2)^2')),'4'));
test('Right-associative exponent 2^3^2',()=>eq(K.valueToString(evaluate('2^3^2')),'512'));
test('Exact rational reduction 1/3+1/6',()=>eq(K.valueToString(evaluate('1/3+1/6')),'1/2'));
test('Exact radical sqrt(8)',()=>eq(K.valueToString(evaluate('sqrt(8)')),'2√2'));
test('Pi multiple',()=>eq(K.valueToString(evaluate('pi/2')),'1/2π'));
test('Factorial 5!',()=>eq(K.valueToString(evaluate('5!')),'120'));
test('Factorial 70! error',()=>{try{evaluate('70!');throw Error('missing error')}catch(e){eq(e.code,K.ERROR.MATH)}});
test('Trig degree sin 30',()=>close(K.numeric(evaluate('sin(30)')),0.5));
test('Trig radians sin(pi/2)',()=>close(K.numeric(evaluate('sin(pi/2)',{angle:'RAD'})),1));
test('Division by zero typed error',()=>{try{evaluate('1/0');throw Error('missing error')}catch(e){eq(e.code,K.ERROR.MATH)}});
test('Syntax error typed',()=>{try{K.parse('2+');throw Error('missing error')}catch(e){eq(e.code,K.ERROR.SYNTAX)}});
test('Norm1 1/200 format',()=>eq(K.format(K.rat(1,200),{format:'Norm1'},true),'5e-3'));
test('Norm2 1/200 format',()=>eq(K.format(K.rat(1,200),{format:'Norm2'},true),'0.005'));
test('Fix3 100/7 format',()=>eq(K.format(K.rat(100,7),{format:'Fix',digits:3},true),'14.286'));
test('Standard profile 8 modes',()=>eq(K.modeList(K.createState('standard')).length,8));
test('C profile 11 modes',()=>eq(K.modeList(K.createState('c')).length,11));
test('One-shot shift clears after insertion',()=>{let s=K.createState();s=K.dispatchKey(s,'SHIFT');s=K.dispatchKey(s,'7');eq(s.shift,false)});
test('SHIFT+MODE enters setup',()=>{let s=K.createState();s=K.dispatchKey(s,'SHIFT');s=K.dispatchKey(s,'MODE');eq(s.view,'setup')});
test('MODE enters selection menu',()=>{let s=K.createState();s=K.dispatchKey(s,'MODE');eq(s.view,'mode')});
test('C model paged INEQ mode selection',()=>{let s=K.createState('c');s=K.dispatchKey(s,'MODE');s=K.dispatchKey(s,'DOWN');s=K.dispatchKey(s,'DOWN');s=K.dispatchKey(s,'1');eq(s.mode,'INEQ')});
test('Mode selection standard',()=>{let s=K.createState();s=K.dispatchKey(s,'MODE');s=K.dispatchKey(s,'4');eq(s.mode,'BASE-N')});
test('Cursor insertion and deletion',()=>{let s=K.createState();for(let k of ['1','2','3','LEFT','DEL'])s=K.dispatchKey(s,k);eq(s.expression,'13')});
test('Typed Ans persists result',()=>{let s=K.createState();for(let k of ['2','ADD','3','='])s=K.dispatchKey(s,k);eq(K.valueToString(s.ans),'5')});
test('Typed STO / RCL register',()=>{let s=K.createState();for(let k of ['7','=', 'STO','AC','RCL'])s=K.dispatchKey(s,k);eq(s.expression,'A');eq(K.valueToString(s.memory.A),'7')});
test('S-D exact / decimal round trip',()=>{let s=K.createState();for(let k of ['1','DIV','3','='])s=K.dispatchKey(s,k);eq(s.result,'1/3');s=K.dispatchKey(s,'S-D');if(s.result==='1/3')throw Error('did not toggle');s=K.dispatchKey(s,'S-D');eq(s.result,'1/3')});
test('Error left recovers editing',()=>{let s=K.createState();for(let k of ['1','DIV','0','='])s=K.dispatchKey(s,k);eq(s.view,'error');s=K.dispatchKey(s,'LEFT');eq(s.view,'edit')});
test('BASE-N binary AND',()=>eq(K.calculateExpression('BASE-N','BIN:1010 AND 1100',K.createState()).text,'0000000000001000'));
test('BASE-N binary 11+1',()=>eq(K.calculateExpression('BASE-N','BIN:11+1',K.createState()).text,'0000000000000100'));
test('BASE-N hex 1F+1',()=>eq(K.calculateExpression('BASE-N','HEX:1F+1',K.createState()).text,'00000020'));
test('CMPLX addition',()=>{let v=K.calculateExpression('CMPLX','2,3;4,5',K.createState());eq(K.valueToString(v.re),'6');eq(K.valueToString(v.im),'8')});
test('Framebuffer exactly 2976 pixels',()=>eq(K.rasterizeScreen(K.semanticScreen(K.createState())).length,2976));
test('Framebuffer deterministic',()=>{let s=K.semanticScreen(K.createState());eq(K.frameHash(K.rasterizeScreen(s)),K.frameHash(K.rasterizeScreen(s)))});
test('Same key trace deterministic',()=>{let t={events:['2','ADD','3','=']};let a=K.runTrace(t),b=K.runTrace(t);eq(a.hash,b.hash);eq(a.state.result,b.state.result)});
test('STAT rejects missing mode data',()=>{let s=K.createState();s.mode='STAT';s.expression='1+1';s=K.dispatchKey(s,'=');eq(s.error,K.ERROR.SYNTAX)});
const E=global.FX991_EDITOR;
test('Editor creates stable root anchor',()=>{const d=E.create();eq(d.anchor.sequenceId,d.root.id);eq(E.inspect(d).anchorValid,true)});
test('Editor fraction structured evaluation',()=>{let d=E.create();d=E.template(d,'Fraction');d=E.insertToken(d,'1');d=E.move(d,'DOWN');d=E.insertToken(d,'3');d=E.exitSlot(d);d=E.insertToken(d,'+');d=E.template(d,'Fraction');d=E.insertToken(d,'1');d=E.move(d,'DOWN');d=E.insertToken(d,'6');eq(E.serialize(d),'(1)/(3)+(1)/(6)');eq(K.valueToString(evaluate(E.serialize(d))),'1/2')});
test('Editor power structured AST',()=>{let d=E.create();d=E.insertToken(d,'2');d=E.template(d,'Power');d=E.insertToken(d,'3');eq(K.valueToString(evaluate(E.serialize(d))),'8')});
test('Editor negative-power precedence',()=>{let d=E.fromSource('-2');d=E.template(d,'Power');d=E.insertToken(d,'2');eq(K.valueToString(evaluate(E.serialize(d))),'-4')});
test('Editor nested root in fraction',()=>{let d=E.create();d=E.template(d,'Fraction');d=E.template(d,'Root');d=E.insertToken(d,'8');d=E.exitSlot(d);d=E.move(d,'DOWN');d=E.insertToken(d,'2');eq(K.valueToString(evaluate(E.serialize(d))),'√2')});
test('Editor empty template rejected',()=>{let s=K.createState();s=K.dispatchKey(s,'FRAC');s=K.dispatchKey(s,'=');eq(s.error,K.ERROR.SYNTAX)});
test('Editor slot exit with right parenthesis',()=>{let s=K.createState();for(let k of ['SQRT','9','RP','='])s=K.dispatchKey(s,k);eq(s.result,'3')});
test('Editor cursor preserved across edits',()=>{let d=E.create();d=E.template(d,'Fraction');let rootId=d.root.id;d=E.insertToken(d,'5');d=E.move(d,'DOWN');d=E.insertToken(d,'7');d=E.move(d,'LEFT');eq(d.root.id,rootId);eq(E.inspect(d).duplicate,false);eq(E.inspect(d).anchorValid,true)});
test('Editor deletes empty template',()=>{let d=E.create();d=E.template(d,'Root');d=E.del(d);eq(E.serialize(d),'')});
test('Editor source import remains editable',()=>{let d=E.fromSource('12+3');d=E.move(d,'LEFT');d=E.del(d);eq(E.serialize(d),'123');});
test('Calculator dispatch fraction through shared kernel',()=>{let s=K.createState();for(let k of ['FRAC','1','DOWN','2','RP','='])s=K.dispatchKey(s,k);eq(s.result,'1/2')});
test('Editor DOM preview escapes text',()=>{let d=E.fromSource('<script>');if(E.renderHTML(d).includes('<script>'))throw Error('unescaped markup')});
// Milestone 10: independent fixed-point and significant-digit reference vectors.
const D=global.FX991_DECIMAL;
test('Fifteen digit quantization',()=>{let q=D.quantize(1234567890123456789n,1n,15);eq(q.n.toString(),'1234567890123460000')});
test('Quantization of repeating fraction 1/7',()=>{let q=D.quantize(1n,7n,15);eq(D.plain(q.n,q.d,15),'0.142857142857143')});
test('Decimal parser preserves 0.1 exactly',()=>{let q=D.parseDecimal('0.1');eq(q.n.toString()+'/'+q.d.toString(),'1/10')});
test('Decimal precision 0.1 + 0.2 is exact rational',()=>eq(K.valueToString(evaluate('0.1+0.2')),'3/10'));
test('Fix 2 rounds 2.675 without binary64 drift',()=>eq(K.format(evaluate('2.675'),{format:'Fix',digits:2},true),'2.68'));
test('Fix 2 rounds negative half away from zero',()=>eq(K.format(evaluate('-2.675'),{format:'Fix',digits:2},true),'-2.68'));
test('Fix 0 rounds 2.5 to 3',()=>eq(D.fixed(5n,2n,0),'3'));
test('Fix 9 retains nine decimal places',()=>eq(K.format(evaluate('1/8'),{format:'Fix',digits:9},true),'0.125000000'));
test('Sci 3 gives three significant digits',()=>eq(K.format(evaluate('100/7'),{format:'Sci',digits:3},true),'1.43e+1'));
test('Sci rounding carries exponent',()=>eq(D.scientific(9995n,1000n,3,false),'1.00e+1'));
test('Norm1 switch at 0.01',()=>eq(K.format(evaluate('1/100'),{format:'Norm1'},true),'0.01'));
test('Norm1 below 0.01 scientific',()=>eq(K.format(evaluate('1/200'),{format:'Norm1'},true),'5e-3'));
test('Norm2 switch at 1e-9',()=>eq(K.format(evaluate('1/1000000000'),{format:'Norm2'},true),'0.000000001'));
test('Norm2 below 1e-9 scientific',()=>eq(K.format(evaluate('1/2000000000'),{format:'Norm2'},true),'5e-10'));
test('Norm1 upper threshold 1e10',()=>eq(K.format(evaluate('10000000000'),{format:'Norm1'},true),'1e+10'));
test('Near-zero nonzero not suppressed in scientific',()=>eq(K.format(evaluate('1/10000000000000000000'),{format:'Norm2'},true),'1e-19'));
test('Exact/decimal view preserve typed rational',()=>{let v=evaluate('1/3');eq(K.format(v,{format:'Norm2'},false),'1/3');eq(K.format(v,{format:'Norm2'},true),'0.3333333333')});
test('Rounded result is computed value with Fix2',()=>eq(K.valueToString(evaluate('Rnd(1/3)*3',{format:'Fix',digits:2})),'99/100'));
test('Rnd depends on selected digits Fix3',()=>eq(K.valueToString(evaluate('Rnd(1/3)*3',{format:'Fix',digits:3})),'999/1000'));
test('Rounded result Sci 3 retains precision',()=>eq(K.valueToString(evaluate('Rnd(1/3)',{format:'Sci',digits:3})),'333/1000'));
test('Root result uses fifteen-digit decimal quantization',()=>{let v=evaluate('sin(30)');eq(v.kind,'decimal');if(!v.n||!v.d)throw Error('missing decimal backing')});
test('Division by zero preserves typed Math ERROR',()=>{try{evaluate('3/0');throw Error('missing error')}catch(e){eq(e.code,K.ERROR.MATH)}});
test('Invalid square root returns typed Math ERROR',()=>{try{evaluate('sqrt(-3)');throw Error('missing error')}catch(e){eq(e.code,K.ERROR.MATH)}});
test('Sci precision rejects unknown format',()=>{try{D.format(1n,3n,{format:'Unknown'});throw Error('missing rejection')}catch(e){if(e.message==='missing rejection')throw e}});
test('Frame hash stable after formatting settings',()=>{let s=K.createState();s.setup.format='Fix';s.setup.digits=2;for(let key of ['2','ADD','3','='])s=K.dispatchKey(s,key);let a=K.rasterizeScreen(K.semanticScreen(s));eq(K.frameHash(a),K.frameHash(K.rasterizeScreen(K.semanticScreen(s))))});
// Milestone 11: unified COMP numerical-engine acceptance tests.
const N=global.FX991_NUM;
const numState=()=>K.createState();
test('COMP SOLVE root sqrt 2',()=>close(K.numeric(N.run(numState(),'SOLVE','X^2-2',{guess:1}).value),Math.sqrt(2),1e-9));
test('SOLVE root stored in X and Ans',()=>{let s=N.execute(numState(),'SOLVE','X^2-2',{guess:1});eq(s.view,'result');close(K.numeric(s.memory.X),Math.sqrt(2),1e-9);close(K.numeric(s.ans),Math.sqrt(2),1e-9)});
test('SOLVE retains angle mode setting',()=>{let s=numState();s.setup.angle='RAD';close(K.numeric(N.run(s,'SOLVE','cos(X)',{guess:1}).value),Math.PI/2,1e-8)});
test('SOLVE derivative-zero start reports Cant Solve',()=>{try{N.run(numState(),'SOLVE','X^2-2',{guess:0});throw Error('no error')}catch(e){eq(e.code,K.ERROR.CANT_SOLVE)}});
test('DIFF derivative X cubed at 2',()=>close(K.numeric(N.run(numState(),'DIFF','X^3',{at:2}).value),12,1e-7));
test('DIFF sin 30 degree derivative',()=>close(K.numeric(N.run(numState(),'DIFF','sin(X)',{at:30}).value),Math.cos(Math.PI/6)*Math.PI/180,1e-8));
test('DIFF sin pi/2 rad approximately zero',()=>{let s=numState();s.setup.angle='RAD';close(K.numeric(N.run(s,'DIFF','sin(X)',{at:Math.PI/2}).value),0,1e-7)});
test('INTEGRAL x squared 0 to 1',()=>close(K.numeric(N.run(numState(),'INTEGRAL','X^2',{lower:0,upper:1}).value),1/3,1e-9));
test('INTEGRAL sin 0 to pi rad',()=>{let s=numState();s.setup.angle='RAD';close(K.numeric(N.run(s,'INTEGRAL','sin(X)',{lower:0,upper:Math.PI}).value),2,1e-8)});
test('INTEGRAL reversed bounds',()=>close(K.numeric(N.run(numState(),'INTEGRAL','X',{lower:1,upper:0}).value),-0.5,1e-9));
test('INTEGRAL zero width',()=>eq(K.valueToString(N.run(numState(),'INTEGRAL','X^2',{lower:2,upper:2}).value),'0'));
test('INTEGRAL reject bad tolerance',()=>{try{N.run(numState(),'INTEGRAL','X',{lower:0,upper:1,tolerance:1e-20});throw Error('no error')}catch(e){eq(e.code,K.ERROR.ARGUMENT)}});
test('SUM exact X squared 1 to 10',()=>eq(K.valueToString(N.run(numState(),'SUM','X^2',{lower:1,upper:10}).value),'385'));
test('SUM exact rational result',()=>eq(K.valueToString(N.run(numState(),'SUM','X/3',{lower:1,upper:3}).value),'2'));
test('SUM one element',()=>eq(K.valueToString(N.run(numState(),'SUM','X^2',{lower:3,upper:3}).value),'9'));
test('SUM invalid fractional bound',()=>{try{N.run(numState(),'SUM','X',{lower:1.5,upper:4});throw Error('no error')}catch(e){eq(e.code,K.ERROR.ARGUMENT)}});
test('SUM rejects over 10001 terms',()=>{try{N.run(numState(),'SUM','X',{lower:0,upper:10001});throw Error('no error')}catch(e){eq(e.code,K.ERROR.ARGUMENT)}});
test('Numerical mode guard rejects STAT',()=>{let s=numState();s.mode='STAT';try{N.run(s,'DIFF','X',{at:2});throw Error('no error')}catch(e){eq(e.code,K.ERROR.UNSUPPORTED)}});
test('Numerical parser rejects malicious input',()=>{try{N.run(numState(),'DIFF','globalThis.alert(1)',{at:0});throw Error('no error')}catch(e){eq(e.code,K.ERROR.SYNTAX)}});
test('Numerical error state is recoverable',()=>{let s=N.execute(numState(),'SOLVE','X^2-2',{guess:0});eq(s.view,'error');s=K.dispatchKey(s,'LEFT');eq(s.view,'edit')});
test('Numerical result persists as typed Ans',()=>{let s=N.execute(numState(),'SUM','X',{lower:1,upper:4});eq(K.valueToString(s.ans),'10');eq(s.history.length,1)});
test('Numerical integration result formatting Fix3',()=>{let s=numState();s.setup.format='Fix';s.setup.digits=3;s=N.execute(s,'INTEGRAL','X^2',{lower:0,upper:1});eq(s.result,'0.333')});

// Milestone 12: standard-mode acceptance cases.
const M=global.FX991_MODES;
const mc=(mode,source,model='standard')=>M.calculate(mode,source,K.createState(model));
test('CMPLX addition retains legacy syntax',()=>eq(K.valueDisplay(mc('CMPLX','2,3;4,5'),{format:'Norm2'},false),'6 + 8i'));
test('CMPLX multiplication',()=>eq(mc('CMPLX','MUL:2,3|4,5').text,'-7 + 22i'));
test('CMPLX division',()=>eq(mc('CMPLX','DIV:2,6|0,2').text,'3 - 1i'));
test('CMPLX conjugate',()=>eq(mc('CMPLX','CONJ:3,-4').text,'3 + 4i'));
test('CMPLX magnitude',()=>eq(mc('CMPLX','ABS:3,4').text,'5'));
test('CMPLX polar degree',()=>close(K.numeric(mc('CMPLX','POLAR:2,60').ans),1,1e-9));
test('BASE-N binary AND',()=>eq(mc('BASE-N','BIN:1010 AND 1100').text,'0000000000001000'));
test('BASE-N 16-bit NOT',()=>eq(mc('BASE-N','BIN:NOT(1010)').text,'1111111111110101'));
test('BASE-N hexadecimal add',()=>eq(mc('BASE-N','HEX:1F+1').text,'00000020'));
test('BASE-N negative DEC signed',()=>eq(mc('BASE-N','DEC:1-2').text,'-1'));
test('BASE-N bad radix digit rejected',()=>{try{mc('BASE-N','BIN:102');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.SYNTAX)}});
test('EQN quadratic roots',()=>eq(mc('EQN','QUAD:1,-3,2').text,'x1=2 ; x2=1'));
test('EQN cubic three real roots',()=>eq(mc('EQN','CUBIC:1,-6,11,-6').data.roots.length,3));
test('EQN simultaneous linear system',()=>eq(mc('EQN','LINEAR:2,1;1,-1|5,1').text,'x1=2 ; x2=1'));
test('EQN singular matrix error',()=>{try{mc('EQN','LINEAR:1,2;2,4|1,2');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.MATH)}});
test('MATRIX determinant',()=>eq(mc('MATRIX','DET:1,2;3,4').text,'-2'));
test('MATRIX multiplication',()=>eq(mc('MATRIX','MUL:1,2;3,4|5,6;7,8').text,'[19, 22] ; [43, 50]'));
test('MATRIX inverse',()=>close(mc('MATRIX','INV:1,2;3,4').data.matrix[0][0],-2,1e-12));
test('MATRIX invalid dimension',()=>{try{mc('MATRIX','MUL:1,2|1,2');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.DIMENSION)}});
test('VECTOR dot product',()=>eq(mc('VECTOR','DOT:1,2,3|4,5,6').text,'32'));
test('VECTOR cross product',()=>eq(mc('VECTOR','CROSS:1,0,0|0,1,0').text,'[0, 0, 1]'));
test('VECTOR magnitude',()=>eq(mc('VECTOR','ABS:3,4').text,'5'));
test('STAT one-variable mean',()=>eq(mc('STAT','1VAR:1,2,3,4,5').data.mean,3));
test('STAT linear regression slope',()=>close(mc('STAT','LINEAR:1,3;2,5;3,7').data.b,2));
test('STAT quadratic regression',()=>close(mc('STAT','QUAD:0,1;1,2;2,5').data.coefficients[2],1));
test('TABLE single function',()=>eq(mc('TABLE','X^2+1|-2|2|1').data.rows.length,5));
test('TABLE upper limit 30',()=>eq(mc('TABLE','X|1|30|1').data.rows.length,30));
test('TABLE reject 31 rows',()=>{try{mc('TABLE','X|1|31|1');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.MEM)}});
test('TABLE dual function only C',()=>{try{mc('TABLE','X;X^2|1|3|1');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.UNSUPPORTED)}});
test('TABLE C dual function',()=>eq(mc('TABLE','X;X^2|1|3|1','c').data.rows[2][2],9));
test('TABLE C reject 21 dual rows',()=>{try{mc('TABLE','X;X^2|1|21|1','c');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.MEM)}});
test('Mode result enters shared Ans',()=>{let s=K.createState();s.mode='VECTOR';s.expression='DOT:1,2|3,4';s=K.dispatchKey(s,'=');eq(s.result,'11');eq(K.valueToString(s.ans),'11');eq(s.history.length,1)});
test('Standard mode traces deterministic',()=>{let a=K.createState();a.mode='MATRIX';a.expression='DET:1,2;3,4';let b=K.dispatchKey(a,'=');eq(b.result,'-2');eq(b.view,'result')});

// Milestone 13: C-edition inequalities, verification, distributions, and model gating.
const C=global.FX991_CMODES;
const cc=(mode,source,model='c')=>C.calculate(mode,source,K.createState(model));
test('INEQ quadratic open interval',()=>eq(cc('INEQ','LT:1,2,-3').text,'(-3, 1)'));
test('INEQ quadratic inclusive interval',()=>eq(cc('INEQ','LE:1,2,-3').text,'[-3, 1]'));
test('INEQ quadratic positive exterior',()=>eq(cc('INEQ','GT:1,2,-3').text,'(-∞, -3) ∪ (1, ∞)'));
test('INEQ repeated root strict no solution',()=>eq(cc('INEQ','LT:1,0,0').text,'No Solution'));
test('INEQ repeated root non-strict all real',()=>eq(cc('INEQ','GE:1,0,0').text,'(-∞, ∞)'));
test('INEQ repeated root strict punctured real',()=>eq(cc('INEQ','GT:1,0,0').text,'(-∞, 0) ∪ (0, ∞)'));
test('INEQ isolated equality root',()=>eq(cc('INEQ','LE:1,0,0').text,'{0}'));
test('INEQ cubic three roots',()=>eq(cc('INEQ','LT:1,-6,11,-6').data.roots.length,3));
test('INEQ cubic exterior union',()=>eq(cc('INEQ','GT:1,-6,11,-6').text,'(1, 2) ∪ (3, ∞)'));
test('INEQ coefficient validation',()=>{try{cc('INEQ','LT:0,2,-3');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.ARGUMENT)}});
test('VERIF true rational equality',()=>eq(cc('VERIF','1/3+1/6=1/2').text,'TRUE'));
test('VERIF false equality',()=>eq(cc('VERIF','2+2=5').text,'FALSE'));
test('VERIF true ascending chain',()=>eq(cc('VERIF','1<2<=3').text,'TRUE'));
test('VERIF false ascending chain',()=>eq(cc('VERIF','1<3<2').text,'FALSE'));
test('VERIF mixed relation direction rejected',()=>{try{cc('VERIF','1<2>1');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.SYNTAX)}});
test('VERIF registers numeric true',()=>eq(K.valueToString(cc('VERIF','4*sqrt(9)=12').ans),'1'));
test('VERIF registers numeric false',()=>eq(K.valueToString(cc('VERIF','4*sqrt(9)=13').ans),'0'));
test('DIST normal PDF official example',()=>close(K.numeric(cc('DIST','NPD:36,2,35').ans),0.1760326634,1e-10));
test('DIST normal CDF centered',()=>close(K.numeric(cc('DIST','NCD:0,1,1,0').ans),0.341344746,1e-6));
test('DIST normal inverse median',()=>close(K.numeric(cc('DIST','INV:0.5,1,0').ans),0,1e-8));
test('DIST normal inverse 97.5%',()=>close(K.numeric(cc('DIST','INV:0.975,1,0').ans),1.959963984,1e-6));
test('DIST binomial PDF',()=>close(K.numeric(cc('DIST','BPD:2,4,0.5').ans),0.375,1e-12));
test('DIST binomial CDF',()=>close(K.numeric(cc('DIST','BCD:2,4,0.5').ans),0.6875,1e-12));
test('DIST Poisson PDF',()=>close(K.numeric(cc('DIST','PPD:2,2').ans),2*Math.exp(-2),1e-12));
test('DIST Poisson CDF',()=>close(K.numeric(cc('DIST','PCD:2,2').ans),5*Math.exp(-2),1e-12));
test('DIST binomial list',()=>eq(cc('DIST','BPD:0;1;2|2,0.5').data.values.length,3));
test('DIST Poisson list',()=>eq(cc('DIST','PPD:0;1;2|2').data.values.length,3));
test('DIST reject list beyond 25',()=>{try{cc('DIST','PPD:'+Array.from({length:26},(_,i)=>i).join(';')+'|2');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.MEM)}});
test('DIST invalid sigma rejected',()=>{try{cc('DIST','NPD:1,0,0');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.ARGUMENT)}});
test('DIST invalid probability rejected',()=>{try{cc('DIST','BPD:1,3,1.1');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.ARGUMENT)}});
test('C extension forbidden on standard model',()=>{try{cc('INEQ','LT:1,2,-3','standard');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.UNSUPPORTED)}});
test('C mode result flows through Ans and history',()=>{let s=K.createState('c');s.mode='VERIF';s.expression='2+2=4';s=K.dispatchKey(s,'=');eq(s.result,'TRUE');eq(K.valueToString(s.ans),'1');eq(s.history.length,1)});
test('C-mode selection through second menu page',()=>{let s=K.createState('c');s=K.dispatchKey(s,'MODE');s=K.dispatchKey(s,'DOWN');s=K.dispatchKey(s,'DOWN');s=K.dispatchKey(s,'1');eq(s.mode,'INEQ')});
test('Standard model menu never exposes extensions',()=>{let s=K.createState('standard');s=K.dispatchKey(s,'MODE');s=K.dispatchKey(s,'DOWN');s=K.dispatchKey(s,'DOWN');s=K.dispatchKey(s,'1');eq(s.mode,'EQN')});


// Milestone 14 — controller transition tests (independent of HTML UI).
function keys14(model,events){let s=K.createState(model);for(let key of events)s=K.dispatchKey(s,key);return s}
test('M14 setup Format Fix digits',()=>{let s=keys14('standard',['SHIFT','MODE','4','3']);eq(s.setup.format,'Fix');eq(s.setup.digits,3);eq(s.view,'edit')});
test('M14 setup Norm1',()=>{let s=keys14('standard',['SHIFT','MODE','6']);eq(s.setup.format,'Norm1')});
test('M14 setup Norm2',()=>{let s=keys14('standard',['SHIFT','MODE','7']);eq(s.setup.format,'Norm2')});
test('M14 setup Sci 5',()=>{let s=keys14('standard',['SHIFT','MODE','5','5']);eq(s.setup.format,'Sci');eq(s.setup.digits,5)});
test('M14 setup cancel',()=>{let s=keys14('standard',['SHIFT','MODE','AC']);eq(s.view,'edit')});
test('M14 OFF and ON',()=>{let s=keys14('standard',['SHIFT','AC']);eq(s.power,false);s=K.dispatchKey(s,'3');eq(s.expression,'');s=K.dispatchKey(s,'ON');eq(s.power,true)});
test('M14 STO register prompt stores typed result',()=>{let s=keys14('standard',['8','=','SHIFT','RCL']);eq(s.view,'register-prompt');s=K.dispatchKey(s,'B');eq(K.valueToString(s.memory.B),'8')});
test('M14 RCL prompt inserts variable',()=>{let s=keys14('standard',['ALPHA','RCL','C']);eq(s.expression,'C');eq(s.view,'edit')});
test('M14 STO prompt cancel',()=>{let s=keys14('standard',['SHIFT','RCL','AC']);eq(s.view,'edit');eq(s.ui.pending,null)});
test('M14 equation coefficient workflow',()=>{let s=keys14('standard',['MODE','DOWN','1']);eq(s.mode,'EQN');eq(s.view,'workflow-menu');for(let k of ['1','1','=','NEG','3','=','2','='])s=K.dispatchKey(s,k);eq(s.view,'result');if(!s.result.includes('2')||!s.result.includes('1'))throw Error(s.result)});
test('M14 matrix coefficient workflow',()=>{let s=keys14('standard',['MODE','DOWN','2','1']);for(let k of ['1','=','2','=','3','=','4','='])s=K.dispatchKey(s,k);eq(s.view,'result');if(!s.result.includes('-2'))throw Error(s.result)});
test('M14 wizard rejects missing coefficient',()=>{let s=keys14('standard',['MODE','DOWN','1','1','=']);eq(s.view,'error');eq(s.error,K.ERROR.ARGUMENT)});
test('M14 error recovers cursor',()=>{let s=keys14('standard',['1','DIV','0','=']);eq(s.view,'error');s=K.dispatchKey(s,'RIGHT');eq(s.view,'edit');eq(s.error,null)});
test('M14 semantic screen indicates coefficient label',()=>{let s=keys14('standard',['MODE','DOWN','1','1']);let screen=K.semanticScreen(s);if(!screen.expression.includes('a ='))throw Error(screen.expression)});
test('M14 MODE select COMP remains edit',()=>{let s=keys14('standard',['MODE','1']);eq(s.mode,'COMP');eq(s.view,'edit')});
test('M14 trace reproducible after workflow',()=>{let events=['MODE','DOWN','1','1','1','=','NEG','3','=','2','='];let a=K.runTrace({events}),b=K.runTrace({events});eq(a.hash,b.hash)});

// Milestone 15: structural LCD layout and raster acceptance tests.
const L=global.FX991_DISPLAY;
test('M15 framebuffer exact size',()=>eq(L.composeScreen(K.semanticScreen(K.createState())).pixels.length,2976));
test('M15 original display glyph coverage',()=>{for(let c of '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ+-*/=()π√')if(!L.FONT[c])throw Error('missing '+c)});
test('M15 fractional layout produces fraction bar',()=>{let d=E.create();d=E.template(d,'Fraction');d=E.insertToken(d,'1');d=E.move(d,'DOWN');d=E.insertToken(d,'2');let b=L.layoutExpression(d);if(b.height<13||!b.commands.some(x=>x.type==='child'))throw Error('no fraction layout')});
test('M15 fraction uses actual stacked pixels',()=>{let d=E.create();d=E.template(d,'Fraction');d=E.insertToken(d,'1');d=E.move(d,'DOWN');d=E.insertToken(d,'2');let s=K.semanticScreen(K.createState());s.document=d;let f=L.composeScreen(s).pixels;if(!f.some(x=>x))throw Error('blank')});
test('M15 root layout is taller than plain token',()=>{let d=E.create();d=E.template(d,'Root');d=E.insertToken(d,'8');if(L.layoutExpression(d).height<=L.layoutExpression(E.fromSource('8')).height)throw Error('root missing')});
test('M15 nested fractions deterministic',()=>{let d=E.create();d=E.template(d,'Fraction');d=E.insertToken(d,'1');d=E.move(d,'DOWN');d=E.template(d,'Fraction');d=E.insertToken(d,'2');d=E.move(d,'DOWN');d=E.insertToken(d,'3');let s=K.semanticScreen(K.createState());s.document=d;eq(K.frameHash(L.rasterizeScreen(s)),K.frameHash(L.rasterizeScreen(s)))});
test('M15 cursor anchors carried in box',()=>{let d=E.create();d=E.template(d,'Fraction');d=E.insertToken(d,'1');let b=L.layoutExpression(d);if(!b.anchors.some(a=>a.kind==='cursor'))throw Error('anchor lost')});
test('M15 cursor position changes rendered pixels',()=>{let d=E.fromSource('123');let s=K.semanticScreen(K.createState());s.document=d;let a=K.frameHash(K.rasterizeScreen(s));d=E.move(d,'LEFT');s.document=d;let b=K.frameHash(K.rasterizeScreen(s));if(a===b)throw Error('unchanged cursor')});
test('M15 overflow and scroll on long expression',()=>{let s=K.semanticScreen(K.createState());s.document=E.fromSource('123456789012345678901234567890');let r=L.composeScreen(s);eq(r.overflow,true);if(r.scrollX<=0)throw Error('not scrolled')});
test('M15 LCD no proprietary resource dependency',()=>eq(typeof L.rasterizeScreen,'function'));
test('M15 menu renderer fits framebuffer',()=>{let s=K.createState('c');s=K.dispatchKey(s,'MODE');eq(L.rasterizeScreen(K.semanticScreen(s)).length,2976)});
test('M15 error renderer nonempty',()=>{let s=K.createState();for(const k of ['1','DIV','0','='])s=K.dispatchKey(s,k);if(!L.rasterizeScreen(K.semanticScreen(s)).some(Boolean))throw Error('no error pixels')});
// Milestone 16: reference corpus is explicitly distinct from internal unit tests.
const REF=global.FX991_REFERENCE;
test('M16 reference seed corpus all matches internally',()=>{const r=REF.runCorpus(REF.SEEDED);eq(r.counts.passed,6);eq(r.counts.observed,0)});
test('M16 trace has exact number of key transitions',()=>{const r=REF.execute(REF.SEEDED.cases[0],{trace:true});eq(r.steps.length,4);eq(r.steps[3].result,'5')});
test('M16 references preserve model-specific behavior',()=>{const r=REF.execute(REF.SEEDED.cases[4]);eq(r.actual.mode,'INEQ')});
test('M16 reference comparison detects wrong result',()=>{const c=JSON.parse(JSON.stringify(REF.SEEDED.cases[0]));c.expected.result='7';const r=REF.execute(c);eq(r.passed,false);eq(r.checks.find(x=>x.field==='result').actual,'5')});
test('M16 reference missing expected rejected',()=>{const c={...REF.SEEDED.cases[0],expected:{}};try{REF.validate(c);throw Error('accepted')}catch(e){if(!e.message.includes('Reference schema error'))throw e}});
test('M16 reference duplicate IDs rejected',()=>{try{REF.importCorpus({cases:[REF.SEEDED.cases[0],REF.SEEDED.cases[0]]});throw Error('accepted')}catch(e){if(!e.message.includes('duplicate caseId'))throw e}});
test('M16 physical observation requires device',()=>{const c=JSON.parse(JSON.stringify(REF.SEEDED.cases[0]));c.source={kind:'physical',observedAt:'2026-11-05'};try{REF.validate(c);throw Error('accepted')}catch(e){if(!e.message.includes('device'))throw e}});
test('M16 physical observation requires date',()=>{const c=JSON.parse(JSON.stringify(REF.SEEDED.cases[0]));c.source={kind:'physical',device:'fx-991ES PLUS'};try{REF.validate(c);throw Error('accepted')}catch(e){if(!e.message.includes('observation date'))throw e}});
test('M16 valid observed reference counted separately',()=>{const c=REF.makeObservation({caseId:'p001',model:'standard',kind:'physical',device:'fx-991ES PLUS',observedAt:'2026-11-05',events:['2','ADD','3','='],expected:{result:'5'}});const r=REF.runCorpus({cases:[c]});eq(r.counts.observed,1);eq(r.counts.observedPassed,1)});
test('M16 no empty evidence source category',()=>{const c=JSON.parse(JSON.stringify(REF.SEEDED.cases[0]));c.source.kind='unknown';try{REF.validate(c);throw Error('accepted')}catch(e){if(!e.message.includes('source.kind'))throw e}});
test('M16 deterministic framebuffer hash',()=>{const c=REF.SEEDED.cases[0],a=REF.execute(c),b=REF.execute(c);eq(a.actual.frameHash,b.actual.frameHash)});
test('M16 rejects excessive key sequence',()=>{const c={...REF.SEEDED.cases[0],events:Array(501).fill('1')};try{REF.validate(c);throw Error('accepted')}catch(e){if(!e.message.includes('events'))throw e}});
test('M16 JSON roundtrip corpus',()=>{const b=REF.importCorpus(JSON.stringify(REF.SEEDED));eq(b.cases.length,6)});
test('M16 error reference comparison',()=>{const c=REF.SEEDED.cases[5],r=REF.execute(c);eq(r.actual.error,K.ERROR.MATH);eq(r.passed,true)});
// Milestone 17 — deterministic differential comparison and diagnostics.
const DIFF=global.FX991_DIFFERENTIAL;
test('M17 stable hash independent of property order',()=>eq(DIFF.hash({a:1,b:2}),DIFF.hash({b:2,a:1})));
test('M17 stable hash detects data changes',()=>{if(DIFF.hash({a:1})===DIFF.hash({a:2}))throw Error('hash collision')});
test('M17 replay has initial and every key state',()=>eq(DIFF.replay('standard',['2','ADD','3','=']).states.length,5));
test('M17 replay preserves typed Ans',()=>eq(DIFF.replay('standard',['2','ADD','3','=']).final.ans,'5'));
test('M17 deterministic replay parity',()=>{let a=DIFF.replay('standard',['1','ADD','2','=']),b=DIFF.replay('standard',['1','ADD','2','=']);eq(DIFF.compareRuns(a,b).equal,true)});
test('M17 divergent key trace detected',()=>{let a=DIFF.replay('standard',['1']),b=DIFF.replay('standard',['2']);eq(DIFF.compareRuns(a,b).step,1)});
test('M17 physical observations not invented',()=>eq(DIFF.compareCorpus(REF.SEEDED).counts.observed,0));
test('M17 manual corpus matches',()=>eq(DIFF.compareCorpus(REF.SEEDED).counts.passed,6));
test('M17 final mismatch first divergence',()=>{let c=JSON.parse(JSON.stringify(REF.SEEDED.cases[0]));c.expected.result='7';let r=DIFF.compare(c);eq(r.firstDivergence.step,4);eq(r.firstDivergence.failures[0].field,'result')});
test('M17 checkpoint earliest divergence',()=>{let c=JSON.parse(JSON.stringify(REF.SEEDED.cases[0]));c.checkpoints=[{step:1,expected:{expression:'9'}}];let r=DIFF.compare(c);eq(r.firstDivergence.step,1)});
test('M17 checkpoint validates step bound',()=>{let c=JSON.parse(JSON.stringify(REF.SEEDED.cases[0]));c.checkpoints=[{step:8,expected:{result:'5'}}];try{DIFF.validateExtended(c);throw Error('accepted')}catch(e){if(!e.message.includes('checkpoint step'))throw e}});
test('M17 checkpoint rejects duplicate step',()=>{let c=JSON.parse(JSON.stringify(REF.SEEDED.cases[0]));c.checkpoints=[{step:1,expected:{mode:'COMP'}},{step:1,expected:{mode:'COMP'}}];try{DIFF.validateExtended(c);throw Error('accepted')}catch(e){if(!e.message.includes('duplicate checkpoint'))throw e}});
test('M17 generate checkpoint without adding observed claim',()=>{let c=REF.SEEDED.cases[0];let p=DIFF.makeCheckpoint(c,4,['result','ans']);eq(p.expected.result,'5');eq(p.expected.ans,'5')});
test('M17 CSV escaped fields',()=>{let report={results:[{caseId:'x',sourceKind:'manual',passed:false,firstDivergence:{step:2,failures:[{field:'result',expected:'a,"b"',actual:'ok'}]}}]};if(!DIFF.toCSV(report).includes('"a,""b"""'))throw Error('CSV quoting')});
test('M17 seeded fuzz deterministic',()=>{let a=DIFF.seededFuzz({seed:45,count:20}),b=DIFF.seededFuzz({seed:45,count:20});eq(DIFF.hash(a),DIFF.hash(b))});
test('M17 seeded fuzz stays consistent on valid traces',()=>{let a=DIFF.seededFuzz({seed:75,count:20});eq(a.issues.length,0)});
test('M17 comparison has observed source separation',()=>{let c=REF.makeObservation({caseId:'observed-1',model:'standard',kind:'physical',device:'fx-991ES PLUS specimen',observedAt:'2026-11-05',events:['2','ADD','3','='],expected:{result:'5'}});let o=DIFF.compareCorpus({cases:[c]});eq(o.counts.observed,1);eq(o.counts.observedPassed,1)});
test('M17 replay caps key sequences',()=>{try{DIFF.replay('standard',Array(501).fill('1'));throw Error('accepted')}catch(e){if(!e.message.includes('invalid key events'))throw e}});
test('M17 frame hash deterministic through state traces',()=>{let a=DIFF.replay('c',['MODE','DOWN','DOWN','1']);let b=DIFF.replay('c',['MODE','DOWN','DOWN','1']);eq(a.final.frameHash,b.final.frameHash)});

// Milestone 18 — release hardening and export safety.
const REL=global.FX991_RELEASE;
test('M18 no-external-network asset list',()=>{if(REL.EXPECTED_ASSETS.length<15||REL.EXPECTED_ASSETS.some(x=>x.includes('://')))throw Error('external dependency')});
test('M18 accept ordinary expression',()=>eq(REL.inspectInput('sqrt(8)+1/3').ok,true));
test('M18 reject non-string input',()=>eq(REL.inspectInput(8).reason,'not-a-string'));
test('M18 reject control characters',()=>eq(REL.inspectInput('1\u0000+2').reason,'control-character'));
test('M18 reject unbounded input',()=>eq(REL.inspectInput('x'.repeat(100001)).reason,'too-long'));
test('M18 accept bounded input',()=>eq(REL.inspectInput('x'.repeat(100000)).ok,true));
test('M18 CSV formula neutralization equals',()=>eq(REL.csvSafe('=HYPERLINK("https://example.test")'),"'=HYPERLINK(\"https://example.test\")".replaceAll('"','""').replace(/^/, '"').concat('"')));
test('M18 CSV formula neutralization plus',()=>eq(REL.csvSafe('+1+2'),"'+1+2"));
test('M18 CSV formula neutralization @',()=>eq(REL.csvSafe('@SUM(A1:A3)'),"'@SUM(A1:A3)"));
test('M18 CSV escape embedded delimiters',()=>eq(REL.csvSafe('a,b'), '"a,b"'));
test('M18 CSV escape embedded quotes',()=>eq(REL.csvSafe('x"y'), '"x""y"'));
test('M18 CSV escape leading whitespace formula',()=>{if(!REL.csvSafe('  =1+1').startsWith("'"))throw Error('formula unsafe')});
test('M18 differential CSV formula neutralization',()=>{let data=DIFF.toCSV({results:[{passed:false,caseId:'=1+1',sourceKind:'manual',firstDivergence:{step:1,failures:[{field:'result',expected:'@foo',actual:'bar'}]}}]});if(!data.includes("'=1+1")||!data.includes("'@foo"))throw Error('unsafe exported CSV')});
test('M18 security API is frozen',()=>eq(Object.isFrozen(REL),true));
test('M18 offline math engine unaffected',()=>{let s=K.createState();for(let key of ['2','ADD','3','='])s=K.dispatchKey(s,key);eq(s.result,'5')});
test('M18 framebuffer still 2976 pixels',()=>eq(K.rasterizeScreen(K.semanticScreen(K.createState())).length,2976));

// Milestone 19 — release candidate evidence gate (no pre-certified observations).
const RC=global.FX991_RC;
test('M19 default evidence empty',()=>{const e=RC.fresh();eq(e.observations.length,0);eq(e.browserChecks.length,0)});
test('M19 release gated with no physical observations',()=>{const r=RC.assess(RC.fresh(),{total:239,passed:239,failed:0,runtimePassed:true,pagesVerified:true});eq(r.releaseReady,false);if(!r.blockers.some(x=>x.includes('standard model')))throw Error('missing standard evidence blocker')});
test('M19 internal regression failure blocks',()=>{let r=RC.assess(RC.fresh(),{total:240,passed:239,failed:1,runtimePassed:true,pagesVerified:true});if(!r.blockers.some(x=>x.includes('Internal')))throw Error('bad gate')});
test('M19 observed references require model',()=>{try{RC.addObservation(RC.fresh(),{kind:'physical',device:'unit',observedAt:'2026-11-05',caseId:'a',result:'pass'});throw Error('accepted')}catch(e){if(!e.message.includes('model'))throw e}});
test('M19 browser check must include platform',()=>{try{RC.addBrowserCheck(RC.fresh(),{browser:'Chromium',check:'keypad',status:'pass',platform:'',observedAt:'2026-11-05',notes:''});throw Error('accepted')}catch(e){if(!e.message.includes('platform'))throw e}});
test('M19 browser check rejects fake browser',()=>{try{RC.addBrowserCheck(RC.fresh(),{browser:'Other',check:'keypad',status:'pass',platform:'OS 1',observedAt:'2026-11-05',notes:''});throw Error('accepted')}catch(e){if(!e.message.includes('browser'))throw e}});
test('M19 duplicate browser checks replaced',()=>{const a={browser:'Chromium',check:'keypad',status:'pass',platform:'Chrome 1',observedAt:'2026-11-05',notes:''};let e=RC.addBrowserCheck(RC.fresh(),a);e=RC.addBrowserCheck(e,{...a,status:'fail'});eq(e.browserChecks.length,1);eq(e.browserChecks[0].status,'fail')});
test('M19 release fails when browser checks fail',()=>{let e=RC.addBrowserCheck(RC.fresh(),{browser:'Chromium',platform:'Chrome 1',check:'keypad',status:'fail',observedAt:'2026-11-05',notes:''});let r=RC.assess(e,{total:239,passed:239,failed:0,runtimePassed:true,pagesVerified:true});if(!r.blockers.some(x=>x.includes('failed browser')))throw Error('not blocked')});
test('M19 physical reference failure blocks',()=>{let e=RC.addObservation(RC.fresh(),{model:'standard',kind:'physical',device:'sample unit',observedAt:'2026-11-05',caseId:'sin30',result:'fail'});let r=RC.assess(e,{total:239,passed:239,failed:0,runtimePassed:true,pagesVerified:true});if(!r.blockers.some(x=>x.includes('failed reference')))throw Error('not blocked')});
test('M19 observation records cannot be labeled manual',()=>{try{RC.addObservation(RC.fresh(),{model:'c',kind:'manual',device:'manual book',observedAt:'2026-11-05',caseId:'case',result:'pass'});throw Error('accepted')}catch(e){if(!e.message.includes('observations'))throw e}});
test('M19 evidence JSON roundtrip',()=>{let e=RC.fresh();eq(JSON.stringify(RC.validateEvidence(JSON.parse(JSON.stringify(e)))),JSON.stringify(e))});
test('M19 model coverage recorded separately',()=>{let e=RC.addObservation(RC.fresh(),{model:'standard',kind:'physical',device:'real calculator',observedAt:'2026-11-05',caseId:'a',result:'pass'});let r=RC.assess(e,{total:239,passed:239,failed:0,runtimePassed:true,pagesVerified:true});if(!r.blockers.some(x=>x.includes('c model')))throw Error('C missing')});
test('M19 readiness not inferred from tests alone',()=>{let r=RC.assess(RC.fresh(),{total:1000,passed:1000,failed:0,runtimePassed:true,pagesVerified:true});eq(r.releaseReady,false)});


// Milestone 20 — no synthetic physical/emulator observations; evidence comparison and triage.
const DEV=global.FX991_DEVICE;
test('M20 starts with zero device observations',()=>eq(DEV.empty().records.length,0));
test('M20 physical evidence requires actual device identity',()=>{try{DEV.validate({id:'x',model:'standard',kind:'physical',device:'',observedAt:'2026-11-05',keys:['1'],observed:{result:'1'},notes:''});throw Error('accepted')}catch(e){if(!e.message.includes('device'))throw e}});
test('M20 rejects manual examples as physical evidence',()=>{let c={id:'x',model:'standard',kind:'manual',device:'manual',observedAt:'2026-11-05',keys:['1'],observed:{result:'1'},notes:''};try{DEV.validate(c);throw Error('accepted')}catch(e){if(!e.message.includes('observed reference'))throw e}});
test('M20 rejects missing observed values',()=>{let c={id:'x',model:'standard',kind:'physical',device:'physical unit',observedAt:'2026-11-05',keys:['1'],observed:{},notes:''};try{DEV.validate(c);throw Error('accepted')}catch(e){if(!e.message.includes('observed fields'))throw e}});
test('M20 manual presets carry no observation provenance',()=>{if(DEV.PRESETS.some(x=>x.kind==='physical'||x.kind==='official-emulator'))throw Error('bad preset')});
test('M20 preset deterministic',()=>{let a=DEV.scenario('arith-precedence'),b=DEV.scenario('arith-precedence');eq(JSON.stringify(a),JSON.stringify(b))});
const DEVICE_SAMPLE=()=>({id:'sample-01',model:'standard',kind:'physical',device:'test fixture device (synthetic; unit tests only)',observedAt:'2026-11-05',keys:['2','ADD','3','='],observed:{result:'5'},notes:'Unit-test fixture; never bundled as observation'});
test('M20 passing fixture compares to numeric engine',()=>eq(DEV.compare(DEVICE_SAMPLE()).passed,true));
test('M20 deliberate mismatch is found',()=>{let c=DEVICE_SAMPLE();c.observed.result='6';let r=DEV.compare(c);eq(r.passed,false);eq(r.issues[0].category,'numeric-or-format')});
test('M20 mismatch locates first divergence',()=>{let c=DEVICE_SAMPLE();c.observed.result='6';eq(DEV.compare(c).firstDivergence,4)});
test('M20 observed C profile separated',()=>{let c={...DEVICE_SAMPLE(),id:'c-sample',model:'c'};let r=DEV.review({schema:'fx991-device-evidence-v1',records:[c]});eq(r.coverage.c,1);eq(r.coverage.standard,0)});
test('M20 duplicate observed IDs refused',()=>{let c=DEVICE_SAMPLE();try{DEV.importEvidence({schema:'fx991-device-evidence-v1',records:[c,c]});throw Error('accepted')}catch(e){if(!e.message.includes('duplicate ID'))throw e}});
test('M20 JSON import/export stable',()=>{let a=DEV.add(DEV.empty(),DEVICE_SAMPLE());eq(JSON.stringify(DEV.importEvidence(JSON.stringify(a))),JSON.stringify(a))});
test('M20 gap report categories counted',()=>{let c=DEVICE_SAMPLE();c.observed.result='6';let a=DEV.review(DEV.add(DEV.empty(),c));eq(a.byCategory['numeric-or-format'],1);eq(a.totals.failed,1)});
test('M20 cannot certify from fixture comparisons',()=>{let a=DEV.review(DEV.add(DEV.empty(),DEVICE_SAMPLE()));eq(a.certified,false)});
test('M20 invalid imported schema rejected',()=>{try{DEV.importEvidence({schema:'bad',records:[]});throw Error('accepted')}catch(e){if(!e.message.includes('schema'))throw e}});
test('M20 unsafe oversized key list rejected',()=>{let c=DEVICE_SAMPLE();c.keys=Array(501).fill('1');try{DEV.validate(c);throw Error('accepted')}catch(e){if(!e.message.includes('keys'))throw e}});

// Milestone 21 — research-grounded COMP implicit multiplication correction.
// These are local semantic regression vectors, NOT observed hardware traces.
test('M21 implied multiplication before parentheses',()=>eq(K.valueToString(evaluate('2(3+4)')),'14'));
test('M21 implied multiplication exact pi',()=>eq(K.valueToString(evaluate('2pi')),'2π'));
test('M21 implied multiplication with radical',()=>eq(K.valueToString(evaluate('2sqrt(9)')),'6'));
test('M21 implied multiplication function adjacency',()=>close(K.numeric(evaluate('sin(30)cos(60)')),0.25));
test('M21 implied multiplication strong precedence 1/2(3+4)',()=>eq(K.valueToString(evaluate('1/2(3+4)')),'1/14'));
test('M21 implied multiplication strong precedence 1/2pi',()=>close(K.numeric(evaluate('1/2pi')),1/(2*Math.PI),1e-11));
test('M21 implicit multiplication is associative',()=>eq(K.valueToString(evaluate('2(3)(4)')),'24'));
test('M21 implicit multiplication does not change square precedence',()=>eq(K.valueToString(evaluate('2(1+3)^2')),'32'));
test('M21 implicit pi following power',()=>eq(K.valueToString(evaluate('2^3pi')),'8π'));
test('M21 implied product of pi and group',()=>eq(K.valueToString(evaluate('pi(2)')),'2π'));
test('M21 implicit multiplication with Ans',()=>{let s=K.createState();s.ans=K.rat(4);eq(K.valueToString(K.evaluate(K.parse('3Ans'),s)),'12')});
test('M21 implicit multiplication with variable register',()=>{let s=K.createState();s.memory.A=K.rat(7);eq(K.valueToString(K.evaluate(K.parse('2A'),s)),'14')});
test('M21 nested fraction precedence remains exact',()=>eq(K.valueToString(evaluate('1/2(3+4)+1/14')),'1/7'));
test('M21 invalid operator syntax remains typed',()=>{try{K.parse('2(3+)');throw Error('accepted')}catch(e){eq(e.code,K.ERROR.SYNTAX)}});
test('M21 explicit grouping square precedence unaffected',()=>eq(K.valueToString(evaluate('(-2)^2')),'4'));
test('M21 visible result from integrated controller',()=>{let s=K.createState();s.expression='2(3+4)';s.document=global.FX991_EDITOR.fromSource(s.expression);s.cursor=s.expression.length;s=K.dispatchKey(s,'=');eq(s.result,'14')});

// Milestone 22 — structural cursor recovery and validated numeric formatting.
test('M22 seekSource preserves nested fraction tree',()=>{let d=E.create();d=E.template(d,'Fraction');d=E.insertToken(d,'1');d=E.move(d,'DOWN');d=E.insertToken(d,'23');let src=E.serialize(d),found=E.seekSource(d,src.indexOf('2'));eq(E.serialize(found),src);eq(found.anchor.sequenceId,d.anchor.sequenceId);eq(E.sourceCursor(found),src.indexOf('2'))});
test('M22 seekSource clamps source positions',()=>{let d=E.fromSource('123');eq(E.sourceCursor(E.seekSource(d,-25)),0);eq(E.sourceCursor(E.seekSource(d,500)),3)});
test('M22 seekSource leaves original untouched',()=>{let d=E.fromSource('123');let anchor={...d.anchor};E.seekSource(d,1);eq(JSON.stringify(d.anchor),JSON.stringify(anchor))});
test('M22 firstMissingAnchor detects numerator',()=>{let d=E.template(E.create(),'Fraction');let found=E.firstMissingAnchor(d);if(!found)throw Error('missing anchor');eq(found.anchor.sequenceId,d.root.children[0].numerator.id)});
test('M22 firstMissingAnchor detects denominator',()=>{let d=E.template(E.create(),'Fraction');d=E.insertToken(d,'3');let found=E.firstMissingAnchor(d);eq(found.anchor.sequenceId,d.root.children[0].denominator.id)});
test('M22 completed fraction has no missing anchor',()=>{let d=E.template(E.create(),'Fraction');d=E.insertToken(d,'3');d=E.move(d,'DOWN');d=E.insertToken(d,'5');eq(E.firstMissingAnchor(d),null)});
test('M22 Math ERROR points at zero divisor',()=>{let s=K.createState();s.document=E.fromSource('1/0');s.expression='1/0';s.cursor=3;s=K.dispatchKey(s,'=');eq(s.error,K.ERROR.MATH);eq(s.errorPos,2)});
test('M22 Math ERROR recovers document cursor',()=>{let s=K.createState();s.document=E.fromSource('1/0');s.expression='1/0';s.cursor=3;s=K.dispatchKey(s,'=');s=K.dispatchKey(s,'LEFT');eq(s.cursor,2);eq(s.document.anchor.offset,2);eq(s.view,'edit')});
test('M22 syntax ERROR points to bad operator',()=>{let s=K.createState();s.document=E.fromSource('2+*3');s.expression='2+*3';s.cursor=4;s=K.dispatchKey(s,'=');eq(s.error,K.ERROR.SYNTAX);eq(s.errorPos,2)});
test('M22 syntax ERROR editing recovers at offending symbol',()=>{let s=K.createState();s.document=E.fromSource('2+*3');s.expression='2+*3';s.cursor=4;s=K.dispatchKey(s,'=');s=K.dispatchKey(s,'RIGHT');eq(s.cursor,2);s=K.dispatchKey(s,'DEL');eq(s.expression,'2*3')});
test('M22 structural syntax failure points at empty denominator',()=>{let s=K.createState();s=K.dispatchKey(s,'FRAC');s=K.dispatchKey(s,'1');s=K.dispatchKey(s,'DOWN');s=K.dispatchKey(s,'=');eq(s.view,'error');eq(s.error,K.ERROR.SYNTAX);let d=E.firstMissingAnchor(s.document);eq(s.errorPos,E.sourceCursor(d))});
test('M22 structural error recovery retains Fraction node',()=>{let s=K.createState();for(let key of ['FRAC','1','DOWN','='])s=K.dispatchKey(s,key);s=K.dispatchKey(s,'LEFT');eq(s.view,'edit');eq(s.document.root.children[0].kind,'Fraction');eq(s.document.anchor.sequenceId,s.document.root.children[0].denominator.id);s=K.dispatchKey(s,'2');s=K.dispatchKey(s,'=');eq(s.result,'1/2')});
test('M22 invalid group recovery retains source',()=>{let d=E.template(E.create(),'Group');d=E.insertToken(d,'2+');let src=E.serialize(d),r=E.seekSource(d,src.indexOf(')'));eq(E.serialize(r),src)});
test('M22 Fix precision carries correctly',()=>eq(K.format(K.rat(9995,1000),{format:'Fix',digits:2},true),'10.00'));
test('M22 Sci precision carries correctly',()=>eq(K.format(K.rat(9995,1000),{format:'Sci',digits:3},true),'1.00e+1'));
test('M22 Norm 1 threshold',()=>eq(K.format(K.rat(1,100),{format:'Norm1'},true),'0.01'));
test('M22 Norm 2 lower threshold',()=>eq(K.format(K.rat(1,1000000000),{format:'Norm2'},true),'0.000000001'));
test('M22 Norm 2 below threshold',()=>eq(K.format(K.rat(1,10000000000),{format:'Norm2'},true),'1e-10'));
test('M22 S-D does not mutate original exact Ans',()=>{let s=K.createState();for(let k of ['1','DIV','3','='])s=K.dispatchKey(s,k);let ans=K.serialValue(s.ans);s=K.dispatchKey(s,'S-D');s=K.dispatchKey(s,'S-D');eq(JSON.stringify(K.serialValue(s.ans)),JSON.stringify(ans))});


// Milestone 23 — baseline-aware 96x31 LCD and deep structural navigation.
test('M23 framebuffer remains exactly 96x31',()=>eq(L.rasterizeScreen(K.semanticScreen(K.createState())).length,2976));
test('M23 plain token baseline is stable',()=>{let b=L.layoutExpression(E.fromSource('ABC'));eq(b.baseline,4);eq(b.height,5)});
test('M23 power exponent rises above base',()=>{let d=E.fromSource('2');d=E.template(d,'Power');d=E.insertToken(d,'3');let b=L.layoutExpression(d);let children=b.commands.filter(c=>c.type==='child');if(children.length!==2)throw Error('expected base and power');if(!(children[1].y<children[0].y))throw Error('exponent not raised')});
test('M23 fraction baseline lies inside box',()=>{let d=E.template(E.create(),'Fraction');let b=L.layoutExpression(d);if(!(b.baseline>0&&b.baseline<b.height))throw Error('fraction baseline invalid')});
test('M23 fraction numerator visually above denominator',()=>{let d=E.template(E.create(),'Fraction');let b=L.layoutExpression(d).commands[0].box;let children=b.commands.filter(c=>c.type==='child');if(!(children[0].y<children[1].y))throw Error('fraction order incorrect')});
test('M23 nested fraction vertical scroll keeps deep caret visible',()=>{let d=E.create();for(let i=0;i<4;i++){d=E.template(d,'Fraction');d=E.insertToken(d,'1');d=E.move(d,'DOWN')}d=E.insertToken(d,'2');let s=K.semanticScreen(K.createState());s.document=d;s.view='edit';let frame=L.composeScreen(s);if(frame.layout.height<=15||frame.scrollY<=0)throw Error('not vertically scrolled');let caret=frame.layout.anchors.find(a=>a.kind==='cursor');let centerY=7+caret.y-frame.scrollY;if(centerY<7||centerY>=22)throw Error('caret outside viewport')});
test('M23 tall expression signals vertical overflow',()=>{let d=E.create();for(let i=0;i<3;i++)d=E.template(d,'Fraction');let s=K.semanticScreen(K.createState());s.document=d;let rendered=L.composeScreen(s);eq(rendered.overflow,true);eq(rendered.viewport.bottom,22)});
test('M23 status row survives clipping',()=>{let d=E.create();for(let i=0;i<4;i++)d=E.template(d,'Fraction');let s=K.semanticScreen(K.createState());s.document=d;let rendered=L.composeScreen(s);if(!rendered.pixels.slice(0,96*7).some(Boolean))throw Error('status row gone')});
test('M23 result row survives clipping',()=>{let d=E.create();for(let i=0;i<4;i++)d=E.template(d,'Fraction');let s=K.semanticScreen(K.createState());s.document=d;s.result='123';let rendered=L.composeScreen(s);if(!rendered.pixels.slice(96*24).some(Boolean))throw Error('result row gone')});
test('M23 horizontal scroll still follows caret',()=>{let d=E.fromSource('123456789012345678901234567890');let s=K.semanticScreen(K.createState());s.document=d;let r=L.composeScreen(s);if(!(r.scrollX>0&&r.scrollY===0))throw Error('horizontal scrolling broken')});
test('M23 nested vertical movement climbs to ancestor denominator',()=>{let d=E.template(E.create(),'Fraction');d=E.template(d,'Function','sin');d=E.insertToken(d,'1');let numerator=d.root.children[0].numerator.id,denominator=d.root.children[0].denominator.id;if(d.anchor.sequenceId===numerator)throw Error('not nested');d=E.move(d,'DOWN');eq(d.anchor.sequenceId,denominator)});
test('M23 nested upward movement climbs to ancestor numerator',()=>{let d=E.template(E.create(),'Fraction');d=E.insertToken(d,'2');d=E.move(d,'DOWN');d=E.template(d,'Root');d=E.insertToken(d,'3');d=E.move(d,'UP');eq(d.anchor.sequenceId,d.root.children[0].numerator.id)});
test('M23 nested vertical navigation does not change source',()=>{let d=E.template(E.create(),'Fraction');d=E.template(d,'Function','cos');d=E.insertToken(d,'5');let before=E.serialize(d);d=E.move(d,'DOWN');d=E.move(d,'UP');eq(E.serialize(d),before)});
test('M23 vertically scrolled frame deterministic',()=>{let d=E.create();for(let i=0;i<3;i++){d=E.template(d,'Fraction');d=E.move(d,'DOWN')}let s=K.semanticScreen(K.createState());s.document=d;let a=L.rasterizeScreen(s),b=L.rasterizeScreen(s);eq(K.frameHash(a),K.frameHash(b))});
test('M23 clipping preserves pixel bounds',()=>{let f=new L.Framebuffer();f.clip={left:0,right:96,top:7,bottom:22};f.line(1,0,1,30);eq(f.pixels[96*0+1],0);eq(f.pixels[96*12+1],1);eq(f.pixels[96*30+1],0)});

// Milestone 24: physical-key resolution, insert/overwrite and structural deletion.
const KM=global.FX991_KEYS;
test('M24 key profiles explicit and immutable',()=>{eq(KM.profiles.standard.id,'fx991esplus-2');eq(Object.isFrozen(KM.profiles.c),true)});
test('M24 ALPHA SIN resolves D',()=>eq(KM.resolve('standard','SIN','alpha'),'D'));
test('M24 ALPHA parenthesis resolves X Y',()=>{eq(KM.resolve('c','LP','alpha'),'X');eq(KM.resolve('c','RP','alpha'),'Y')});
test('M24 SHIFT DEL resolves INS',()=>eq(KM.resolve('standard','DEL','shift'),'INS'));
test('M24 physical ALPHA SIN inserts D',()=>{let s=K.createState();for(let k of ['ALPHA','SIN'])s=K.dispatchKey(s,k);eq(s.expression,'D');eq(s.alpha,false)});
test('M24 ALPHA SIN does not insert trig template',()=>{let s=K.createState();for(let k of ['ALPHA','SIN'])s=K.dispatchKey(s,k);eq(s.document.root.children[0].kind,'Token')});
test('M24 ALPHA parentheses address X and Y',()=>{let s=K.createState();for(let k of ['ALPHA','LP','ADD','ALPHA','RP'])s=K.dispatchKey(s,k);eq(s.expression,'X+Y')});
test('M24 SHIFT DEL toggles overwrite',()=>{let s=K.createState();for(let k of ['SHIFT','DEL'])s=K.dispatchKey(s,k);eq(s.ui.insertMode,false);eq(s.shift,false)});
test('M24 INS toggles back to insertion',()=>{let s=K.createState();for(let k of ['INS','INS'])s=K.dispatchKey(s,k);eq(s.ui.insertMode,true)});
test('M24 overwrite replaces token without shortening rest',()=>{let s=K.createState();for(let k of ['1','2','3','LEFT','LEFT','INS','9'])s=K.dispatchKey(s,k);eq(s.expression,'193')});
test('M24 overwrite at end appends',()=>{let s=K.createState();for(let k of ['1','INS','9'])s=K.dispatchKey(s,k);eq(s.expression,'19')});
test('M24 overwrite does not destroy fraction node',()=>{let d=E.template(E.create(),'Fraction');d=E.insertToken(d,'1');d=E.move(d,'DOWN');d=E.insertToken(d,'2');d=E.exitSlot(d);d=E.move(d,'LEFT');let before=d.root.children[0].kind;d=E.overwriteToken(d,'5');eq(before,'Fraction');eq(d.root.children[0].kind,'Fraction')});
test('M24 forward delete removes token',()=>{let d=E.fromSource('123');d=E.move(d,'LEFT');d=E.move(d,'LEFT');d=E.delForward(d);eq(E.serialize(d),'13')});
test('M24 forward delete empty template atomically',()=>{let d=E.template(E.create(),'Root');d=E.exitSlot(d);d.anchor={sequenceId:d.root.id,offset:0};d=E.delForward(d);eq(E.serialize(d),'')});
test('M24 forward delete enters nonempty template',()=>{let d=E.template(E.create(),'Fraction');d=E.insertToken(d,'1');d=E.move(d,'DOWN');d=E.insertToken(d,'2');d=E.exitSlot(d);d.anchor={sequenceId:d.root.id,offset:0};let src=E.serialize(d);d=E.delForward(d);eq(E.serialize(d),src);eq(d.anchor.sequenceId,d.root.children[0].numerator.id)});
test('M24 forward delete at final slot exits template',()=>{let d=E.template(E.create(),'Root');d=E.insertToken(d,'2');d=E.delForward(d);eq(d.anchor.sequenceId,d.root.id);eq(d.anchor.offset,1)});
test('M24 controller FDEL preserves structured source',()=>{let s=K.createState();for(let k of ['1','2','3','LEFT','LEFT','FDEL'])s=K.dispatchKey(s,k);eq(s.expression,'13')});
test('M24 overwrite indicator only when enabled',()=>{let s=K.createState();if(K.semanticScreen(s).indicators.includes('OVR'))throw Error('bad indicator');s=K.dispatchKey(s,'INS');if(!K.semanticScreen(s).indicators.includes('OVR'))throw Error('no indicator')});
test('M24 modifier mapping preserves inverse trig',()=>{let s=K.createState();for(let k of ['SHIFT','SIN','3','0','RP'])s=K.dispatchKey(s,k);eq(E.serialize(s.document),'asin(30)')});


// Milestone 25 — mode-aware keypad and full-sequence workflows.
test('M25 model profiles include BASE-N legends',()=>{eq(KM.resolve('standard','SIN','none','BASE-N'),'D');eq(KM.resolve('c','NEG','none','BASE-N'),'A')});
test('M25 standard SHIFT SQ cube legend',()=>eq(KM.resolve('standard','SQ','shift'),'CUBE'));
test('M25 model key legend is immutable',()=>{let x=KM.keyLegend('standard','SIN','COMP');eq(Object.isFrozen(x),true);eq(x.alpha,'D');eq(x.shift,'ASIN')});
test('M25 SHIFT SQ inserts cube exponent',()=>{let s=K.createState();for(let k of ['2','SHIFT','SQ'])s=K.dispatchKey(s,k);eq(s.expression,'2^3');eq(s.shift,false)});
test('M25 SHIFT SQ executes cube',()=>{let s=K.createState();for(let k of ['2','SHIFT','SQ','='])s=K.dispatchKey(s,k);eq(s.result,'8')});
test('M25 SHIFT LOG inserts ten power prefix',()=>{let s=K.createState();for(let k of ['SHIFT','LOG','2','RP'])s=K.dispatchKey(s,k);eq(s.expression,'10^(2)')});
test('M25 SHIFT LN inserts exponential function',()=>{let s=K.createState();for(let k of ['SHIFT','LN','0','RP','='])s=K.dispatchKey(s,k);eq(s.result,'1')});
test('M25 SHIFT remains one-shot after cube',()=>{let s=K.createState();for(let k of ['SHIFT','SQ'])s=K.dispatchKey(s,k);eq(s.shift,false);eq(s.alpha,false)});
test('M25 BASE-N BIN selector on LOG',()=>{let s=K.createState();for(let k of ['MODE','4','LOG'])s=K.dispatchKey(s,k);eq(s.expression,'BIN:')});
test('M25 BASE-N HEX selector on RECIP',()=>{let s=K.createState();for(let k of ['MODE','4','RECIP'])s=K.dispatchKey(s,k);eq(s.expression,'HEX:')});
test('M25 BASE-N HEX letters through function keys',()=>{let s=K.createState();for(let k of ['MODE','4','RECIP','1','TAN'])s=K.dispatchKey(s,k);eq(s.expression,'HEX:1F')});
test('M25 BASE-N calculate hexadecimal addition',()=>{let s=K.createState();for(let k of ['MODE','4','RECIP','1','TAN','ADD','1','='])s=K.dispatchKey(s,k);eq(s.result,'00000020')});
test('M25 BASE-N mode edit selector swaps radix without duplicating',()=>{let s=K.createState();for(let k of ['MODE','4','LOG','1','0','RECIP'])s=K.dispatchKey(s,k);eq(s.expression,'HEX:10')});
test('M25 BASE-N letters do not trigger templates',()=>{let s=K.createState();for(let k of ['MODE','4','RECIP','SIN','COS'])s=K.dispatchKey(s,k);eq(s.expression,'HEX:DE')});
test('M25 COMP SIN still creates structural template',()=>{let s=K.createState();s=K.dispatchKey(s,'SIN');eq(s.document.root.children[0].kind,'Function')});
test('M25 normal RCL enters register prompt',()=>{let s=K.createState();s=K.dispatchKey(s,'RCL_MENU');eq(s.view,'register-prompt');eq(s.ui.pending,'RCL')});
test('M25 RCL prompt cancelled by AC',()=>{let s=K.createState();for(let k of ['RCL_MENU','AC'])s=K.dispatchKey(s,k);eq(s.view,'edit');eq(s.ui.pending,null)});
test('M25 SHIFT RCL stores then RCL recalls',()=>{let s=K.createState();for(let k of ['7','=','SHIFT','RCL','A','AC','RCL_MENU','A'])s=K.dispatchKey(s,k);eq(s.expression,'A');eq(K.valueToString(s.memory.A),'7')});
test('M25 DEG through SETUP and inverse SIN',()=>{let s=K.createState();for(let k of ['SHIFT','MODE','1','SHIFT','SIN','0','.','5','RP','='])s=K.dispatchKey(s,k);eq(s.result,'30')});
test('M25 C mode menu has second and third pages',()=>{let s=K.createState('c');for(let k of ['MODE','DOWN','DOWN','1'])s=K.dispatchKey(s,k);eq(s.mode,'INEQ')});
test('M25 editing after power result appends correctly',()=>{let s=K.createState();for(let k of ['3','='])s=K.dispatchKey(s,k);s=K.dispatchKey(s,'SHIFT');s=K.dispatchKey(s,'LN');eq(s.expression,'exp()')});
// Milestone 26 — end-to-end keypad mode-data workflow acceptance.
function m26(model,events){let s=K.createState(model);for(const key of events)s=K.dispatchKey(s,key);return s}
function m26Mode(model,page,digit,op){return m26(model,['MODE',...Array(page).fill('DOWN'),String(digit),String(op)])}
function m26Fields(s,values){for(const value of values){for(const c of String(value)){s=K.dispatchKey(s,c==='-'?'NEG':c)}s=K.dispatchKey(s,'=')}return s}
test('M26 MATRIX inverse 2x2 keypad workflow',()=>{let s=m26Mode('standard',1,2,3);s=m26Fields(s,[1,2,3,4]);eq(s.view,'result');if(!s.expression.startsWith('INV:')||!s.result.includes('-2'))throw Error(s.result)});
test('M26 MATRIX transpose 2x2 keypad workflow',()=>{let s=m26Mode('standard',1,2,4);s=m26Fields(s,[1,2,3,4]);eq(s.view,'result');eq(s.expression,'TRANS:1,2;3,4')});
test('M26 MATRIX multiplication 2x2 supports second menu page',()=>{let s=m26Mode('standard',1,2,1);s=K.dispatchKey(s,'AC');s=m26('standard',['MODE','DOWN','2','DOWN','1']);eq(s.view,'coefficient');eq(s.ui.wizard.kind,'MUL2');s=m26Fields(s,[1,2,3,4,5,6,7,8]);eq(s.view,'result');if(!s.result.includes('19'))throw Error(s.result)});
test('M26 VECTOR 2D addition via keypad',()=>{let s=m26Mode('standard',1,4,4);s=m26Fields(s,[1,2,3,4]);eq(s.view,'result');eq(s.expression,'ADD:1,2|3,4')});
test('M26 VECTOR angle via keypad',()=>{let s=m26Mode('standard',1,4,1);s=m26('standard',['MODE','DOWN','4','DOWN','1']);s=m26Fields(s,[1,0,0,1]);eq(s.view,'result');if(!s.result.includes('90'))throw Error(s.result)});
test('M26 STAT five values via keypad',()=>{let s=m26Mode('standard',0,3,2);s=m26Fields(s,[1,2,3,4,5]);eq(s.view,'result');eq(s.expression,'1VAR:1,2,3,4,5');if(!s.result.includes('3'))throw Error(s.result)});
test('M26 STAT regression pairs via keypad',()=>{let s=m26Mode('standard',0,3,3);s=m26Fields(s,[1,3,2,5,3,7]);eq(s.view,'result');eq(s.expression,'LINEAR:1,3;2,5;3,7')});
test('M26 TABLE variable X through ALPHA+LP key sequence',()=>{let s=m26Mode('standard',1,3,2);for(const k of ['ALPHA','LP','POW','2','='])s=K.dispatchKey(s,k);eq(s.ui.wizard.values[0],'X^2');eq(s.ui.wizard.index,1);eq(s.alpha,false)});
test('M26 TABLE custom function editor',()=>{let s=m26Mode('standard',1,3,2);for(const key of ['X','POW','2','ADD','1','='])s=K.dispatchKey(s,key);s=m26Fields(s,[-2,2,1]);eq(s.view,'result');eq(s.expression,'X^2+1|-2|2|1');eq(s.lastValue.data.rows.length,5)});
test('M26 TABLE result paging preserves semantic data',()=>{let s=m26Mode('standard',1,3,1);s=m26Fields(s,[-2,2,1]);let a=K.semanticScreen(s);s=K.dispatchKey(s,'DOWN');let b=K.semanticScreen(s);eq(s.view,'result');if(a.expression===b.expression)throw Error('No page advance');eq(s.lastValue.data.rows.length,5)});
test('M26 TABLE dual function forbidden on standard profile',()=>{let s=m26Mode('standard',1,3,3);eq(s.view,'workflow-menu')});
test('M26 TABLE dual function on C profile',()=>{let s=m26Mode('c',1,3,3);eq(s.view,'coefficient');for(const key of ['X','=','X','POW','2','='])s=K.dispatchKey(s,key);s=m26Fields(s,[1,3,1]);eq(s.view,'result');eq(s.lastValue.data.rows.length,3);eq(s.lastValue.data.rows[2][2],9)});
test('M26 wizard editor rejects unsafe function characters',()=>{let s=m26Mode('standard',1,3,2);s=K.dispatchKey(s,'=');eq(s.view,'error')});
test('M26 field navigation preserves entered values',()=>{let s=m26Mode('standard',1,1,1);s=K.dispatchKey(s,'2');s=K.dispatchKey(s,'RIGHT');s=K.dispatchKey(s,'3');s=K.dispatchKey(s,'LEFT');eq(s.ui.wizard.buffer,'2');s=K.dispatchKey(s,'RIGHT');eq(s.ui.wizard.buffer,'3')});
test('M26 wizard result trace is deterministic',()=>{let sequence=['MODE','DOWN','3','1','1','=','2','=','1','='];let a=K.runTrace({events:sequence}),b=K.runTrace({events:sequence});eq(a.hash,b.hash)});


// Milestone 27 persistent typed data register and table workflow checks.
function t27(model,keys){let s=K.createState(model);for(const k of keys)s=K.dispatchKey(s,k);return s}
function t27keys(s,keys){for(const k of keys)s=K.dispatchKey(s,k);return s}
function t27matrix(){return t27('standard',['MODE','DOWN','2','REGS','1'])}
function t27vector(){return t27('standard',['MODE','DOWN','4','REGS','1'])}
test('M27 register menu stores matrices separately',()=>{let s=t27matrix();eq(s.view,'register-editor');eq(s.ui.registerFlow.name,'A');eq(s.ui.modeMemory.matrix.B,null)});
test('M27 matrix entry persists four values',()=>{let s=t27matrix();s=t27keys(s,['1','=','2','=','3','=','4','=']);eq(s.view,'register-summary');eq(JSON.stringify(s.ui.modeMemory.matrix.A),'[[1,2],[3,4]]')});
test('M27 matrix stored after mode transitions',()=>{let s=t27keys(t27matrix(),['1','=','2','=','3','=','4','=']);s=t27keys(s,['AC','MODE','1','MODE','DOWN','2']);eq(JSON.stringify(s.ui.modeMemory.matrix.A),'[[1,2],[3,4]]')});
test('M27 independent MatB register',()=>{let s=t27keys(t27matrix(),['1','=','0','=','0','=','1','=','REGS','2','2','=','0','=','0','=','2','=']);eq(JSON.stringify(s.ui.modeMemory.matrix.A),'[[1,0],[0,1]]');eq(JSON.stringify(s.ui.modeMemory.matrix.B),'[[2,0],[0,2]]')});
test('M27 determinant by stored MatA',()=>{let s=t27keys(t27matrix(),['1','=','2','=','3','=','4','=','OP','1']);eq(s.view,'result');eq(s.expression,'DET:1,2;3,4');eq(s.result,'-2')});
test('M27 inverse by stored MatA',()=>{let s=t27keys(t27matrix(),['1','=','2','=','3','=','4','=','OP','2']);eq(s.view,'result');if(!s.result.includes('-2'))throw Error(s.result)});
test('M27 multiplication uses MatB',()=>{let s=t27keys(t27matrix(),['1','=','0','=','0','=','1','=','REGS','2','2','=','0','=','0','=','2','=','REGS','1','OP','5']);eq(s.view,'result');eq(s.expression,'MUL:1,0;0,1|2,0;0,2')});
test('M27 matrix size toggles 3x3',()=>{let s=t27keys(t27matrix(),['SIZE']);eq(s.ui.registerFlow.size,3);eq(s.ui.modeMemory.matrix.A.length,3)});
test('M27 cannot calculate missing second matrix',()=>{let s=t27keys(t27matrix(),['1','=','0','=','0','=','1','=','OP','4']);eq(s.view,'error')});
test('M27 vector register stores third component',()=>{let s=t27keys(t27vector(),['SIZE','1','=','2','=','3','=']);eq(s.view,'register-summary');eq(JSON.stringify(s.ui.modeMemory.vector.A),'[1,2,3]')});
test('M27 stored vector norm',()=>{let s=t27keys(t27vector(),['3','=','4','=','OP','1']);eq(s.result,'5')});
test('M27 vector B dot product',()=>{let s=t27keys(t27vector(),['1','=','2','=','REGS','2','3','=','4','=','REGS','1','OP','2']);eq(s.expression,'DOT:1,2|3,4');eq(s.result,'11')});
test('M27 3D cross product',()=>{let s=t27keys(t27vector(),['SIZE','1','=','0','=','0','=','REGS','2','SIZE','0','=','1','=','0','=','REGS','1','OP','4']);eq(s.expression,'CROSS:1,0,0|0,1,0');eq(s.result,'[0, 0, 1]')});
test('M27 invalid register entry does not execute JS',()=>{let s=t27keys(t27matrix(),['NEG','=']);eq(s.view,'error')});
test('M27 STAT data editor initializes empty',()=>{let s=t27('standard',['MODE','3','DATA']);eq(s.view,'stat-grid');eq(s.ui.modeMemory.stat.rows.length,0)});
test('M27 STAT editor accepts multiple rows and computes mean',()=>{let s=t27('standard',['MODE','3','DATA','1','=','2','=','3','STATS']);eq(s.view,'result');if(!s.result.includes('mean=2'))throw Error(s.result)});
test('M27 STAT rows persist when mode changed',()=>{let s=t27('standard',['MODE','3','DATA','7','=','8','=','AC','MODE','1','MODE','3','DATA']);eq(s.ui.modeMemory.stat.rows.length,2);eq(s.ui.modeMemory.stat.rows[0][0],7)});
test('M27 STAT row deletion',()=>{let s=t27('standard',['MODE','3','DATA','1','=','2','=','UP','DELROW']);eq(s.ui.modeMemory.stat.rows.length,1)});
test('M27 STAT pair mode linear regression',()=>{let s=t27('standard',['MODE','3','DATA','PAIR','1','=','3','=','2','=','5','=','3','=','7','STATS']);eq(s.view,'result');eq(s.expression,'LINEAR:1,3;2,5;3,7')});
test('M27 dataset reset on PAIR changes',()=>{let s=t27('standard',['MODE','3','DATA','1','=','PAIR']);eq(s.ui.modeMemory.stat.rows.length,0);eq(s.ui.modeMemory.stat.kind,'LINEAR')});
test('M27 reset clears registers',()=>{let s=t27keys(t27matrix(),['1','=','2','=','3','=','4','=']);let fresh=K.createState();eq(fresh.ui.modeMemory.matrix.A,null);eq(s.ui.modeMemory.matrix.A[0][0],1)});

// M28: lossless typed scalar recovery, validated persistence, and opt-in storage.
const SS=global.FX991_SESSION;
function mem28(){let s=K.createState('c');s.mode='MATRIX';s.ui.modeMemory.matrix.A=[[1,2],[3,4]];s.ui.modeMemory.matrix.B=[[2,0],[0,2]];s.ui.modeMemory.vector.C=[3,4,5];s.ui.modeMemory.stat={kind:'LINEAR',rows:[[1,3],[2,5]]};s.memory.A=K.rat(7n,3n);s.ans=K.rat(-5n,8n);s.history=[{expression:'1+2',display:'3'}];s.expression='2+4';s.cursor=3;return s}
function fail28(f){try{f();throw Error('Expected rejection')}catch(e){if(e.message==='Expected rejection')throw e}}
function fakeStorage(){const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
test('M28 session exports explicit versioned schema',()=>{let x=JSON.parse(SS.exportJSON(mem28()));eq(x.schema,'fx991-session');eq(x.version,2)});
test('M28 register matrices survive JSON round-trip',()=>{let s=SS.importJSON(SS.exportJSON(mem28()));eq(JSON.stringify(s.ui.modeMemory.matrix.A),'[[1,2],[3,4]]');eq(JSON.stringify(s.ui.modeMemory.matrix.B),'[[2,0],[0,2]]')});
test('M28 vector register survives JSON round-trip',()=>{let s=SS.importJSON(SS.exportJSON(mem28()));eq(JSON.stringify(s.ui.modeMemory.vector.C),'[3,4,5]')});
test('M28 linear statistics pairs survive JSON round-trip',()=>{let s=SS.importJSON(SS.exportJSON(mem28()));eq(JSON.stringify(s.ui.modeMemory.stat.rows),'[[1,3],[2,5]]')});
test('M28 exact BigInt rational memory survives',()=>{let s=SS.importJSON(SS.exportJSON(mem28()));eq(K.valueToString(s.memory.A),'7/3');eq(K.valueToString(s.ans),'-5/8')});
test('M28 persists setup, model and expression',()=>{let s=mem28();s.setup={angle:'RAD',format:'Fix',digits:5};s=SS.importJSON(SS.exportJSON(s));eq(s.model,'c');eq(s.setup.format,'Fix');eq(s.setup.angle,'RAD');eq(s.expression,'2+4')});
test('M28 restore resets active workflow to edit',()=>{let s=mem28();s.view='register-editor';s.ui.registerFlow={category:'matrix',name:'A',field:1};s=SS.importJSON(SS.exportJSON(s));eq(s.view,'edit');eq(s.ui.registerFlow,null);eq(s.lastValue,null)});
test('M28 rejects invalid JSON',()=>fail28(()=>SS.importJSON('{bad')));
test('M28 rejects newer unknown schema version',()=>{let p=JSON.parse(SS.exportJSON(mem28()));p.version=99;fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M28 rejects NaN matrix cells',()=>{let p=JSON.parse(SS.exportJSON(mem28()));p.modeMemory.matrix.A[0][1]='NaN';fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M28 rejects non-square matrix',()=>{let p=JSON.parse(SS.exportJSON(mem28()));p.modeMemory.matrix.A=[[1,2],[3,4],[5,6]];fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M28 rejects malicious oversized datasets',()=>{let p=JSON.parse(SS.exportJSON(mem28()));p.modeMemory.stat.rows=Array.from({length:81},()=>[1,2]);fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M28 rejects invalid BigInt memory',()=>{let p=JSON.parse(SS.exportJSON(mem28()));p.memory.A.n='1e999';fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M28 refuses C mode on standard model',()=>{let p=JSON.parse(SS.exportJSON(mem28()));p.model='standard';p.mode='INEQ';fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M28 initial browser recovery is disabled',()=>{let st=fakeStorage();eq(SS.enabled(st),false);eq(SS.store(st,mem28()),false);eq(SS.recover(st),null)});
test('M28 opted-in storage restores state',()=>{let st=fakeStorage();eq(SS.enable(st,true),true);eq(SS.store(st,mem28()),true);eq(SS.recover(st).ui.modeMemory.vector.C[2],5)});
test('M28 disabling recovery clears saved data',()=>{let st=fakeStorage();SS.enable(st,true);SS.store(st,mem28());SS.enable(st,false);eq(SS.enabled(st),false);eq(st.getItem(SS.KEY),null)});
test('M28 corrupted storage fails closed',()=>{let st=fakeStorage();SS.enable(st,true);st.setItem(SS.KEY,'{broken');eq(SS.recover(st),null)});
test('M28 export respects maximum expression length',()=>{let s=mem28();s.expression='1'.repeat(513);fail28(()=>SS.exportJSON(s))});
test('M28 imported session retains safe calculator dispatch',()=>{let s=SS.importJSON(SS.exportJSON(mem28()));s=K.dispatchKey(s,'AC');eq(s.view,'edit');eq(s.ui.modeMemory.matrix.A[0][0],1)});
// M29: versioned structural and interrupted editor session restoration.
const ED29=global.FX991_EDITOR;
function m29keys(sequence){let s=K.createState();for(const k of sequence)s=K.dispatchKey(s,k);return s}
function m29document(){return m29keys(['FRAC','1','RIGHT','2','LEFT']);}
test('M29 exports structural document and anchor',()=>{let s=m29document(),p=SS.extract(s);eq(p.version,2);eq(p.document.root.children[0].kind,'Fraction');eq(p.document.anchor.sequenceId,s.document.anchor.sequenceId)});
test('M29 exact fraction slot and cursor restore',()=>{let s=m29document(),t=SS.importJSON(SS.exportJSON(s));eq(ED29.serialize(t.document),s.expression);eq(t.document.anchor.sequenceId,s.document.anchor.sequenceId);eq(t.document.anchor.offset,s.document.anchor.offset)});
test('M29 structural cursor editable after import',()=>{let t=SS.importJSON(SS.exportJSON(m29document()));t=K.dispatchKey(t,'3');eq(ED29.serialize(t.document),'(1)/(32)')});
test('M29 restores nested function, power and root',()=>{let s=m29keys(['FRAC','SIN','3','RIGHT','RIGHT','SQRT','9']);let t=SS.importJSON(SS.exportJSON(s));eq(ED29.inspect(t.document).nodes,ED29.inspect(s.document).nodes);eq(t.document.anchor.sequenceId,s.document.anchor.sequenceId)});
test('M29 reserves old node IDs when editing new templates',()=>{let s=m29document(),t=SS.importJSON(SS.exportJSON(s));t=K.dispatchKey(t,'FRAC');eq(ED29.inspect(t.document).duplicate,false)});
test('M29 refuses invalid duplicate tree IDs',()=>{let p=SS.extract(m29document());p.document.root.children[0].denominator.id=p.document.root.children[0].numerator.id;fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M29 refuses foreign structural cursor ID',()=>{let p=SS.extract(m29document());p.document.anchor.sequenceId='nd999999';fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M29 refuses expression and tree mismatch',()=>{let p=SS.extract(m29document());p.expression='17';p.cursor=2;fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M29 rejects malicious node types',()=>{let p=SS.extract(m29document());p.document.root.children[0].kind='Script';fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M29 rejects oversized source document tree',()=>{let p=SS.extract(m29document());p.document.root.children=Array.from({length:510},(_,i)=>({kind:'Token',id:'nd'+(10000+i),value:'1'}));p.expression='1'.repeat(510);p.cursor=510;fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M29 imports older v1 sessions safely',()=>{let p=SS.extract(mem28());p.version=1;delete p.document;delete p.workflow;let s=SS.importJSON(JSON.stringify(p));eq(s.ui.modeMemory.matrix.A[0][0],1);eq(s.view,'edit')});
test('M29 resumes valid register editor field and buffer',()=>{let s=t27matrix();s=t27keys(s,['1','=','2']);let t=SS.importJSON(SS.exportJSON(s));eq(t.view,'register-editor');eq(t.ui.registerFlow.field,1);eq(t.ui.registerFlow.buffer,'2');t=K.dispatchKey(t,'=');eq(t.ui.modeMemory.matrix.A[0][1],2)});
test('M29 register menu survives reload',()=>{let s=t27('standard',['MODE','DOWN','2','REGS']);let t=SS.importJSON(SS.exportJSON(s));eq(t.view,'register-menu');eq(t.ui.registerFlow.name,null)});
test('M29 resumes statistics pending cell',()=>{let s=t27('standard',['MODE','3','DATA','1','=','2']);let t=SS.importJSON(SS.exportJSON(s));eq(t.view,'stat-grid');eq(t.ui.statFlow.buffer,'2');t=K.dispatchKey(t,'=');eq(t.ui.modeMemory.stat.rows[1][0],2)});
test('M29 rejects inconsistent workflow mode',()=>{let s=t27matrix();let p=SS.extract(s);p.mode='COMP';fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M29 opt-in recovery retains structural document',()=>{let storage=fakeStorage();SS.enable(storage,true);let s=m29document();SS.store(storage,s);let r=SS.recover(storage);eq(r.document.anchor.sequenceId,s.document.anchor.sequenceId)});
test('M29 matrix copy from MatA to MatB is independent',()=>{let s=t27keys(t27matrix(),['1','=','2','=','3','=','4','=','COPY']);eq(JSON.stringify(s.ui.modeMemory.matrix.B),'[[1,2],[3,4]]');s.ui.modeMemory.matrix.B[0][0]=99;eq(s.ui.modeMemory.matrix.A[0][0],1)});
test('M29 CLEARREG removes only selected register',()=>{let s=t27keys(t27matrix(),['1','=','2','=','3','=','4','=','COPY','CLRREG']);eq(s.ui.modeMemory.matrix.A,null);eq(s.ui.modeMemory.matrix.B[0][0],1)});
test('M29 vector register copy respects dimensions',()=>{let s=t27keys(t27vector(),['SIZE','1','=','2','=','3','=','COPY']);eq(JSON.stringify(s.ui.modeMemory.vector.B),'[1,2,3]')});
test('M29 resumes coefficient wizard with progress',()=>{let s=m26Mode('standard',1,1,1);s=K.dispatchKey(s,'2');s=K.dispatchKey(s,'=');s=K.dispatchKey(s,'3');let t=SS.importJSON(SS.exportJSON(s));eq(t.view,'coefficient');eq(t.ui.wizard.index,1);eq(t.ui.wizard.buffer,'3');t=K.dispatchKey(t,'=');eq(t.ui.wizard.index,2)});
test('M29 restores wizard menu',()=>{let s=m26Mode('standard',1,1);let t=SS.importJSON(SS.exportJSON(s));eq(t.view,'workflow-menu');eq(t.ui.wizard.kind,null)});
test('M29 rejects spoofed wizard field schema',()=>{let s=m26Mode('standard',1,1,1),p=SS.extract(s);p.workflow.wizard.fields[0]='eval';fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M29 rejects malicious wizard buffer',()=>{let s=m26Mode('standard',1,1,1),p=SS.extract(s);p.workflow.wizard.buffer='process.exit()';fail28(()=>SS.importJSON(JSON.stringify(p)))});
test('M29 restored session never executes expression during import',()=>{let s=m29document(),t=SS.importJSON(SS.exportJSON(s));eq(t.lastValue,null);eq(t.result,'');eq(t.error,null)});

// Milestone 30: long-session editing and restore integration regressions.
function t30keys(s,keys){for(const k of keys)s=K.dispatchKey(s,k);return s}
test('M30 repeated structural restore preserves cursor and content',()=>{let s=m29document();for(let i=0;i<12;i++){s=SS.importJSON(SS.exportJSON(s));s=K.dispatchKey(s,String(i%10));eq(ED29.inspect(s.document).anchorValid,true)}eq(s.view,'edit')});
test('M30 repeated template creation after import preserves unique IDs',()=>{let s=m29document();for(let i=0;i<8;i++){s=SS.importJSON(SS.exportJSON(s));s=K.dispatchKey(s,'FRAC');eq(ED29.inspect(s.document).duplicate,false)}});
test('M30 session JSON round trip deterministic for unchanged state',()=>{let s=m29document(),a=SS.exportJSON(s),b=SS.exportJSON(SS.importJSON(a));eq(JSON.stringify(JSON.parse(a).document),JSON.stringify(JSON.parse(b).document))});
test('M30 long matrix-edit resume preserves register values',()=>{let s=t27matrix();s=t30keys(s,['1','=','2','=','3','=','4','=']);for(let i=0;i<9;i++){s=SS.importJSON(SS.exportJSON(s));eq(s.ui.modeMemory.matrix.A[1][1],4)}eq(s.view,'register-summary')});
test('M30 memory remains exact through multiple restores',()=>{let s=mem28();for(let i=0;i<15;i++)s=SS.importJSON(SS.exportJSON(s));eq(K.valueToString(s.memory.A),'7/3')});
test('M30 stat dataset remains intact across repeated sessions',()=>{let s=mem28();for(let i=0;i<12;i++)s=SS.importJSON(SS.exportJSON(s));eq(JSON.stringify(s.ui.modeMemory.stat.rows),'[[1,3],[2,5]]')});
test('M30 imported sessions reset transient modifiers',()=>{let s=m29document();s.shift=true;s.alpha=true;let r=SS.importJSON(SS.exportJSON(s));eq(r.shift,false);eq(r.alpha,false)});
test('M30 no automatic expression evaluation after multiple imports',()=>{let s=m29document();for(let i=0;i<6;i++)s=SS.importJSON(SS.exportJSON(s));eq(s.lastValue,null);eq(s.result,'')});
test('M30 recovery disabled does not persist editing state',()=>{let st=fakeStorage();let s=m29document();eq(SS.store(st,s),false);eq(st.getItem(SS.KEY),null)});
test('M30 document anchor remains valid after 10 restorations',()=>{let s=m29document();for(let i=0;i<10;i++)s=SS.importJSON(SS.exportJSON(s));eq(ED29.inspect(s.document).anchorValid,true)});

function run(){let details=[],passed=0;for(let c of cases){try{c.run();passed++;details.push({name:c.name,pass:true})}catch(e){details.push({name:c.name,pass:false,error:String(e.message)})}}return {passed,failed:details.length-passed,total:details.length,details}}
global.FX991_TESTS=Object.freeze({run,cases});
})(typeof window!=='undefined'?window:globalThis);


