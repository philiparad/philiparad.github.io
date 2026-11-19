/** Worker RPC: do not freeze UI during SymPy downloads/analysis. */
let worker;
const pending = new Map();
let sequence=0;
export function analyzeLatex(latex) {
    if (!worker) {
        worker = new Worker(new URL('./math-worker.js', import.meta.url), {type:'module'});
        worker.onmessage = ({data}) => {
            const item=pending.get(data.id);
            if (!item) return;
            pending.delete(data.id);
            if (data.error) item.reject(new Error(data.error));
            else item.resolve(data.result);
        };
        worker.onerror = e => {
            for (const entry of pending.values()) entry.reject(new Error(e.message || 'Math worker failed'));
            pending.clear();
            worker.terminate();worker=null;
        };
    }
    return new Promise((resolve,reject)=>{
        const id=++sequence;
        pending.set(id,{resolve,reject});
        worker.postMessage({id,latex});
    });
}
