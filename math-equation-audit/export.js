import {SCHEMA, latexRows, toCSV, toTeX, validateBackupManifest} from './core.js';
const ZIP_MODULE = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm';
let zipLib;
async function getZip() {if (!zipLib) zipLib=import(ZIP_MODULE);return (await zipLib).default;}

function downloadBlob(blob,name) {
    const url=URL.createObjectURL(blob), link=document.createElement('a');
    link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export function exportPlain(type,questions,verifiedOnly=true) {
    const rows=latexRows(questions,verifiedOnly);
    if (!rows.length) throw new Error('No equations match this export filter');
    let content,mime;
    if (type==='csv') {content=toCSV(rows);mime='text/csv;charset=utf-8';}
    else if (type==='tex') {content=toTeX(rows);mime='text/plain;charset=utf-8';}
    else if (type==='json') {content=JSON.stringify({schema:SCHEMA,exportedAt:new Date().toISOString(),rows},null,2);mime='application/json';}
    else throw new Error('Unknown export type');
    downloadBlob(new Blob([content],{type:mime}),`mathaudit-${verifiedOnly?'verified':'all'}.${type}`);
}

function safeMeta(entry) {const {blob,ocrBlob, ...rest}=entry;return rest;}

export async function exportZip(pages,questions,{verifiedOnly=true,backup=false}={}) {
    const JSZip=await getZip(), zip=new JSZip();
    const selected=backup ? questions : questions.filter(q=>!verifiedOnly||q.status==='verified');
    if (!selected.length && !backup) throw new Error('No verified equations to export');
    const pageIds=new Set(selected.map(q=>q.pageId));
    const includedPages=backup ? pages : pages.filter(p=>pageIds.has(p.id));
    const manifest={schema:SCHEMA,createdAt:new Date().toISOString(),backup,verifiedOnly:!backup&&verifiedOnly,
        pages:includedPages.map(safeMeta),questions:selected.map(safeMeta)};
    for (const p of includedPages) zip.file(`pages/${p.id}.png`,p.blob);
    for (const q of selected) {
        zip.file(`crops/${q.id}.png`,q.blob);
        if(q.ocrBlob)zip.file(`ocr-crops/${q.id}.png`,q.ocrBlob);
    }
    zip.file('manifest.json',JSON.stringify(manifest,null,2));
    zip.file('equations.csv',toCSV(latexRows(selected,false)));
    zip.file('equations.tex',toTeX(latexRows(selected,false)));
    const result=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
    downloadBlob(result,backup?'mathaudit-full-backup.zip':'mathaudit-verified-export.zip');
}

export async function loadBackup(file) {
    if (!(file instanceof Blob) || file.size>350*1024*1024) throw new Error('Invalid or oversized backup');
    const JSZip=await getZip();
    const zip=await JSZip.loadAsync(file,{checkCRC32:true});
    const entry=zip.file('manifest.json');
    if (!entry) throw new Error('Missing manifest.json');
    const manifest=JSON.parse(await entry.async('string'));
    if (!manifest.backup) throw new Error('This is an export, not a full backup');
    validateBackupManifest(manifest);
    const pages=[],questions=[];
    for(const p of manifest.pages) {
        const img=zip.file(`pages/${p.id}.png`);
        if(!img) throw new Error(`Missing page image ${p.id}`);
        pages.push({...p,blob:await img.async('blob')});
    }
    for(const q of manifest.questions) {
        const img=zip.file(`crops/${q.id}.png`);
        if(!img) throw new Error(`Missing crop image ${q.id}`);
        const mathImage=zip.file(`ocr-crops/${q.id}.png`);
        const {ocrBlob,...meta}=q; // Ignore malformed Blob metadata from older backups.
        questions.push({...meta,blob:await img.async('blob'),
            ...(mathImage?{ocrBlob:await mathImage.async('blob')}:{})});
    }
    return {pages,questions};
}
