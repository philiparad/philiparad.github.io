import {el} from './ui.js?v=20261121-tables';
import {createVariationSpec,analyzeVariation,coordinate,variationKey} from './variation-table-model.js?v=20261121-tables';

const GROUPS=[
    ['zeros','אפסי הנגזרת הראשונה'],
    ['undefinedPoints','נקודות מחוץ לתחום ההגדרה'],
    ['derivativeUndefined','הנגזרת הראשונה אינה מוגדרת (הפונקציה כן)'],
    ['secondZeros','אפסי הנגזרת השנייה'],
    ['secondUndefined','הנגזרת השנייה אינה מוגדרת']
];
const entries=(spec,kind)=>(spec?.points||[]).filter(p=>p.kind===kind).map(p=>p.label).join(', ');
function select(options,value){
    const s=el('select');for(const [id,label] of options){const o=el('option',label);o.value=id;s.append(o);}
    s.value=value;return s;
}
function control(label,node){
    const l=el('label',null,'variation-field');l.append(el('span',label),node);return l;
}
function flag(label,checked){
    const input=el('input');input.type='checkbox';input.checked=checked;
    const wrapper=el('label',null,'variation-flag');wrapper.append(input,el('span',label));return {input,wrapper};
}
function input(value=''){
    const t=el('input');t.type='text';t.value=value;t.dir='ltr';t.autocomplete='off';return t;
}
// All source strings and point lists are textContent / input.value; never innerHTML.
export function variationDialog(existing=null,graphs=[]){
    const d=el('dialog',null,'form-dialog variation-dialog'),form=el('form'),
        heading=el('h2',existing?'עריכת טבלת חקירת פונקציה':'יצירת טבלת חקירת פונקציה'),
        note=el('p','הכניסו את הנקודות החשובות. המערכת תסדר אותן ותציע ערך בדיקה בכל מרווח.','muted'),
        grid=el('div',null,'variation-fields'),inputs={};
    form.noValidate=true;
    const mode=select([['extrema','עלייה, ירידה וקיצון'],['inflection','קעירות ופיתול'],
        ['combined','טבלה משולבת']],existing?.mode||'extrema');
    const session=select([['teacher','מצב מורה'],['student','מצב תלמיד'],['check','מצב בדיקה']],
        existing?.session||'teacher');
    const graphSelect=select([['','ללא קישור'],...graphs.map(g=>[
        g.id,'גרף: '+(g.title||g.id.slice(0,8))])],existing?.graphId||'');
    grid.append(control('סוג הטבלה',mode),control('מצב עבודה',session),
        control('קישור לגרף בלוח (אופציונלי)',graphSelect));
    for(const [id,label,value] of [
        ['functionSource','f(x)',existing?.functionSource||''],
        ['pointValueText','ערכי פונקציה בנקודות (x=value; ...)',Object.entries(existing?.pointValues||{}).map(([x,v])=>x+'='+v).join('; ')],
        ['derivativeSource',"f'(x)",existing?.derivativeSource||''],
        ['secondSource',"f''(x)",existing?.secondSource||''],
        ...GROUPS.map(([id,label])=>[id,label,entries(existing,
            id==='zeros'?'zero':id==='undefinedPoints'?'undefined':
            id==='derivativeUndefined'?'derivativeUndefined':id==='secondZeros'?'secondZero':'secondUndefined')]),
        ['domainMin','תחום: גבול שמאלי (אופציונלי)',existing?.domain.min??''],
        ['domainMax','תחום: גבול ימני (אופציונלי)',existing?.domain.max??'']]){
        const field=input(value);field.placeholder=id.startsWith('domain')?'ללא גבול':
            id.includes('Source')?'2*x-3':'לדוגמה: -2, 1, 2, 4';
        inputs[id]=field;
        const wrap=control(label,field);wrap.dataset.variationField=id;grid.append(wrap);
    }
    const flags=el('div',null,'variation-flags'),
        minClosed=flag('הגבול השמאלי כלול',existing?.domain.minClosed===true),
        maxClosed=flag('הגבול הימני כלול',existing?.domain.maxClosed===true),
        auto=flag('בדיקת סימנים מהביטוי (בדיקה מספרית)',existing?.autoSigns===true),
        continuous=flag('להניח רציפות בנקודות המוגדרות לצורך פיתול',existing?.assumeContinuous===true),
        signs=flag('הצג סימני נגזרת',existing?.reveal.signs!==false),
        arrows=flag('הצג חצים / קעירות',existing?.reveal.arrows!==false),
        conclusions=flag('הצג מסקנות',existing?.reveal.conclusions!==false);
    for(const flag of [minClosed,maxClosed,auto,continuous,signs,arrows,conclusions])
        flags.append(flag.wrapper);
    const preview=el('div',null,'variation-preview'),error=el('p',null,'error'),actions=el('div',null,'actions');
    const previewButton=el('button','בנה / עדכן עמודות');previewButton.type='button';
    const cancel=el('button','ביטול');cancel.type='button';
    const save=el('button',existing?'עדכן טבלה':'הוסף טבלה','primary');save.type='submit';
    actions.append(previewButton,cancel,save);
    form.append(heading,note,grid,flags,preview,el('p',
        'סימן שמחושב בערך בדיקה הוא כלי עזר; כדי לקבוע סימן על מרווח שלם יש לנמק מתמטית. Shift+לחיצה על עמודת ביניים בלוח תסמן את x בגרף המקושר.','muted'),error,actions);
    d.append(form);d.dir='rtl';document.body.append(d);
    const samples=structuredClone(existing?.samples||{});
    const config=()=>({
        mode:mode.value,session:session.value,graphId:graphSelect.value,
        ...Object.fromEntries(Object.entries(inputs).map(([id,node])=>[id,node.value])),
        minClosed:minClosed.input.checked,maxClosed:maxClosed.input.checked,
        autoSigns:auto.input.checked,assumeContinuous:continuous.input.checked,
        reveal:{signs:signs.input.checked,arrows:arrows.input.checked,conclusions:conclusions.input.checked}
    });
    const make=()=>{
        const spec=createVariationSpec(config());spec.samples=structuredClone(samples);
        const available=new Set(analyzeVariation({...spec,samples:{}}).intervals.map(i=>i.key));
        spec.samples=Object.fromEntries(Object.entries(spec.samples).filter(([k])=>available.has(k)));
        analyzeVariation(spec);return spec;
    };
    function redraw(){
        try{
            error.textContent='';
            const spec=make(),a=analyzeVariation(spec);
            const table=el('table',null,'variation-preview-table'),header=el('thead'),hr=el('tr');
            for(const title of ['מרווח','ערך בדיקה','סימן f′','סימן f″','מילוי אוטומטי']){
                const th=el('th',title);hr.append(th);
            }
            header.append(hr);table.append(header);
            const body=el('tbody');
            for(const it of a.intervals){
                if(!it.active)continue;
                const tr=el('tr'),interval=el('td',
                    '('+(it.left===null?'−∞':it.left)+', '+(it.right===null?'∞':it.right)+')');
                const x=el('td'),test=input(String(samples[it.key]?.x??it.x));
                test.setAttribute('aria-label','ערך בדיקה עבור '+interval.textContent);
                test.onchange=()=>{const n=coordinate(test.value);const entry=samples[it.key]||{};samples[it.key]={...entry,x:n};};
                x.append(test);const signsCell=el('td'),secondCell=el('td');
                function setSign(cell,key,selected){
                    const node=select([['','?'],['+','+'],['-','−'],['?','לא ידוע']],selected||'');
                    node.setAttribute('aria-label',key==='sign'?"סימן נגזרת ראשונה":"סימן נגזרת שנייה");
                    node.onchange=()=>{samples[it.key]={...samples[it.key],[key]:node.value};};
                    cell.append(node);
                }
                setSign(signsCell,'sign',samples[it.key]?.sign);
                setSign(secondCell,'secondSign',samples[it.key]?.secondSign);
                const computed=el('td',spec.session==='student'?'מוסתר במצב תלמיד':spec.autoSigns||spec.session==='check'?'f′: '+it.numericSign+' | f″: '+it.numericSecondSign:'—');
                tr.append(interval,x,signsCell,secondCell,computed);body.append(tr);
            }
            table.append(body);
            const wrapper=el('div',null,'variation-preview-scroll');wrapper.append(table);
            preview.replaceChildren(el('h3','עמודות ביניים ובדיקת סימנים'),wrapper);
        }catch(e){error.textContent=e.message;}
    }
    const updateMode=()=>{
        const second=mode.value!=='extrema';
        for(const id of ['secondSource','secondZeros','secondUndefined'])
            inputs[id].closest('[data-variation-field]').hidden=!second;
        continuous.wrapper.hidden=!second;
        redraw();
    };
    mode.onchange=updateMode;
    session.onchange=()=>{
        if(session.value==='student'){
            signs.input.checked=true;arrows.input.checked=false;conclusions.input.checked=false;
        }else if(session.value==='teacher'){
            signs.input.checked=true;arrows.input.checked=true;conclusions.input.checked=true;
        }
        redraw();
    };
    previewButton.onclick=redraw;
    cancel.onclick=()=>d.close();
    const done=new Promise(resolve=>{
        let result=null;
        form.onsubmit=e=>{
            e.preventDefault();
            try{result=make();error.textContent='';d.close();}
            catch(err){error.textContent=err.message;}
        };
        d.onclose=()=>{d.remove();resolve(result);};
    });
    d.showModal();updateMode();return done;
}
