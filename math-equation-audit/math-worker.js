/** SymPy runs inside this Worker via Pyodide; never invokes a server API. */
let pyodidePromise;
async function engine() {
    if (!pyodidePromise) pyodidePromise = (async () => {
        const {loadPyodide} = await import('https://cdn.jsdelivr.net/pyodide/v0.28.3/full/pyodide.mjs');
        const py = await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.28.3/full/'});
        await py.loadPackage('sympy');
        const source = await fetch(new URL('./mathcheck.py', self.location.href));
        if (!source.ok) throw new Error('Unable to load verified math parser');
        py.FS.writeFile('/home/pyodide/mathcheck.py', await source.text());
        py.runPython(`import sys\nsys.path.insert(0, '/home/pyodide')\nfrom mathcheck import check_equation\nimport json`);
        return py;
    })();
    return pyodidePromise;
}
self.onmessage = async ({data}) => {
    const {id,latex} = data || {};
    try {
        if (typeof latex !== 'string' || latex.length > 900) throw new Error('Invalid LaTeX input');
        const py = await engine();
        py.globals.set('user_latex', latex);
        const answer = py.runPython('json.dumps(check_equation(user_latex))');
        self.postMessage({id,result:JSON.parse(answer)});
    } catch(error) {
        pyodidePromise = null;
        self.postMessage({id,error:String(error.message || error)});
    }
};
