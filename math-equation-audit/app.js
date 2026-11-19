import {
    uid, SCHEMA, MAX_FILE_BYTES, MAX_PAGES_PER_FILE, CHECKS,
    normalizeForComparison, disagreement, verifiedRecord, updateTranscript,
    coverageReport, clampCrop
} from './core.js';
import {
    openDatabase, listPages, listQuestions, savePage, saveQuestion,
    deletePage, deleteQuestion, replaceAll, requestPersistentStorage, storageEstimate
} from './storage.js';
import {recognizeLocal, recognizeMathpix} from './ocr.js';
import {analyzeLatex} from './math-client.js';
import {exportZip, exportPlain, loadBackup} from './export.js';
import {renderMath} from './math-render.js';

const $ = id => document.getElementById(id);
const state={pages:[],questions:[],pageId:null,questionId:null,pageURL:null,cropURL:null,zoomURL:null,
    crop:null,dragStart:null,dragging:false,ocrDragStart:null,ocrSelection:null,ocrDragging:false,
    ocrCropActive:false,ocrPreparedURL:null,busy:false,token:'',lang:localStorage.getItem('mathAuditLang')||'he',
    dirty:false,noticeTimer:null,previewTimer:null};
const I18N={
    en:{tagline:'Extract, compare and visually verify equations — without a server',private:'🔒 Stored only in this browser',
        settings:'Settings',backup:'Full backup',export:'Export equations',import:'＋ Import image or PDF',sample:'Load synthetic demo',
        sourcePages:'Source pages',questions:'Questions',selectPage:'Select a page to get started',step1:'Step 1 · Select source',
        sourceScan:'Original scan',deletePage:'Delete page',cropHelp:'Choose a page and drag a box around an entire question, including number, numerators, denominators and powers.',
        start:'Upload a scan to start',startHelp:'Or open the synthetic demo',questionNumber:'Question #',saveCrop:'Create question from crop',
        clearCrop:'Clear selection',expected:'Expected exercise numbers',coverage:'Check coverage',step2:'Steps 2–4 · OCR, review and approval',
        review:'Equation verification',chooseQuestion:'Choose a question to edit and verify',original:'Unmodified original crop',zoom:'View at full resolution',
        ocr:'Independent OCR engines',ocrHint:'Machine output is not verified',latex:'Editable final LaTeX',save:'Save transcription',
        checkMath:'Algebraic check',preview:'Rendered mathematical preview',reviewChecklist:'Mandatory human verification',
        reviewExplain:'Compare the equation visually with its original image. Agreement between OCR engines is not sufficient.',
        checkSource:'I compared the entire equation with the original',checkSymbols:'I checked every digit, sign and exponent',
        checkFractions:'I checked brackets, fractions, numerators and denominators',checkDomain:'I checked the domain and excluded values, where applicable',
        reviewer:'Reviewer name',notes:'Notes',sourceError:'Possible error in the source textbook',verify:'Confirm visual verification',
        reopen:'Reopen review',deleteQuestion:'Delete question',footer:'Scans stay on this device. Export a full backup regularly.',
        settingsExpl:'ONNX OCR runs locally on your device. The first model download may exceed 300 MB. Formula-only crops work better than full textbook questions. A crop is sent externally only when you press Mathpix.',
        webgpu:'Try WebGPU acceleration (fall back to WASM)',mathpixToken:'Temporary Mathpix app_token (not an API key)',
        tokenExpl:'Never enter a long-lived app_key! A temporary token is held only in tab memory. Obtain it from a trusted token issuer.',
        persist:'Request persistent browser storage',close:'Close',includePending:'Include unverified questions (clearly labeled)',
        restore:'Restore complete ZIP backup',restoreWarn:'Restoring will replace all local data after confirmation.',
        ocrCropTitle:'Select math-only OCR region',ocrCropRemove:'Use complete question again',
        ocrCropHint:'For better OCR, select ONLY one equation on the question image — no Hebrew text or exercise number. Original scan stays unchanged.',
        ocrSelected:'Math-only recognition image (independent of original):'},
    he:{}
};
function T(key){return I18N[state.lang]?.[key]||key;}
function notify(text,error=false){
    const e=$('notice');e.hidden=false;e.textContent=String(text);e.classList.toggle('error',error);
    clearTimeout(state.noticeTimer);state.noticeTimer=setTimeout(()=>e.hidden=true,6000);
}
function fmtDate(s){return s?new Date(s).toLocaleDateString(state.lang==='he'?'he-IL':'en-US'):'';}
function makeButton(label,css,onClick){const b=document.createElement('button');b.type='button';b.textContent=label;b.className=css||'';b.addEventListener('click',onClick);return b;}
function textNode(tag,str,css){const e=document.createElement(tag);e.textContent=str;if(css)e.className=css;return e;}
function existingPage(){return state.pages.find(p=>p.id===state.pageId)||null;}
function existingQuestion(){return state.questions.find(q=>q.id===state.questionId)||null;}
function pageQuestions(){return state.questions.filter(q=>q.pageId===state.pageId).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));}
function setBusy(value){
    state.busy=!!value;
    for(const id of ['importBtn','fileInput','sampleBtn','cropBtn','ocrCropBtn','ocrResetBtn','texifyBtn','textellerBtn','mathpixBtn','saveBtn','checkMathBtn','verifyBtn','backupBtn']) {
        const el=$(id);if(el)el.disabled=state.busy||(id==='cropBtn'&&!state.crop)||(id==='cropBtn'&&!existingPage());
    }
}
function localize(){
    // Preserve the authored Hebrew strings so switching English back to Hebrew works.
    for(const el of document.querySelectorAll('[data-i18n]')) {
        const key=el.dataset.i18n;
        if(!(key in I18N.he)) {
            const child=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
            if(child) I18N.he[key]=child.textContent.trim();
        }
    }
    document.documentElement.lang=state.lang; document.documentElement.dir=state.lang==='he'?'rtl':'ltr';
    for(const el of document.querySelectorAll('[data-i18n]')){
        const val=I18N[state.lang]?.[el.dataset.i18n]; if(!val)continue;
        const child=[...el.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
        if(child)child.textContent=val;
        else if(!el.children.length)el.textContent=val;
    }
    $('langBtn').textContent=state.lang==='he'?'EN':'עב';
}
function labelStatus(status){return status==='verified'?(state.lang==='he'?'אומת חזותית':'Verified'):(state.lang==='he'?'לבדיקה':'Needs review');}
function renderPageList(){
    const list=$('pageList');list.replaceChildren();$('pageCount').textContent=String(state.pages.length);
    for(const page of state.pages){
        const b=makeButton('','entry'+(page.id===state.pageId?' active':''),()=>{if(!state.busy)selectPage(page.id);});
        b.append(textNode('span',`${page.name} · ${page.pageNo||1}`),textNode('span',String(state.questions.filter(q=>q.pageId===page.id).length),'minor'));
        list.appendChild(b);
    }
    if(!state.pages.length)list.append(textNode('p',state.lang==='he'?'טרם נוספו סריקות':'No scans yet','empty'));
}
function renderQuestionList(){
    const list=$('questionList');list.replaceChildren();const qs=pageQuestions();$('questionCount').textContent=String(qs.length);
    for(const q of qs){
        const b=makeButton('','entry'+(q.id===state.questionId?' active':'')+(q.status==='verified'?' verified':''),()=>{if(!state.busy)selectQuestion(q.id);});
        b.append(textNode('span',`${state.lang==='he'?'שאלה':'Q'} ${q.label||'—'}`),textNode('span',q.status==='verified'?'✓': '○','minor'));
        list.appendChild(b);
    }
    if(!qs.length)list.append(textNode('p',state.lang==='he'?'אין שאלות בעמוד זה':'No questions on this page','empty'));
}
function revoke(url){if(url)URL.revokeObjectURL(url);}
function clearSelection(){
    state.crop=null;state.dragging=false;$('selection').hidden=true;
    $('cropBtn').disabled=true;$('resetCropBtn').disabled=true;
}
async function selectPage(id){
    if(state.dirty && !confirm(state.lang==='he'?'יש שינויים שלא נשמרו. להמשיך?':'Discard unsaved changes?'))return;
    clearSelection();state.pageId=id;state.questionId=null;state.dirty=false;
    revoke(state.pageURL);state.pageURL=null;
    const page=existingPage();
    $('emptyStage').hidden=!!page;$('imageWrap').hidden=!page;
    $('deletePageBtn').disabled=!page;$('coverageBtn').disabled=!page;
    $('expectedInput').value=page?.expected||'';$('coverageResult').textContent='';
    if(page){state.pageURL=URL.createObjectURL(page.blob);$('pageImage').src=state.pageURL;}
    else $('pageImage').removeAttribute('src');
    renderPageList();renderQuestionList();renderReview();
}
function selectQuestion(id){
    if(state.busy)return;
    if(state.dirty && !confirm(state.lang==='he'?'יש שינויים שלא נשמרו. להמשיך?':'Discard unsaved changes?'))return;
    state.questionId=id;state.dirty=false;renderQuestionList();renderReview();
}
function renderReview(){
    const q=existingQuestion();
    $('reviewEmpty').hidden=!!q;$('reviewContent').hidden=!q;
    const badge=$('reviewBadge');badge.textContent=q?labelStatus(q.status):'—';
    badge.className='status-pill '+(!q?'neutral':q.status==='verified'?'verified':'pending');
    revoke(state.cropURL);state.cropURL=null;
    revoke(state.ocrPreparedURL);state.ocrPreparedURL=null;
    state.ocrCropActive=false;state.ocrSelection=null;state.ocrDragging=false;
    $('ocrCropStage').hidden=true;$('ocrCropBtn').setAttribute('aria-pressed','false');
    $('ocrSelection').hidden=true;
    if(!q){$('ocrResults').replaceChildren();$('ocrSelected').hidden=true;return;}
    state.cropURL=URL.createObjectURL(q.blob);$('cropImage').src=state.cropURL;
    $('ocrFullImage').src=state.cropURL;
    $('ocrSelected').hidden=!q.ocrBlob;
    $('ocrResetBtn').disabled=!q.ocrBlob;
    if(q.ocrBlob){state.ocrPreparedURL=URL.createObjectURL(q.ocrBlob);$('ocrSelectedImage').src=state.ocrPreparedURL;}
    else $('ocrSelectedImage').removeAttribute('src');
    $('latexInput').value=q.finalLatex||'';$('notesInput').value=q.notes||'';
    $('reviewerInput').value=q.review?.reviewer||'';$('sourceErrorInput').checked=!!q.sourceError;
    CHECKS.forEach(key=>$('check'+key.charAt(0).toUpperCase()+key.slice(1)).checked=!!q.review?.checks?.[key]);
    renderOCR(q);renderAnalysis(q.analysis);preview();
}
function renderOCR(q){
    const el=$('ocrResults');el.replaceChildren();
    const names={texify2:'Texify2 · ONNX',texteller:'TexTeller3 · ONNX',mathpix:'Mathpix · API'};
    for(const engine of ['texify2','texteller','mathpix']){
        const obj=q.ocr?.[engine];if(!obj?.latex)continue;
        const block=document.createElement('div');block.className='ocr-result';
        const head=document.createElement('div');head.className='head';
        head.append(textNode('strong',names[engine]),makeButton(state.lang==='he'?'העתק לעריכה':'Use transcription','ghost',()=>{
            $('latexInput').value=obj.latex;
            $('latexInput').dispatchEvent(new Event('input',{bubbles:true}));
        }));
        const raw=textNode('pre',obj.latex);raw.setAttribute('dir','ltr');
        const math=document.createElement('div');math.className='ocr-math-output';math.setAttribute('dir','ltr');
        block.append(head,raw,math);
        if(obj.warning)block.append(textNode('p','⚠ '+obj.warning,'ocr-warning'));
        el.append(block);void renderMath(math,obj.latex);
    }
    const status=$('ocrComparison');status.className='comparison';status.textContent='';
    const comparison=disagreement(q.ocr||{});
    if(comparison===true){status.classList.add('alert');status.textContent=state.lang==='he'?'⚠ המנועים אינם מסכימים. נדרש אימות ידני מדויק.':'⚠ OCR engines disagree; carefully review the original.';}
    if(comparison===false){status.classList.add('good');status.textContent=state.lang==='he'?'התמלולים תואמים, אך עדיין נדרש אימות אנושי.':'OCR outputs agree, but human verification is still required.';}
}
function renderAnalysis(data){
    const el=$('analysisResult');el.textContent='';
    if(!data)return;
    const lines=[state.lang==='he'?'ניתוח אלגברי (לא אישור OCR):':'Symbolic analysis (not OCR validation):'];
    if(!data.supported)lines.push(state.lang==='he'?'סוג הביטוי אינו נתמך אוטומטית.':'Unsupported expression');
    if(data.solutions?.length)lines.push((state.lang==='he'?'פתרונות אפשריים: ':'Candidate roots: ')+data.solutions.join(', '));
    if(data.excluded?.length)lines.push((state.lang==='he'?'ערכים אסורים: ':'Excluded roots: ')+data.excluded.join(', '));
    if(data.domain_conditions?.length)lines.push((state.lang==='he'?'תנאי תחום: ':'Domain conditions: ')+data.domain_conditions.join(', '));
    lines.push(...(data.notes||[]));el.textContent=lines.join('\n');
}
async function preview(){
    const target=$('mathPreview'),latex=$('latexInput').value.trim();
    await renderMath(target,latex);
}
function sourceXY(event){
    const img=$('pageImage'),r=img.getBoundingClientRect();
    return {x:Math.min(img.naturalWidth,Math.max(0,(event.clientX-r.left)/r.width*img.naturalWidth)),
        y:Math.min(img.naturalHeight,Math.max(0,(event.clientY-r.top)/r.height*img.naturalHeight))};
}
function drawSelection(){
    const c=state.crop,sel=$('selection'),img=$('pageImage');
    if(!c)return;
    const box=img.getBoundingClientRect(),wrap=$('imageWrap').getBoundingClientRect();
    sel.style.left=(box.left-wrap.left+c.x0/img.naturalWidth*box.width)+'px';
    sel.style.top=(box.top-wrap.top+c.y0/img.naturalHeight*box.height)+'px';
    sel.style.width=((c.x1-c.x0)/img.naturalWidth*box.width)+'px';
    sel.style.height=((c.y1-c.y0)/img.naturalHeight*box.height)+'px';
    sel.hidden=false;
}
function initDrag(){
    const wrap=$('imageWrap');
    wrap.addEventListener('pointerdown',e=>{
        if(!existingPage()||state.busy||e.button!==0)return;
        e.preventDefault();wrap.setPointerCapture(e.pointerId);
        state.dragging=true;state.dragStart=sourceXY(e);state.crop=null;$('selection').hidden=true;
    });
    wrap.addEventListener('pointermove',e=>{
        if(!state.dragging)return;
        const end=sourceXY(e),p=state.dragStart;
        state.crop={x0:Math.min(p.x,end.x),y0:Math.min(p.y,end.y),x1:Math.max(p.x,end.x),y1:Math.max(p.y,end.y)};
        drawSelection();
    });
    const end=e=>{
        if(!state.dragging)return;
        state.dragging=false;
        try{
            const rect=clampCrop(state.crop||{...state.dragStart,x1:state.dragStart.x,y1:state.dragStart.y},$('pageImage').naturalWidth,$('pageImage').naturalHeight);
            state.crop={x0:rect.x,y0:rect.y,x1:rect.x+rect.width,y1:rect.y+rect.height};
            drawSelection();$('cropBtn').disabled=false;$('resetCropBtn').disabled=false;
        }catch{clearSelection();}
    };
    wrap.addEventListener('pointerup',end);wrap.addEventListener('pointercancel',()=>clearSelection());
    window.addEventListener('resize',drawSelection);
}
function ocrSourceXY(event){
    const img=$('ocrFullImage'),r=img.getBoundingClientRect();
    return {x:Math.min(img.naturalWidth,Math.max(0,(event.clientX-r.left)/r.width*img.naturalWidth)),
        y:Math.min(img.naturalHeight,Math.max(0,(event.clientY-r.top)/r.height*img.naturalHeight))};
}
function drawOCRSelection(){
    const c=state.ocrSelection,sel=$('ocrSelection'),img=$('ocrFullImage');
    if(!c||!img.naturalWidth)return;
    const box=img.getBoundingClientRect(),wrap=$('ocrImageWrap').getBoundingClientRect();
    sel.style.left=(box.left-wrap.left+c.x0/img.naturalWidth*box.width)+'px';
    sel.style.top=(box.top-wrap.top+c.y0/img.naturalHeight*box.height)+'px';
    sel.style.width=(c.x1-c.x0)/img.naturalWidth*box.width+'px';
    sel.style.height=(c.y1-c.y0)/img.naturalHeight*box.height+'px';
    sel.hidden=false;
}
function initOCRSelection(){
    const wrap=$('ocrImageWrap');
    wrap.addEventListener('pointerdown',e=>{
        if(!state.ocrCropActive||!existingQuestion()||state.busy||e.button!==0)return;
        e.preventDefault();wrap.setPointerCapture(e.pointerId);
        state.ocrDragging=true;state.ocrDragStart=ocrSourceXY(e);state.ocrSelection=null;$('ocrSelection').hidden=true;
    });
    wrap.addEventListener('pointermove',e=>{
        if(!state.ocrDragging)return;
        const end=ocrSourceXY(e),p=state.ocrDragStart;
        state.ocrSelection={x0:Math.min(p.x,end.x),y0:Math.min(p.y,end.y),
            x1:Math.max(p.x,end.x),y1:Math.max(p.y,end.y)};
        drawOCRSelection();
    });
    wrap.addEventListener('pointercancel',()=>{state.ocrDragging=false;state.ocrSelection=null;$('ocrSelection').hidden=true;});
    wrap.addEventListener('pointerup',()=>{
        if(!state.ocrDragging)return;
        state.ocrDragging=false;
        guard(saveOCRSubcrop);
    });
    window.addEventListener('resize',drawOCRSelection);
}
async function saveOCRSubcrop(){
    const original=existingQuestion();if(!original||!state.ocrSelection)return;
    if(state.dirty)throw new Error('Save your edited transcription before changing the OCR crop');
    const img=await createImageBitmap(original.blob);
    try{
        const area=clampCrop(state.ocrSelection,img.width,img.height);
        const canvas=document.createElement('canvas');canvas.width=area.width;canvas.height=area.height;
        canvas.getContext('2d').drawImage(img,area.x,area.y,area.width,area.height,0,0,area.width,area.height);
        const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('OCR crop failed')),'image/png'));
        // A change in the image used for OCR invalidates all earlier OCR hypotheses.
        const updated={...original,ocrBlob:blob,ocrBox:area,ocr:{},review:null,status:'needs_review',
            analysis:null,updatedAt:new Date().toISOString()};
        await saveQuestion(updated);replaceQuestion(updated);state.dirty=false;
        notify(state.lang==='he'?'אזור מתמטי נשמר לזיהוי; הזיהויים הקודמים נוקו.':'Math-only crop saved; old OCR suggestions cleared.');
    }finally{img.close?.();}
}
async function clearOCRSubcrop(){
    const original=existingQuestion();if(!original)return;
    if(state.dirty)throw new Error('Save your edited transcription before changing the OCR crop');
    const {ocrBlob,ocrBox,...rest}=original;
    const updated={...rest,ocr:{},review:null,status:'needs_review',analysis:null,updatedAt:new Date().toISOString()};
    await saveQuestion(updated);replaceQuestion(updated);state.dirty=false;
    notify(state.lang==='he'?'הזיהוי ישתמש שוב בשאלה המלאה.':'OCR reset to the complete question image.');
}
async function cropSelected(){
    const p=existingPage();if(!p||!state.crop)throw new Error('Select a crop on the scanned page');
    const label=$('labelInput').value.trim();if(!label)throw new Error('Enter the printed question number');
    const img=await createImageBitmap(p.blob);
    try{
        const area=clampCrop(state.crop,img.width,img.height);
        const canvas=document.createElement('canvas');canvas.width=area.width;canvas.height=area.height;
        canvas.getContext('2d',{willReadFrequently:true}).drawImage(img,area.x,area.y,area.width,area.height,0,0,area.width,area.height);
        const blob=await new Promise((res,rej)=>canvas.toBlob(v=>v?res(v):rej(new Error('Could not crop image')),'image/png'));
        const now=new Date().toISOString();
        const q={id:uid(),pageId:p.id,label,box:area,blob,ocr:{},finalLatex:'',status:'needs_review',review:null,
            analysis:null,sourceError:false,notes:'',createdAt:now,updatedAt:now};
        await saveQuestion(q);state.questions.push(q);clearSelection();$('labelInput').value='';
        selectQuestion(q.id);notify(state.lang==='he'?'השאלה נוצרה ונשמרה בדפדפן':'Question saved locally');
    }finally{img.close?.();}
}
async function pdfToPages(file){
    const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@6.5.438/build/pdf.worker.mjs';
    const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    if(pdf.numPages>MAX_PAGES_PER_FILE)throw new Error(`PDF contains ${pdf.numPages} pages; maximum is ${MAX_PAGES_PER_FILE} per file`);
    const results=[];
    for(let n=1;n<=pdf.numPages;n++){
        notify(`PDF: ${n}/${pdf.numPages}`);
        const page=await pdf.getPage(n);
        const native=page.getViewport({scale:1});
        const scale=Math.min(2.5,3000/Math.max(native.width,native.height));
        const view=page.getViewport({scale});
        const canvas=document.createElement('canvas');canvas.width=Math.floor(view.width);canvas.height=Math.floor(view.height);
        await page.render({canvasContext:canvas.getContext('2d'),viewport:view}).promise;
        const blob=await new Promise((res,rej)=>canvas.toBlob(v=>v?res(v):rej(new Error('PDF render failed')),'image/png'));
        results.push({name:file.name,pageNo:n,blob});page.cleanup();
    }
    await pdf.destroy();return results;
}
async function importFiles(files){
    if(!files.length)return;
    setBusy(true);let imported=0;
    try{
        for(const file of files){
            if(file.size>MAX_FILE_BYTES)throw new Error(`File exceeds 35 MB: ${file.name}`);
            let records=[];
            if(file.type==='application/pdf'||/\.pdf$/i.test(file.name))records=await pdfToPages(file);
            else if(['image/png','image/jpeg','image/webp'].includes(file.type))records=[{name:file.name,pageNo:1,blob:file}];
            else throw new Error(`Unsupported file type: ${file.name}`);
            for(const rec of records){
                const page={id:uid(),...rec,expected:'',createdAt:new Date().toISOString()};
                await savePage(page);state.pages.push(page);imported++;
                if(!state.pageId)state.pageId=page.id;
            }
        }
        setBusy(false);await selectPage(state.pageId);notify(`${imported} ${state.lang==='he'?'עמודים נשמרו בדפדפן':'pages saved in browser'}`);
        updateStorage();
    }finally{setBusy(false);$('fileInput').value='';}
}
function getCurrentReview(){
    const checks=Object.fromEntries(CHECKS.map(k=>[k,$('check'+k.charAt(0).toUpperCase()+k.slice(1)).checked]));
    return {checks,reviewer:$('reviewerInput').value.trim(),notes:$('notesInput').value,sourceError:$('sourceErrorInput').checked};
}
async function saveTranscript(){
    let q=existingQuestion();if(!q)throw new Error('Select a question');
    q=updateTranscript(q,$('latexInput').value);
    q.notes=$('notesInput').value;q.sourceError=$('sourceErrorInput').checked;
    await saveQuestion(q);replaceQuestion(q);state.dirty=false;
    notify(state.lang==='he'?'התמלול נשמר בדפדפן':'Transcription saved locally');
}
function replaceQuestion(q){
    const i=state.questions.findIndex(other=>other.id===q.id);
    if(i>=0)state.questions[i]=q;
    renderQuestionList();renderReview();
}
async function recognize(engine){
    const original=existingQuestion();if(!original)throw new Error('Select a question');
    if(state.dirty)throw new Error('Save your edited transcription before running OCR');
    setBusy(true);
    try{
        let result;
        if(engine==='mathpix'){
            if(!state.token) { $('settingsDialog').showModal();throw new Error('Add a temporary Mathpix app_token in Settings'); }
            notify(state.lang==='he'?'שולח חיתוך ל-Mathpix...':'Sending crop to Mathpix...');
            result=await recognizeMathpix(original.ocrBlob||original.blob,state.token);
        }else{
            notify(state.lang==='he'?'טוען מודל ONNX. ההורדה הראשונית עשויה להיות גדולה...':'Loading ONNX model (first download can be large)...');
            result=await recognizeLocal(engine,original.ocrBlob||original.blob,p=>{
                if(p?.status==='progress'&&Number.isFinite(p.progress))notify(`${engine}: ${Math.round(p.progress)}%`);
                else if(p?.status==='info')notify(p.message);
            });
        }
        const fresh=existingQuestion();if(!fresh||fresh.id!==original.id)return;
        result.imageSource=original.ocrBlob?'math-only subcrop':'original question crop';
        const q={...fresh,ocr:{...(fresh.ocr||{}),[engine]:result},updatedAt:new Date().toISOString(),status:'needs_review',review:null};
        await saveQuestion(q);replaceQuestion(q);
        notify(`${engine}: ${state.lang==='he'?'הזיהוי הסתיים. נדרשת השוואה למקור.':'OCR finished; compare with original.'}`);
    }finally{setBusy(false);}
}
async function mathCheck(){
    const q=existingQuestion();if(!q)return;
    const latex=$('latexInput').value.trim();if(!latex)throw new Error('Enter LaTeX first');
    setBusy(true);notify(state.lang==='he'?'טוען Pyodide ו-SymPy בדפדפן...':'Loading Pyodide and SymPy locally...');
    try{
        const analysis=await analyzeLatex(latex);
        let updated=updateTranscript(q,latex);updated.analysis=analysis;
        await saveQuestion(updated);replaceQuestion(updated);state.dirty=false;
        notify(state.lang==='he'?'ניתוח אלגברי הושלם; אינו מאשר OCR':'Algebraic analysis completed; OCR still unverified');
    }finally{setBusy(false);}
}
async function verify(){
    let q=existingQuestion();if(!q)return;
    const latex=$('latexInput').value.trim();if(!latex)throw new Error('Enter the verified LaTeX');
    const r=getCurrentReview();
    q=updateTranscript(q,latex);
    q=verifiedRecord(q,r.reviewer,r.checks,r.notes,r.sourceError);
    await saveQuestion(q);replaceQuestion(q);state.dirty=false;
    notify(state.lang==='he'?'המשוואה סומנה כמאומתת חזותית':'Equation marked visually verified');
}
async function reopen(){
    let q=existingQuestion();if(!q)return;
    q={...q,status:'needs_review',review:null,updatedAt:new Date().toISOString()};
    await saveQuestion(q);replaceQuestion(q);state.dirty=false;
}
async function saveExpectedAndCoverage(){
    const p=existingPage();if(!p)return;
    p.expected=$('expectedInput').value.trim();
    const report=coverageReport(p.expected,pageQuestions());
    await savePage(p);
    $('coverageResult').textContent=[
        `${state.lang==='he'?'צפויות':'Expected'}: ${report.expected.length}`,
        `${state.lang==='he'?'חסרות':'Missing'}: ${report.missing.join(', ')||'—'}`,
        `${state.lang==='he'?'כפולות':'Duplicates'}: ${report.duplicate.join(', ')||'—'}`,
        `${state.lang==='he'?'לא צפויות':'Unexpected'}: ${report.unexpected.join(', ')||'—'}`,
    ].join('\n');
}
async function updateStorage(){
    const s=await storageEstimate().catch(()=>null);
    if(!s)return;
    const mb=n=>(n/1024/1024).toFixed(1)+' MB';
    $('storageStatus').textContent=`${mb(s.used)} ${state.lang==='he'?'בשימוש':'used'} / ${mb(s.quota)} · ${s.persisted?'✓':''}`;
}
async function loadDemo(){
    const response=await fetch('./demo_practice_page.png');
    if(!response.ok)throw new Error('Demo image missing');
    await importFiles([new File([await response.blob()],'demo_practice_page.png',{type:'image/png'})]);
}
function registerEvents(){
    $('importBtn').onclick=()=>$('fileInput').click();
    $('fileInput').onchange=()=>guard(()=>importFiles([...$('fileInput').files]));
    $('sampleBtn').onclick=()=>guard(loadDemo);
    $('cropBtn').onclick=()=>guard(cropSelected);
    $('ocrCropBtn').onclick=()=>{
        state.ocrCropActive=!state.ocrCropActive;
        $('ocrCropStage').hidden=!state.ocrCropActive;
        $('ocrCropBtn').setAttribute('aria-pressed',String(state.ocrCropActive));
    };
    $('ocrResetBtn').onclick=()=>guard(clearOCRSubcrop);
    $('resetCropBtn').onclick=clearSelection;
    $('coverageBtn').onclick=()=>guard(saveExpectedAndCoverage);
    $('deletePageBtn').onclick=()=>guard(async()=>{
        if(!confirm(state.lang==='he'?'למחוק עמוד וכל שאלותיו?':'Delete page and all its questions?'))return;
        const id=state.pageId;await deletePage(id);
        state.pages=state.pages.filter(p=>p.id!==id);state.questions=state.questions.filter(q=>q.pageId!==id);state.dirty=false;
        await selectPage(state.pages[0]?.id||null);updateStorage();
    });
    $('deleteQuestionBtn').onclick=()=>guard(async()=>{
        if(!confirm(state.lang==='he'?'למחוק את השאלה?':'Delete this question?'))return;
        const id=state.questionId;await deleteQuestion(id);
        state.questions=state.questions.filter(q=>q.id!==id);state.questionId=null;
        renderQuestionList();renderReview();updateStorage();
    });
    $('texifyBtn').onclick=()=>guard(()=>recognize('texify2'));
    $('textellerBtn').onclick=()=>guard(()=>recognize('texteller'));
    $('mathpixBtn').onclick=()=>guard(()=>recognize('mathpix'));
    $('latexInput').addEventListener('input',()=>{
        state.dirty=true;
        const q=existingQuestion();
        if(q&&$('latexInput').value!==q.finalLatex){
            $('reviewBadge').textContent=labelStatus('needs_review');$('reviewBadge').className='status-pill pending';
            CHECKS.forEach(key=>$('check'+key.charAt(0).toUpperCase()+key.slice(1)).checked=false);
        }
        clearTimeout(state.previewTimer);state.previewTimer=setTimeout(preview,250);
    });
    for(const id of ['reviewerInput','notesInput','sourceErrorInput',...CHECKS.map(k=>'check'+k.charAt(0).toUpperCase()+k.slice(1))]){
        $(id).addEventListener('input',()=>{state.dirty=true;});
    }
    $('saveBtn').onclick=()=>guard(saveTranscript);
    $('checkMathBtn').onclick=()=>guard(mathCheck);
    $('verifyBtn').onclick=()=>guard(verify);
    $('reopenBtn').onclick=()=>guard(reopen);
    $('settingsBtn').onclick=()=>$('settingsDialog').showModal();
    $('mathpixToken').addEventListener('input',e=>{state.token=e.target.value.trim();});
    $('gpuInput').checked=localStorage.getItem('mathAuditWebGPU')==='true';
    $('gpuInput').addEventListener('change',e=>localStorage.setItem('mathAuditWebGPU',String(e.target.checked)));
    $('persistBtn').onclick=()=>guard(async()=>notify(await requestPersistentStorage()?'Persistent storage granted':'Persistence request declined or unavailable'));
    $('langBtn').onclick=()=>{
        if(state.dirty&&!confirm(state.lang==='he'?'קיימים שינויים שלא נשמרו. להמשיך?':'Discard unsaved changes?'))return;
        state.dirty=false;
        state.lang=state.lang==='he'?'en':'he';localStorage.setItem('mathAuditLang',state.lang);
        localize();renderPageList();renderQuestionList();renderReview();updateStorage();
    };
    $('zoomBtn').onclick=()=>{
        const q=existingQuestion();if(!q)return;
        revoke(state.zoomURL);state.zoomURL=URL.createObjectURL(q.blob);
        $('zoomImage').src=state.zoomURL;$('zoomDialog').showModal();
    };
    $('zoomDialog').addEventListener('close',()=>{revoke(state.zoomURL);state.zoomURL=null;});
    $('backupBtn').onclick=()=>guard(()=>exportZip(state.pages,state.questions,{backup:true}));
    $('exportBtn').onclick=()=>$('exportDialog').showModal();
    for(const b of document.querySelectorAll('.close-dialog'))b.onclick=()=>b.closest('dialog').close();
    for(const b of document.querySelectorAll('[data-export]'))b.onclick=()=>guard(async()=>{
        const only=!$('includePending').checked;
        if(b.dataset.export==='zip')await exportZip(state.pages,state.questions,{verifiedOnly:only});
        else exportPlain(b.dataset.export,state.questions,only);
        $('exportDialog').close();
    });
    $('restoreBtn').onclick=()=>$('backupInput').click();
    $('backupInput').onchange=()=>guard(async()=>{
        const file=$('backupInput').files[0];if(!file)return;
        const restored=await loadBackup(file);
        if(!confirm(state.lang==='he'?'שחזור יחליף את כל הנתונים. להמשיך?':'Replace all local data with backup?'))return;
        await replaceAll(restored.pages,restored.questions);
        state.pages=restored.pages;state.questions=restored.questions;state.pageId=null;state.questionId=null;state.dirty=false;
        await selectPage(state.pages[0]?.id||null);$('exportDialog').close();
        notify(state.lang==='he'?'הגיבוי שוחזר':'Backup restored');updateStorage();
        $('backupInput').value='';
    });
    window.addEventListener('beforeunload',e=>{if(state.dirty){e.preventDefault();e.returnValue='';}});
    initDrag();initOCRSelection();
}
async function guard(fn){
    if(state.busy)return;
    try{await fn();}catch(err){console.error(err);notify(err?.message||String(err),true);}
}
async function boot(){
    registerEvents();localize();
    try{
        await openDatabase();
        [state.pages,state.questions]=await Promise.all([listPages(),listQuestions()]);
        state.pages.sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||''));
        await selectPage(state.pages[0]?.id||null);
        updateStorage();
    }catch(error){notify('Browser storage unavailable: '+error.message,true);}
}
boot();
