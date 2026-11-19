/** Inference is local via ONNX; external Mathpix requires ONLY a short-lived app_token. */
const MODELS = Object.freeze({texify2:'Xenova/texify2', texteller:'onnx-community/TexTeller-ONNX'});
let transformsPromise;
const pipelines = new Map();

function getTransformers() {
    if (!transformsPromise) {
        // Official Transformers.js browser ESM entry, pinned to a known version.
        transformsPromise = import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2');
    }
    return transformsPromise;
}

async function getPipeline(engine, progress = () => {}) {
    if (!MODELS[engine]) throw new Error(`Unknown OCR engine: ${engine}`);
    if (!pipelines.has(engine)) {
        const promise = (async () => {
            const {pipeline} = await getTransformers();
            // WASM works on more machines; WebGPU is an optional accelerator.
            const preferGPU = localStorage.getItem('mathAuditWebGPU') === 'true'
                && !!navigator.gpu;
            try {
                return await pipeline('image-to-text', MODELS[engine], {
                    device:preferGPU ? 'webgpu' : 'wasm',
                    progress_callback:p => progress(p),
                });
            } catch(error) {
                if (!preferGPU) throw error;
                progress({status:'info',message:'WebGPU unavailable; switching to CPU/WASM'});
                return pipeline('image-to-text', MODELS[engine], {device:'wasm',progress_callback:p => progress(p)});
            }
        })();
        pipelines.set(engine, promise);
        promise.catch(()=>pipelines.delete(engine));
    }
    return pipelines.get(engine);
}

export async function recognizeLocal(engine, crop, progress = () => {}) {
    if (!(crop instanceof Blob)) throw new Error('No question crop selected');
    const pipe = await getPipeline(engine, progress);
    const imageURL = URL.createObjectURL(crop);
    try {
        const result = await pipe(imageURL, {max_new_tokens:384});
        const latex = (Array.isArray(result) ? result[0]?.generated_text : result?.generated_text) || '';
        if (!String(latex).trim()) throw new Error(`${engine} returned an empty result`);
        return {latex:String(latex).trim(), provider:engine, confidence:null, time:new Date().toISOString()};
    } finally {URL.revokeObjectURL(imageURL);}
}

function toDataURL(blob) {
    return new Promise((resolve,reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
    });
}

export async function recognizeMathpix(crop, appToken) {
    const token = String(appToken || '').trim();
    if (!token) throw new Error('Paste a short-lived Mathpix app_token first');
    if (!(crop instanceof Blob)) throw new Error('No cropped image selected');
    const payload = {
        src:await toDataURL(crop), formats:['text'], ocr:['math','text'],
        math_inline_delimiters:['$','$'], rm_spaces:false,
    };
    let response;
    try {
        response = await fetch('https://api.mathpix.com/v3/text', {
            method:'POST',headers:{'app_token':token,'Content-Type':'application/json'},
            body:JSON.stringify(payload), cache:'no-store',
        });
    } catch(error) {
        throw new Error(`Mathpix network/CORS request failed: ${error.message}. Browser CORS must be allowed by provider.`);
    }
    let data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
        throw new Error(`Mathpix ${response.status}: ${String(data.error || data.message || 'Request failed').slice(0,200)}`);
    }
    const latex = String(data.text || data.latex_styled || '').trim();
    if (!latex) throw new Error('Mathpix returned no recognized equation');
    return {latex, provider:'mathpix', confidence:data.confidence ?? null, time:new Date().toISOString()};
}
