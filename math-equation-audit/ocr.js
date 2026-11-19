/** Browser-only mathematical OCR. All results are unverified candidate transcripts. */
export const OCR_MODELS = Object.freeze({
    texify2: Object.freeze({id:'Xenova/texify2', dtype:'q8',
        expectedFiles:['onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx']}),
    texteller: Object.freeze({id:'onnx-community/TexTeller3-ONNX', dtype:'q8',
        expectedFiles:['onnx/encoder_model_quantized.onnx','onnx/decoder_model_merged_quantized.onnx']}),
});

let transformersPromise;
const pipelines = new Map();
function getTransformers(){
    if(!transformersPromise){
        transformersPromise=import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2')
            .catch(e=>{transformersPromise=null;throw e;});
    }
    return transformersPromise;
}

async function getPipeline(engine, progress=()=>{}){
    const model=OCR_MODELS[engine];
    if(!model)throw new Error(`Unknown OCR engine: ${engine}`);
    if(!pipelines.has(engine)){
        const pending=(async()=>{
            const {pipeline}=await getTransformers();
            // Explicit q8: these repos contain the quantized encoder and *merged* decoder.
            // TexTeller-ONNX (v2) does NOT contain the merged decoder requested by v4.
            const prefersGPU=localStorage.getItem('mathAuditWebGPU')==='true' && !!navigator.gpu;
            const options={dtype:model.dtype,progress_callback:progress};
            if(prefersGPU){
                try{return await pipeline('image-to-text',model.id,{...options,device:'webgpu'});}
                catch(error){
                    progress({status:'info',message:'WebGPU failed; retrying with WASM'});
                }
            }
            try{return await pipeline('image-to-text',model.id,{...options,device:'wasm'});}
            catch(error){
                if(/ModelFileNotFoundError|Could not locate file/i.test(String(error))) {
                    throw new Error(`${engine}: missing ONNX model asset. Expected ${model.expectedFiles.join(' and ')} in ${model.id}. ${String(error.message||error)}`);
                }
                throw error;
            }
        })();
        pipelines.set(engine,pending);
        pending.catch(()=>{if(pipelines.get(engine)===pending)pipelines.delete(engine);});
    }
    return pipelines.get(engine);
}

/** Compute conservative processing dimensions; never stretch aspect ratios. */
export function imagePreparationDimensions(width,height){
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)
        throw new Error('Invalid crop dimensions');
    // Upscale tiny crops modestly, and cap very large ones for browser memory safety.
    const safeScale=Math.min(2.5,Math.max(1,100/height),1900/Math.max(width,height));
    const w=Math.max(1,Math.round(width*safeScale)),h=Math.max(1,Math.round(height*safeScale));
    const pad=Math.max(8,Math.round(Math.min(w,h)*0.08));
    return {width:w+2*pad,height:h+2*pad,innerWidth:w,innerHeight:h,pad};
}

/** Add a white margin; preserve source pixels separately. This is not a correctness filter. */
export async function prepareFormulaImage(blob){
    if(!(blob instanceof Blob))throw new Error('No math image selected');
    const image=await createImageBitmap(blob);
    try{
        const d=imagePreparationDimensions(image.width,image.height);
        const canvas=document.createElement('canvas');canvas.width=d.width;canvas.height=d.height;
        const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas 2D is unavailable');
        ctx.fillStyle='#ffffff';ctx.fillRect(0,0,d.width,d.height);
        ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
        ctx.drawImage(image,d.pad,d.pad,d.innerWidth,d.innerHeight);
        return await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Failed to prepare OCR image')),'image/png'));
    }finally{image.close?.();}
}

export function assessOCRResult(latex){
    const source=String(latex||'').trim();
    if(!source)return {usable:false,warning:'OCR returned no text'};
    if(source.length>4000)return {usable:false,warning:'OCR produced an unusually long result. Check crop size and repeat.'};
    if(/(?:<script|<html|\uFFFD)/i.test(source))return {usable:false,warning:'OCR output contains invalid or unexpected text.'};
    if(!/[=+\-*/^_\\\d\u221a\u03c0\u222b\u2211]/.test(source) && /[a-z]{4,}\s+[a-z]{4,}/i.test(source))
        return {usable:true,warning:'The output resembles prose, not a mathematical formula. Use a math-only crop.'};
    return {usable:true,warning:null};
}

export async function recognizeLocal(engine,crop,progress=()=>{}){
    if(!(crop instanceof Blob))throw new Error('No equation crop selected');
    const prepared=await prepareFormulaImage(crop);
    const pipe=await getPipeline(engine,progress);
    const url=URL.createObjectURL(prepared);
    try{
        const result=await pipe(url,{max_new_tokens:512});
        const raw=(Array.isArray(result)?result[0]?.generated_text:result?.generated_text)??'';
        const latex=String(raw).trim();
        const quality=assessOCRResult(latex);
        if(!quality.usable)throw new Error(`${engine}: ${quality.warning}`);
        return {latex,provider:engine,model:OCR_MODELS[engine].id,confidence:null,
            warning:quality.warning, time:new Date().toISOString()};
    }finally{URL.revokeObjectURL(url);}
}

function toDataURL(blob){return new Promise((resolve,reject)=>{
    const reader=new FileReader();reader.onerror=()=>reject(reader.error);
    reader.onload=()=>resolve(String(reader.result));reader.readAsDataURL(blob);
});}

export async function recognizeMathpix(crop,appToken){
    const token=String(appToken||'').trim();
    if(!token)throw new Error('Add a short-lived Mathpix app_token in Settings');
    if(!(crop instanceof Blob))throw new Error('No equation crop selected');
    const payload={src:await toDataURL(crop),formats:['text'],ocr:['math','text'],
        math_inline_delimiters:['$','$'],rm_spaces:false};
    let response;
    try{response=await fetch('https://api.mathpix.com/v3/text',{method:'POST',
        headers:{app_token:token,'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'});}
    catch(error){throw new Error(`Mathpix request failed (network/CORS): ${error.message}`);}
    const data=await response.json().catch(()=>({}));
    if(!response.ok||data.error)throw new Error(`Mathpix ${response.status}: ${String(data.error||data.message||'Request failed').slice(0,200)}`);
    const latex=String(data.text||data.latex_styled||'').trim();
    const quality=assessOCRResult(latex);
    if(!quality.usable)throw new Error(`Mathpix: ${quality.warning}`);
    return {latex,provider:'mathpix',confidence:data.confidence??null,warning:quality.warning,
        time:new Date().toISOString()};
}
