/* VIEW-002 — activate query-driven presentation before calculator initializes.
 * This module runs in <head> and does not depend on body or calculator state.
 */
(function(){
'use strict';
const params=new URLSearchParams(window.location.search);
if(params.get('key')==='calculator'){
 document.documentElement.classList.add('calculator-only');
 document.documentElement.dataset.calculatorView='only';
}
})();
