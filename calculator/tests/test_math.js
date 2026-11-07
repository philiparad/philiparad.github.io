(function(){'use strict';const m=window.FreshMath;const cases=[
 ['arithmetic',m.evaluate('1+2*3'),7],['associativity',m.evaluate('2^3^2'),512],['unary precedence',m.evaluate('-2^2'),-4],
 ['fraction',m.evaluate('1/3+1/6'),.5],['implicit multiplication',m.evaluate('2(3+4)'),14],['factorial',m.evaluate('5!'),120],
 ['degrees',m.evaluate('sin(30)',{angle:'DEG'}),.5],['radians',m.evaluate('cos(pi)',{angle:'RAD'}),-1],
 ['combination',m.evaluate('5nCr2'),10],['degree suffix',m.evaluate('sin(30°)',{angle:'RAD'}),.5],['variables',m.evaluate('X^2',{memory:{X:3}}),9],
 ['root',m.solve(x=>x*x-2,1),Math.SQRT2],['integral',m.integrate(x=>x*x,0,1),1/3]
 ];const errors=[];for(const [name,result,want]of cases)if(Math.abs(result-want)>1e-9)errors.push(name+': '+result+' != '+want);
 const count=window.FreshKeypad.keys.length;if(count!==50)errors.push('key count '+count);
 document.getElementById('result').textContent=errors.length?errors.join('\n'):(cases.length+1)+' tests passed';if(errors.length)console.error(errors);})();
