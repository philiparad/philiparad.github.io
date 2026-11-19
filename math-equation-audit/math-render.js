/** Safe presentation of OCR hypotheses: MathJax renders LaTeX without changing saved data. */
const latest=new WeakMap();
let readyPromise;

export function latexForMathJax(source){
    let text=String(source||'').trim();
    // Remove *only* a matching outer delimiter; preserve internal mathematics verbatim.
    if(text.startsWith('\\[')&&text.endsWith('\\]'))text=text.slice(2,-2).trim();
    else if(text.startsWith('\\(')&&text.endsWith('\\)'))text=text.slice(2,-2).trim();
    else if(text.startsWith('$$')&&text.endsWith('$$'))text=text.slice(2,-2).trim();
    else if(text.startsWith('$')&&text.endsWith('$')&&text.length>2)text=text.slice(1,-1).trim();
    return text;
}

export function waitForMathJax(){
    if(readyPromise)return readyPromise;
    readyPromise=new Promise((resolve,reject)=>{
        const script=document.getElementById('mathjax-script');
        if(!script){reject(new Error('MathJax script is missing'));return;}
        let finished=false;
        const stop=(error)=>{if(finished)return;finished=true;clearTimeout(timer);
            script.removeEventListener('load',probe);script.removeEventListener('error',onError);
            error?reject(error):resolve(window.MathJax);
        };
        const probe=()=>{
            if(typeof window.MathJax?.tex2svgPromise!=='function')return;
            Promise.resolve(window.MathJax.startup?.promise).then(()=>stop()).catch(stop);
        };
        const onError=()=>stop(new Error('Could not load MathJax from CDN'));
        script.addEventListener('load',probe);script.addEventListener('error',onError);
        const timer=setTimeout(()=>stop(new Error('MathJax loading timed out')),20000);
        probe();
    }).catch(error=>{readyPromise=null;throw error;});
    return readyPromise;
}

export async function renderMath(target,raw){
    const id=(latest.get(target)||0)+1;latest.set(target,id);
    const latex=latexForMathJax(raw);
    target.replaceChildren();target.setAttribute('dir','ltr');
    if(!latex){target.textContent='—';return false;}
    target.textContent='Loading mathematical preview…';
    try{
        const mathjax=await waitForMathJax();
        const svg=await mathjax.tex2svgPromise(latex,{display:true});
        if(latest.get(target)!==id)return false;
        target.replaceChildren(svg);
        target.dataset.renderStatus='ready';
        return true;
    }catch(error){
        if(latest.get(target)!==id)return false;
        target.replaceChildren();target.appendChild(Object.assign(document.createElement('pre'),{textContent:raw}));
        const warning=document.createElement('small');warning.className='math-render-error';
        warning.textContent='MathJax unavailable or unsupported LaTeX: '+String(error.message||error);
        target.appendChild(warning);target.dataset.renderStatus='error';
        return false;
    }
}
