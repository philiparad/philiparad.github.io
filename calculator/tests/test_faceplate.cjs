/* Source-level guard for the fx-991ES PLUS upper faceplate.
 * Not a pixel-perfect browser or physical-device comparison.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'styles.css'),'utf8');
const checks=[
 ['CASIO lettering',html.includes('class="brand"')],
 ['Model identifier',html.includes('class="case-model-id"')],
 ['NATURAL-V.P.A.M. mark',html.includes('class="case-model-series"')],
 ['Solar recess',html.includes('class="solar-recess"')&&html.includes('class="solar-cells"')],
 ['Visible faceplate',css.includes('.face .case-model,.face .solar-recess{display:block}')],
 ['Reference brand position',css.includes('.face[data-model="fx-991es-plus"] .brand{')],
 ['Reference model position',css.includes('.face[data-model="fx-991es-plus"] .case-model{')],
 ['Reference solar panel',css.includes('.face[data-model="fx-991es-plus"] .solar-recess{')],
 ['Dark burgundy solar glass',css.includes('#301e1e')],
 ['Existing LCD placement',css.includes('left:7.05%;width:85.9%;top:14.03%;height:17.65%;')],
 ['Keyboard DOM',html.includes('class="keys" id="keys"')]
];
for(const [name,ok] of checks)assert.ok(ok,name);
console.log('PASS: '+checks.length+' faceplate CSS/HTML regression checks');
