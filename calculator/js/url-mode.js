/* Calculator-only layout is the default at /calculator/ and when embedded.
 * The supporting panels remain in the DOM because app.js needs their status
 * and diagnostic elements, but CSS hides them in calculator-only mode.
 * ?view=full deliberately restores the development/diagnostic workspace.
 */
(function(){
'use strict';
const params=new URLSearchParams(window.location.search);
const calculatorOnly=params.get('view')!=='full';
document.documentElement.classList.toggle('calculator-only',calculatorOnly);
document.documentElement.dataset.calculatorView=calculatorOnly?'only':'full';
})();
