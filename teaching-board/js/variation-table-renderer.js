import {analyzeVariation,validateVariationSpec} from './variation-table-model.js?v=20261121-tables';

export function variationLayout(spec,w=900,h=310){
    const count=2*new Set(spec.points.map(p=>p.x).concat(
        [spec.domain.min,spec.domain.max].filter(n=>n!==null))).size+1;
    const first=Math.max(92,Math.min(160,w*.20)),cell=(w-first)/count;
    const mode=spec.mode,keys=mode==='combined'?['x','first','trend','second','concavity']:
        mode==='inflection'?['x','second','concavity']:['x','first','trend'];
    const weights=keys.map(k=>k==='x'?.20:k==='trend'?.29:k==='concavity'?.28:.26);
    const total=weights.reduce((a,b)=>a+b,0),rows=[];
    let y=0;
    for(let i=0;i<keys.length;i++){
        const height=i===keys.length-1?h-y:h*weights[i]/total;
        rows.push({key:keys[i],y,h:height});y+=height;
    }
    return {count,first,cell,rows};
}
export function createVariationItem(spec,center={x:400,y:240},width=null){
    validateVariationSpec(spec);
    const n=new Set([...spec.points.map(p=>p.x),spec.domain.min,spec.domain.max].filter(v=>v!==null)).size;
    const w=width||Math.min(1500,Math.max(620,170+(2*n+1)*65));
    const h=spec.mode==='combined'?445:300;
    return {id:crypto.randomUUID(),type:'variationTable',x:center.x-w/2,y:center.y-h/2,
        w,h,rotation:0,locked:false,spec:structuredClone(spec)};
}
export function renderVariationTable(item,svgEl){
    const spec=item.spec,a=analyzeVariation(spec),layout=variationLayout(spec,item.w,item.h);
    const g=svgEl('g',{'data-variation-table':'',role:'img','aria-label':'Function variation sign table',
        'font-family':'Arial, sans-serif'});
    const {first,cell,rows}=layout,slotCount=2*a.points.length+1;
    const rect=(x,y,w,h,fill,stroke='none',sw=0)=>svgEl('rect',{x,y,width:w,height:h,
        fill,stroke,'stroke-width':sw});
    const line=(x1,y1,x2,y2,stroke='#334459',sw=1.2)=>svgEl('line',{x1,y1,x2,y2,stroke,'stroke-width':sw});
    const text=(x,y,value,size=16,color='#203954',extra={})=>{
        const t=svgEl('text',{x,y,'text-anchor':'middle','dominant-baseline':'middle',
            'font-size':size,fill:color,'xml:space':'preserve',...extra});
        t.textContent=String(value);return t;
    };
    g.append(rect(0,0,item.w,item.h,'#ffffff'));
    for(let k=0;k<a.points.length;k++){
        const p=a.points[k],x=first+(k*2+1)*cell;
        if(!p.defined)g.append(rect(x,0,cell,item.h,'#b8d4eb'));
        else if(p.kinds.includes('domainBoundary'))g.append(rect(x,0,cell,item.h,'#eff4f9'));
    }
    g.append(rect(0,0,first,item.h,'#f3f7fb'));
    const header=rows.find(r=>r.key==='x');
    for(const r of rows){
        const middle=r.y+r.h/2,baseFont=Math.min(22,r.h*.26);
        const label=r.key==='x'?'x':r.key==='first'?"f′(x)":
            r.key==='trend'?'f(x)':r.key==='second'?"f″(x)":'קעירות';
        g.append(text(first/2,middle-9,label,Math.max(16,baseFont),'#175a87',
            {'font-weight':'bold'}));
        const source=r.key==='first'?spec.derivativeSource:r.key==='second'?spec.secondSource:
            r.key==='trend'?spec.functionSource:'';
        if(source&&first>105){
            const display=source.length>22?source.slice(0,21)+'…':source;
            g.append(text(first/2,middle+20,display,Math.min(11,first/Math.max(display.length*.57,1)),
                '#526a7e',{'direction':'ltr'}));
        }
    }
    const signSize=Math.max(13,Math.min(27,cell*.48));
    const tiny=Math.max(9,Math.min(14,cell*.28));
    for(let i=0;i<a.intervals.length;i++){
        const interval=a.intervals[i],x=first+(i*2+.5)*cell;
        g.append(text(x,header.y+header.h/2,String(Number(interval.x.toPrecision(7))),tiny,'#566d83'));
        if(!interval.active)continue;
        for(const r of rows){
            if(!spec.reveal.signs)continue;
            const sign=r.key==='first'?interval.sign:r.key==='second'?interval.secondSign:null;
            if(sign!==null){
                const verdict=r.key==='first'?interval.firstVerified:interval.secondVerified;
                const color=verdict===false?'#c0392b':verdict===true?'#178251':
                    sign==='-'?'#c44861':sign==='+'?'#4b3991':'#7c8793';
                g.append(text(x,r.y+r.h/2,sign,signSize,color,{'font-weight':'bold'}));
                if(spec.session==='check'&&verdict!==null)
                    g.append(text(x+cell*.3,r.y+r.h*.23,verdict?'✓':'×',tiny,
                        verdict?'#178251':'#c0392b'));
            }
        }
        const trend=rows.find(r=>r.key==='trend');
        if(trend&&spec.reveal.arrows&&['+','-'].includes(interval.sign)){
            const increase=interval.sign==='+',x1=x-cell*.30,x2=x+cell*.30;
            const top=trend.y+trend.h*.25,bottom=trend.y+trend.h*.75;
            const y1=increase?bottom:top,y2=increase?top:bottom;
            g.append(svgEl('path',{d:'M'+x1+' '+y1+'L'+x2+' '+y2,
                stroke:'#13283b','stroke-width':Math.max(1.5,Math.min(3,cell*.055)),fill:'none'}));
            const head=increase?-1:1;
            g.append(svgEl('path',{d:'M'+x2+' '+y2+'l'+(-cell*.13)+' '+(-head*trend.h*.08)+
                'l'+(cell*.04)+' '+(-head*trend.h*.055)+'l'+(cell*.13)+' '+(head*trend.h*.13)+'Z',
                fill:'#13283b'}));
        }
        const concavity=rows.find(r=>r.key==='concavity');
        if(concavity&&spec.reveal.arrows&&['+','-'].includes(interval.secondSign))
            g.append(text(x,concavity.y+concavity.h/2,
                interval.secondSign==='+'?'∪':'∩',signSize,'#315780'));
    }
    for(let k=0;k<a.points.length;k++){
        const p=a.points[k],x=first+(2*k+1.5)*cell;
        g.append(text(x,header.y+header.h/2,p.label,tiny,p.defined?'#147d92':'#21577b',
            {'font-weight':'bold'}));
        for(const row of rows){
            let value='',color='#526a7e';
            if(row.key==='first'){
                if(p.kinds.includes('zero'))value='0';
                else if(p.kinds.includes('derivativeUndefined')&&p.defined)value='∅';
            }else if(row.key==='second'){
                if(p.kinds.includes('secondZero'))value='0';
                else if(p.kinds.includes('secondUndefined')&&p.defined)value='∅';
            }else if(row.key==='trend'&&p.defined){
                if(spec.reveal.conclusions&&p.extremum)value=p.extremum==='min'?'מינימום':'מקסימום';
                else if(spec.reveal.conclusions&&p.valueLabel)value=p.valueLabel;
                else if(spec.reveal.conclusions&&p.value!==null)value=String(Number(p.value.toPrecision(6)));
            }else if(row.key==='concavity'&&p.defined&&spec.reveal.conclusions&&p.inflection)
                value='פיתול';
            if(value)g.append(text(x,row.y+row.h/2,value,
                Math.max(10,Math.min(tiny,value.length>5?cell/(value.length*.55):signSize)),
                color,{'direction':/[א-ת]/.test(value)?'rtl':'ltr'}));
        }
    }
    for(let c=0;c<=slotCount;c++)g.append(line(first+c*cell,0,first+c*cell,item.h,
        '#334459',c===0?2:1.3));
    for(const r of rows.slice(1))g.append(line(0,r.y,item.w,r.y,'#334459',1.6));
    g.append(rect(0,0,item.w,item.h,'none','#253747',2.1));
    return g;
}
