import {compileExpression} from './expression.js?v=20261121-tables';

// A break point describes a mathematical event, not a visual table cell.
export const VARIATION_KINDS=['zero','undefined','derivativeUndefined','secondZero','secondUndefined'];
export const VARIATION_MODES=['extrema','inflection','combined'];
export const VARIATION_SESSIONS=['teacher','student','check'];
const MAX_POINTS=24;
const validText=(s,max=400)=>typeof s==='string'&&s.length<=max&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s);
function finite(x){return typeof x==='number'&&Number.isFinite(x)&&Math.abs(x)<=1e6;}
export function coordinate(raw){
    if(typeof raw==='number'){if(!finite(raw))throw Error('Point must be a finite number.');return raw;}
    const text=String(raw??'').trim().replaceAll('−','-');
    if(!text||text.length>60||/x/i.test(text))throw Error('Use a constant x coordinate (example: 1/2 or pi).');
    let value;
    try{value=compileExpression(text,'x')(0);}catch{throw Error('Invalid x coordinate: '+text);}
    if(!finite(value))throw Error('Point must be a finite real number: '+text);
    return value===0?0:value;
}
export function parseVariationPoints(input,kind){
    if(!VARIATION_KINDS.includes(kind))throw Error('Invalid point type.');
    if(Array.isArray(input))return input.map(value=>({x:coordinate(value),label:String(value).slice(0,60),kind}));
    if(!validText(input??'',1500))throw Error('Invalid point list.');
    return String(input||'').split(/[,;\n]+/).map(text=>text.trim()).filter(Boolean).map(label=>({x:coordinate(label),label,kind}));
}
export function variationKey(left,right){
    return (left===null?'-inf':String(left))+'|'+(right===null?'+inf':String(right));
}
export function createVariationSpec(config={}){
    const points=[];
    for(const [field,kind] of [['zeros','zero'],['undefinedPoints','undefined'],
        ['derivativeUndefined','derivativeUndefined'],['secondZeros','secondZero'],
        ['secondUndefined','secondUndefined']])
        points.push(...parseVariationPoints(config[field]||'',kind));
    const bound=v=>v===null||v===undefined||v===''?null:coordinate(v);
    const spec={version:1,mode:config.mode||'extrema',session:config.session||'teacher',
        functionSource:String(config.functionSource||'').trim(),
        derivativeSource:String(config.derivativeSource||'').trim(),
        secondSource:String(config.secondSource||'').trim(),
        points,domain:{min:bound(config.domainMin),max:bound(config.domainMax),
            minClosed:config.minClosed===true,maxClosed:config.maxClosed===true},
        samples:{},autoSigns:config.autoSigns===true,
        reveal:{signs:config.reveal?.signs!==false,arrows:config.reveal?.arrows!==false,
            conclusions:config.reveal?.conclusions!==false},
        assumeContinuous:config.assumeContinuous===true};
    validateVariationSpec(spec);return spec;
}
export function validateVariationSpec(spec){
    if(!spec||typeof spec!=='object'||spec.version!==1||
        !VARIATION_MODES.includes(spec.mode)||!VARIATION_SESSIONS.includes(spec.session)||
        typeof spec.autoSigns!=='boolean'||typeof spec.assumeContinuous!=='boolean')
        throw Error('Invalid variation-table configuration.');
    for(const k of ['functionSource','derivativeSource','secondSource'])
        if(!validText(spec[k]))throw Error('Invalid function expression.');
    if(!Array.isArray(spec.points)||spec.points.length>MAX_POINTS*4)throw Error('Too many variation-table points.');
    for(const point of spec.points)
        if(!point||!finite(point.x)||!VARIATION_KINDS.includes(point.kind)||
            !validText(point.label,60))throw Error('Invalid variation-table point.');
    const d=spec.domain;
    if(!d||!['min','max'].every(k=>d[k]===null||finite(d[k]))||
        typeof d.minClosed!=='boolean'||typeof d.maxClosed!=='boolean'||
        d.min!==null&&d.max!==null&&d.min>=d.max)
        throw Error('Invalid variation-table domain.');
    if(!spec.reveal||!['signs','arrows','conclusions'].every(k=>typeof spec.reveal[k]==='boolean'))
        throw Error('Invalid reveal settings.');
    if(!spec.samples||typeof spec.samples!=='object'||Array.isArray(spec.samples)||
        Object.keys(spec.samples).length>MAX_POINTS+1)throw Error('Invalid interval answers.');
    for(const [key,s] of Object.entries(spec.samples)){
        if(key.length>80||!s||typeof s!=='object'||Array.isArray(s)||
            (s.x!==undefined&&!finite(s.x))||
            !['+','-','?',''].includes(s.sign??'')||
            !['+','-','?',''].includes(s.secondSign??''))
            throw Error('Invalid interval answer.');
    }
    if(spec.graphId!==undefined&&(typeof spec.graphId!=='string'||spec.graphId.length>100))
        throw Error('Invalid linked graph.');
    if(new Set(spec.points.map(p=>p.x)).size>MAX_POINTS)throw Error('Use at most 24 distinct points.');
    // Parse expressions early to keep backups safe; no eval or generated code.
    for(const key of ['functionSource','derivativeSource','secondSource'])
        if(spec[key])compileExpression(spec[key],'x');
    return spec;
}
export function variationBreakpoints(spec){
    const byX=new Map();
    for(const point of spec.points){
        const p=byX.get(point.x)||{x:point.x,label:point.label,kinds:[]};
        if(!p.kinds.includes(point.kind))p.kinds.push(point.kind);
        byX.set(point.x,p);
    }
    for(const x of [spec.domain.min,spec.domain.max]){
        if(x===null)continue;
        const p=byX.get(x)||{x,label:String(x),kinds:[]};
        if(!p.kinds.includes('domainBoundary'))p.kinds.push('domainBoundary');
        byX.set(x,p);
    }
    const points=[...byX.values()].sort((a,b)=>a.x-b.x);
    if(points.some(p=>p.kinds.includes('undefined')&&p.kinds.some(k=>['zero','secondZero'].includes(k))))
        throw Error('An undefined function point cannot be a derivative zero.');
    return points;
}
export function variationDomainContains(spec,x){
    const d=spec.domain;
    if(d.min!==null&&(x<d.min||x===d.min&&!d.minClosed))return false;
    if(d.max!==null&&(x>d.max||x===d.max&&!d.maxClosed))return false;
    return !spec.points.some(p=>p.kind==='undefined'&&p.x===x);
}
function signOf(n){return !Number.isFinite(n)?'?':n>1e-10?'+':n< -1e-10?'-':'?';}
export function variationIntervals(spec,points=variationBreakpoints(spec)){
    const nodes=[null,...points.map(p=>p.x),null];
    let first=null,second=null;
    if(spec.autoSigns){
        if(spec.derivativeSource)first=compileExpression(spec.derivativeSource,'x');
        if(spec.secondSource)second=compileExpression(spec.secondSource,'x');
    }
    return nodes.slice(0,-1).map((left,i)=>{
        const right=nodes[i+1],key=variationKey(left,right),saved=spec.samples[key]||{};
        const x=saved.x??(left===null&&right===null?0:left===null?right-1:right===null?left+1:(left+right)/2);
        if(!(left===null||x>left)||!(right===null||x<right))
            throw Error('A test point must be strictly inside its interval.');
        const active=variationDomainContains(spec,x);
        const numeric=(fn)=>{try{return fn?signOf(fn(x)):'?';}catch{return '?';}};
        return {key,left,right,x,active,
            sign:active?(saved.sign||numeric(first)):'?',secondSign:active?(saved.secondSign||numeric(second)):'?',
            numericSign:active?numeric(first):'?',numericSecondSign:active?numeric(second):'?'};
    });
}
export function analyzeVariation(spec){
    validateVariationSpec(spec);
    const points=variationBreakpoints(spec),intervals=variationIntervals(spec,points);
    const fn=spec.functionSource?compileExpression(spec.functionSource,'x'):null;
    const results=points.map((p,i)=>{
        const defined=variationDomainContains(spec,p.x),left=intervals[i],right=intervals[i+1];
        const pair=left.active&&right.active?[left.sign,right.sign]:['?','?'];
        const secondPair=left.active&&right.active?[left.secondSign,right.secondSign]:['?','?'];
        let extremum=null,inflection=false;
        if(defined&&p.kinds.some(k=>k==='zero'||k==='derivativeUndefined')){
            if(pair[0]==='-'&&pair[1]==='+')extremum='min';
            else if(pair[0]==='+'&&pair[1]==='-')extremum='max';
        }
        if(defined&&spec.assumeContinuous&&p.kinds.some(k=>k==='secondZero'||k==='secondUndefined'))
            inflection=secondPair[0]==='+'&&secondPair[1]==='-'||
                secondPair[0]==='-'&&secondPair[1]==='+';
        let value=null;
        if(defined&&fn){try{const v=fn(p.x);if(Number.isFinite(v))value=v;}catch{}}
        return {...p,defined,extremum,inflection,value};
    });
    return {points:results,intervals,columns:intervals.length+points.length,
        note:'Sampled signs are numerical evidence, not proof over an entire interval.'};
}
