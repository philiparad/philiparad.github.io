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
const API=Object.freeze({forState});
if(typeof module!=='undefined'&&module.exports)module.exports=API;
root.FX991_ERROR_HELP=API;
})(typeof window!=='undefined'?window:globalThis);
