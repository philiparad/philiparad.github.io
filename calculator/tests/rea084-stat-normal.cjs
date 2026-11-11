/* REA-084 — original fx-991ES 1-VAR STAT/Distr P/Q/R/x▶t.
 * Run: node calculator/tests/rea084-stat-normal.cjs
 * Source-level model tests, not manufacturer hardware captures.
 */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const N=require('../js/stat-normal.js'),R=require('../js/stat-regression.js');
const S=require('../js/stat-editor.js'),MODELS=require('../js/model-profiles.js');
let passed=0;
const check=(name,fn)=>{try{fn();passed++}catch(e){e.message=name+': '+e.message;throw e}};
const close=(v,w,t=5e-12)=>assert.ok(Math.abs(v-w)<=t*Math.max(1,Math.abs(w)),v+' != '+w);
const sample=()=>{
 const xs=[0,1,2,3,4,5,6,7,9,10],freq=[1,2,1,2,2,2,3,4,2,1];
 const table=S.create(false,true);
 table.regressionType='1VAR';
 table.rows=xs.map((X,i)=>({X,Y:null,FREQ:freq[i]}));
 return table;
};
check('manufacturer weighted sample n 20',()=>assert.equal(R.summary(sample()).n,20));
check('manufacturer weighted sample mean 5.1',()=>close(R.summary(sample()).meanX,5.1));
check('population SD not sample SD',()=>{
 const s=R.summary(sample());
 close(s.sdX,2.7549954627911823);
 assert.ok(Math.abs(s.sdX-s.sampleSDX)>0.05);
});
check('normalized X=3 example -0.762...',()=>{
 const t=N.normalized(3,R.summary(sample()));
 close(t,-0.7622517090726589);
 assert.equal(t.toFixed(3),'-0.762');
});
check('P(t) example 0.223',()=>{
 const t=N.normalized(3,R.summary(sample()));
 const p=N.calculate('P',t);
 close(p,0.22295489479915048,2e-13);
 assert.equal(p.toFixed(3),'0.223');
});
check('R(t) X=7 example 0.245',()=>{
 const t=N.normalized(7,R.summary(sample()));
 close(t,0.6896563082085964);
 assert.equal(N.calculate('R',t).toFixed(3),'0.245');
});
check('Q(t) left-of-zero has signed area',()=>{
 close(N.calculate('Q',-1),-0.341344746068543);
});
check('P(0)=0.5',()=>assert.equal(N.calculate('P',0),0.5));
check('Q(0)=0',()=>assert.equal(N.calculate('Q',0),0));
check('R(0)=0.5',()=>assert.equal(N.calculate('R',0),0.5));
for(const [t,p,r] of [
 [-4,0.00003167124183311998,0.9999683287581669],
 [-3,0.0013498980316300933,0.9986501019683699],
 [-2,0.02275013194817921,0.9772498680518208],
 [-1,0.15865525393145707,0.8413447460685429],
 [1,0.8413447460685429,0.15865525393145707],
 [2,0.9772498680518208,0.02275013194817921],
 [3,0.9986501019683699,0.0013498980316300933],
 [4,0.9999683287581669,0.00003167124183311998]
]){
 check('CDF '+t,()=>close(N.probabilities(t).P,p,3e-13));
 check('upper tail '+t,()=>close(N.probabilities(t).R,r,3e-13));
 check('P+R invariant '+t,()=>close(N.probabilities(t).P+N.probabilities(t).R,1));
 check('P-Q half relation '+t,()=>close(N.probabilities(t).P-N.probabilities(t).Q,.5));
}
for(const t of [-12,-10,-8,-5,-.2,0,.2,5,8,10,12]){
 check('P(t) symmetry '+t,()=>close(N.calculate('P',t),N.calculate('R',-t)));
 check('Q(t) odd symmetry '+t,()=>close(N.calculate('Q',t),-N.calculate('Q',-t)));
}
check('CDF extreme negative',()=>assert.equal(N.calculate('P',-12),0));
check('CDF extreme positive',()=>assert.equal(N.calculate('P',12),1));
check('Q negative extreme',()=>assert.equal(N.calculate('Q',-12),-.5));
check('R extreme positive',()=>assert.equal(N.calculate('R',12),0));
for(const [kind,value] of [['P',Infinity],['Q',NaN],['R',-Infinity],['t',Infinity]]){
 check('non-finite '+kind,()=>assert.throws(()=>N.calculate(kind,value,R.summary(sample())),/Math ERROR/));
}
check('reject invalid function',()=>assert.throws(()=>N.calculate('Z',0),/Argument ERROR/));
check('zero population sigma rejects normalization',()=>{
 const s=S.create(false,false);s.regressionType='1VAR';
 s.rows=[{X:2,Y:null,FREQ:1},{X:2,Y:null,FREQ:1}];
 assert.equal(R.summary(s).sdX,0);
 assert.throws(()=>N.normalized(3,R.summary(s)),/Math ERROR/);
});
check('one observation cannot normalize',()=>{
 const s=S.create();s.rows=[{X:4,Y:null,FREQ:1}];
 assert.throws(()=>N.normalized(4,R.summary(s)),/Math ERROR/);
});
check('mean of weighted observations affects standardization',()=>{
 const s=S.create(false,true);s.rows=[
  {X:0,Y:null,FREQ:1},{X:10,Y:null,FREQ:3}
 ];
 close(N.normalized(0,R.summary(s)),-Math.sqrt(3));
});
check('normal function does not mutate STAT data',()=>{
 const data=sample(),before=JSON.stringify(data);
 N.calculate('t',3,R.summary(data));
 assert.equal(JSON.stringify(data),before);
});
check('paired regression must not offer original Distr',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/state\.statTable\.paired\|\|state\.statTable\.regressionType!=='1VAR'/);
 assert.match(app,/state\.model==='fx-991es'&&!state\.statTable\.paired/);
});
check('original 7th menu dispatches Distr; paired dispatches Reg',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/\?'7\. Distr':'7\. Reg'/);
 assert.match(app,/statDistr\(\):statSafe/);
});
check('menu items and order P Q R t',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const start=app.indexOf('function statDistr(){'),end=app.indexOf('function statDistrInput(',start);
 assert.ok(start>0&&end>start);
 const slice=app.slice(start,end);
 for(const label of ['1. P(','2. Q(','3. R(','4. ▶t'])assert.ok(slice.includes(label),label);
});
check('user values evaluated before Ans committed',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 const block=app.slice(app.indexOf('function statDistrInput('),app.indexOf('function statMenu(){'));
 assert.match(block,/STAT\.commit\(state\.statTable\)/);
 assert.match(block,/REG\.summary\(state\.statTable\)/);
 assert.doesNotMatch(block,/state\.ans\s*=/);
});
check('result commits Ans for native P(Ans) next step',()=>{
 const app=fs.readFileSync(path.join(__dirname,'../js/app.js'),'utf8');
 assert.match(app,/if\(output&&output\.kind==='stat-normal'\)/);
 assert.match(app,/state\.raw=output\.value;state\.ans=output\.value/);
});
check('original model supports STAT; no new calculator mode required',()=>{
 assert.ok(MODELS.supports('fx-991es','STAT'));
});
check('stat-normal included before app controller',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
 assert.ok(html.indexOf('src="js/stat-normal.js"')>0);
 assert.ok(html.indexOf('src="js/stat-normal.js"')<html.indexOf('src="js/app.js"'));
});
console.log('REA-084 PASS '+passed+' original STAT P/Q/R/t checks; hardware unverified');
