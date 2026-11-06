/* Accessible educational explanation of numerical failures; the LCD is unchanged. */
(function(root){'use strict';
const REASONS=Object.freeze({
 domain_sample:['Undefined function value','The function is undefined or nonfinite at a sampled point. Check the domain and integration limits.'],
 nonfinite_value:['Nonfinite result','The calculation produced a value outside the supported finite range. Try a smaller input.'],
 non_differentiable:['Derivative does not exist here','The left and right slopes disagree near this point. Check for a corner or cusp.'],
 derivative_not_converged:['Derivative did not converge','Successive derivative estimates did not stabilize. Try a smoother function or a different point.'],
 quadrature_not_converged:['Integral did not converge','The integration error remained too large. Check for a singularity, steep variation or unsuitable limits.'],
 evaluation_budget:['Calculation limit reached','The numerical method reached its evaluation budget. Try a simpler expression or shorter interval.'],
 interval_budget:['Subdivision limit reached','The integral required more subintervals than the numerical method allows.'],
 near_zero_slope:['Solver cannot proceed','The local slope is almost zero. Try an initial guess closer to a root.'],
 no_residual_improvement:['Solver did not improve','No trial step reduced the equation residual. Try another initial guess.'],
 iteration_limit:['Solver iteration limit','The numerical solver did not reach a root within its iteration limit.'],
 invalid_tolerance:['Invalid tolerance','Use a supported positive numerical tolerance.']
});
const OPERATIONS=new Set(['DIFF','INTEGRAL','SOLVE','SUM']);
function forState(state){
 if(!state||state.view!=='error'||!state.error)return null;
 const detail=state.numericalDetails;
 if(!detail||!OPERATIONS.has(detail.operation)||detail.error!==state.error)return null;
 const specific=REASONS[detail.reason];
 const title=specific?specific[0]:'Numerical calculation failed';
 const message=specific?specific[1]:'Check the expression, its domain, and the numerical parameters.';
 return Object.freeze({title,message,error:state.error,operation:detail.operation,
  reason:detail.reason||'evaluation_error'});
}

const STUDENT_LESSONS=Object.freeze({
 domain_sample:['Check where the expression becomes undefined, especially denominators and roots.','1/X is undefined at X=0, so do not integrate across zero as one ordinary integral.'],
 non_differentiable:['Compare the slope from the left with the slope from the right.','At X=0, |X| has left slope -1 and right slope +1. Its derivative does not exist.'],
 near_zero_slope:['Try a different SOLVE starting guess, where the slope is not zero.','For X^2-2, try initial guess X=1 instead of X=0.'],
 quadrature_not_converged:['Inspect the interval for singularities or steep changes, or split the interval.','A function with a pole inside the interval cannot be treated as a single ordinary integral.'],
 derivative_not_converged:['Check that the function is smooth near the evaluation point.','A rapidly oscillating function near zero may not have a stable numerical derivative.'],
 no_residual_improvement:['Choose another starting guess and check whether a real root exists.','X^2+1=0 has no real solution.'],
 iteration_limit:['Simplify the equation or change the initial root guess.','For X^2-2, a starting guess near X=1 approaches the positive root.'],
 invalid_tolerance:['Use a positive supported tolerance.','A tolerance of 0.00001 is supported.'],
 evaluation_budget:['Simplify the expression or shorten the interval.','Highly oscillating functions can exceed the evaluation budget.'],
 interval_budget:['Try splitting the interval and checking each part.','Some steep functions require more interval subdivisions than supported.'],
 nonfinite_value:['Check input magnitude and operations that overflow.','A very large exponent may exceed finite-number limits.']
});
function lessonForState(state){
 const h=forState(state);if(!h)return null;
 const info=STUDENT_LESSONS[h.reason]||['Check the function domain and input values.','The derivative of X^2 at X=2 is 4.'];
 return Object.freeze({title:h.title,steps:Object.freeze([
  'Identify the problem: '+h.message,
  'Suggested correction: '+info[0],
  'Worked example: '+info[1]
 ])});
}
const API=Object.freeze({forState,lessonForState});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
root.FX991_ERROR_HELP=API;
})(typeof window!=='undefined'?window:globalThis);
