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
const app=fs.readFileSync(path.join(root,'js/app.js'),'utf8');
const extras=fs.readFileSync(path.join(root,'js/emulator-extras.js'),'utf8');
const urlMode=fs.readFileSync(path.join(root,'js/url-mode.js'),'utf8');
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
 ['Keyboard DOM',html.includes('class="keys" id="keys"')],
 ['Only main LCD is mounted',html.includes('id="lcd"')&&!html.includes('id="lcd-large"')],
 ['No enlarged LCD controls',!html.includes('id="enlarge"')&&!html.includes('id="lcd-panel"')],
 ['No pop-out LCD controls or window code',!extras.includes('popout-lcd')&&!extras.includes('openPopup')&&!extras.includes("window.open(")],
 ['No detached LCD repaint code',!app.includes("$('lcd-large')")&&!app.includes("$('lcd-panel')")],
 ['Default view shows calculator only',urlMode.includes("params.get('view')!=='full'")]
];
for(const [name,ok] of checks)assert.ok(ok,name);
console.log('PASS: '+checks.length+' faceplate CSS/HTML regression checks');
