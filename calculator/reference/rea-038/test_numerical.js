/* REA-038: guarded d/dx, integration, Σ, Newton SOLVE and precision tests. */
'use strict';
const assert=require('node:assert/strict');
const M=require('../../js/math-engine.js');
let checked=0;
function near(actual,expected,tol,label){
 assert.ok(Number.isFinite(actual),label+' finite');
 assert.ok(Math.abs(actual-expected)<=tol*Math.max(1,Math.abs(expected)),
  label+': '+actual+' != '+expected);
 checked++;
}
function fail(fn,expected,label){
 assert.throws(fn,new RegExp(expected),label);checked++;
}
for(const [label,fn,want,tol]of [
 ['derivative x^2 @2',()=>M.derivative(x=>x*x,2),4,1e-8],
 ['derivative 3x²-5x+2 @2',()=>M.derivative(x=>3*x*x-5*x+2,2,1e-12),7,1e-8],
 ['derivative sin pi/2',()=>M.derivative(Math.sin,Math.PI/2),0,1e-9],
 ['derivative sin 0',()=>M.derivative(Math.sin,0),1,1e-8],
 ['derivative cos 0',()=>M.derivative(Math.cos,0),0,1e-8],
 ['derivative exp 1',()=>M.derivative(Math.exp,1),Math.E,2e-8],
 ['derivative cubic at 1',()=>M.derivative(x=>x**3,1),3,1e-8],
 ['derivative abs at 2',()=>M.derivative(Math.abs,2),1,1e-8],
 ['derivative const',()=>M.derivative(x=>5,2),0,1e-8],
 ['derivative negative slope',()=>M.derivative(x=>-3*x+2,-7),-3,1e-8],
 ['integrate x²',()=>M.integrate(x=>x*x,0,1),1/3,1e-6],
 ['integrate 3x²-2',()=>M.integrate(x=>3*x*x-2,0,1),-1,1e-6],
 ['integrate e to ln x',()=>M.integrate(Math.log,1,Math.E,1e-7),1,3e-7],
 ['integrate sin over 0..π',()=>M.integrate(Math.sin,0,Math.PI,1e-7),2,2e-7],
 ['integrate cos over 0..π/2',()=>M.integrate(Math.cos,0,Math.PI/2,1e-7),1,3e-7],
 ['integrate reverse',()=>M.integrate(x=>x,2,0),-2,1e-9],
 ['integrate even abs',()=>M.integrate(Math.abs,-1,1),1,1e-9],
 ['integrate zero width',()=>M.integrate(x=>x*x,3,3),0,1e-12],
 ['integrate positive only',()=>M.integrate(x=>x+2,-1,1),4,1e-9],
 ['integrate negative only',()=>M.integrate(x=>-x*x,0,1),-1/3,1e-6],
 ['integrate Gaussian',()=>M.integrate(x=>Math.exp(-x*x),-1,1,1e-7),1.493648265624854,5e-7],
 ['sum example',()=>M.summation(x=>x+1,1,5),20,0],
 ['sum squares',()=>M.summation(x=>x*x,1,10),385,0],
 ['sum negative bounds',()=>M.summation(x=>x,-3,3),0,0],
 ['sum zero',()=>M.summation(x=>0,-2,5),0,0],
 ['sum single',()=>M.summation(x=>x*x,4,4),16,0],
 ['sum register function',()=>M.summation(x=>3*x+2,0,4),40,0],
 ['solve x²-2',()=>M.solve(x=>x*x-2,1),Math.SQRT2,1e-8],
 ['solve x³-8',()=>M.solve(x=>x**3-8,1),2,1e-8],
 ['solve x-17',()=>M.solve(x=>x-17,0),17,1e-8],
 ['solve sin',()=>M.solve(Math.sin,3),Math.PI,1e-8],
 ['solve sqrt x-2',()=>M.solve(x=>Math.sqrt(x)-2,3),4,1e-8],
 ['solve root at initial',()=>M.solve(x=>x*x-4,2),2,0]
])near(fn(),want,tol,label);
for(const [label,fn,error]of [
 ['derivative cusp',()=>M.derivative(Math.abs,0),'Math ERROR'],
 ['derivative sqrt boundary',()=>M.derivative(Math.sqrt,0),'Math ERROR'],
 ['derivative pole',()=>M.derivative(x=>1/x,0),'Math ERROR'],
 ['derivative NaN point',()=>M.derivative(Math.sin,NaN),'Argument ERROR'],
 ['derivative tol small',()=>M.derivative(Math.sin,0,1e-16),'Argument ERROR'],
 ['derivative tol large',()=>M.derivative(Math.sin,0,.5),'Argument ERROR'],
 ['integral pole',()=>M.integrate(x=>1/x,-1,1),'Math ERROR'],
 ['integral sqrt invalid',()=>M.integrate(Math.sqrt,-2,2),'Math ERROR'],
 ['integral ln invalid',()=>M.integrate(Math.log,-1,1),'Math ERROR'],
 ['integral NaN bound',()=>M.integrate(x=>x,0,NaN),'Argument ERROR'],
 ['integral tol small',()=>M.integrate(x=>x,0,1,1e-16),'Argument ERROR'],
 ['integral tol negative',()=>M.integrate(x=>x,0,1,-.01),'Argument ERROR'],
 ['integral bad function',()=>M.integrate(x=>Infinity,0,1),'Math ERROR'],
 ['summation reversed',()=>M.summation(x=>x,5,1),'Argument ERROR'],
 ['summation fraction bound',()=>M.summation(x=>x,1.5,5),'Argument ERROR'],
 ['summation huge range',()=>M.summation(x=>x,1,20001),'Argument ERROR'],
 ['summation too large',()=>M.summation(x=>x,0,1e10),'Argument ERROR'],
 ['summation invalid item',()=>M.summation(x=>Infinity,0,10),'Math ERROR'],
 ['summation overflow',()=>M.summation(x=>1e99,0,11),'Math ERROR'],
 ['solve no real root',()=>M.solve(x=>x*x+1,1),"Can't Solve"],
 ['solve pole',()=>M.solve(x=>1/(x-1),0),"Can't Solve"],
 ['solve NaN guess',()=>M.solve(x=>x,NaN),'Argument ERROR'],
 ['solve too large',()=>M.solve(x=>x,1e11),'Argument ERROR']
])fail(fn,error,label);
const random=()=>Math.random();
for(let i=0;i<20;i++){
 const a=(i*7)%31-15,b=(i*11)%23-11;
 near(M.derivative(x=>a*x+b,i%4),a,1e-8,'linear derivative '+i);
 near(M.integrate(x=>a*x+b,0,2),2*a+2*b,1e-9,'linear integral '+i);
 near(M.summation(x=>a*x+b,-2,2),5*b,1e-9,'linear sum '+i);
}
assert.equal(M.numericTolerance(undefined,1e-5),1e-5);checked++;
assert.equal(M.numericTolerance(1e-14,1e-5),1e-14);checked++;
console.log('REA-038: '+checked+' numerical-method assertions passed');
