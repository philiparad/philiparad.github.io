/** Durable, local-only storage of page/crop Blobs and review records. */
const DB = 'mathaudit-browser-v1';
const VERSION = 1;
let openPromise;

export function openDatabase() {
    if (!('indexedDB' in globalThis)) return Promise.reject(new Error('IndexedDB is unavailable. Use HTTPS and a current browser.'));
    if (!openPromise) openPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB, VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('pages')) db.createObjectStore('pages', {keyPath:'id'});
            if (!db.objectStoreNames.contains('questions')) {
                const questions = db.createObjectStore('questions', {keyPath:'id'});
                questions.createIndex('pageId','pageId');
            }
        };
        req.onsuccess = () => { const db=req.result; db.onversionchange=()=>db.close(); resolve(db); };
        req.onerror = () => {openPromise=null;reject(req.error);};
        req.onblocked = () => {openPromise=null;reject(new Error('Close other MathAudit tabs before updating the database.'));};
    });
    return openPromise;
}

function transactionResult(db, stores, mode, operation) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(stores, mode);
        let value;
        tx.oncomplete = () => resolve(value);
        tx.onerror = () => reject(tx.error || new Error('Storage transaction failed'));
        tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted'));
        try { operation(tx, result => {value=result;}); } catch(e) { try{tx.abort();}catch{} reject(e); }
    });
}

export async function listPages() {
    const db = await openDatabase();
    return transactionResult(db, ['pages'], 'readonly', (tx,set) => {tx.objectStore('pages').getAll().onsuccess = e => set(e.target.result);});
}
export async function listQuestions() {
    const db = await openDatabase();
    return transactionResult(db, ['questions'], 'readonly', (tx,set) => {tx.objectStore('questions').getAll().onsuccess = e => set(e.target.result);});
}
export async function savePage(page) {
    const db = await openDatabase();
    return transactionResult(db, ['pages'], 'readwrite', tx => tx.objectStore('pages').put(page));
}
export async function saveQuestion(question) {
    const db = await openDatabase();
    return transactionResult(db, ['questions'], 'readwrite', tx => tx.objectStore('questions').put(question));
}
export async function deleteQuestion(id) {
    const db = await openDatabase();
    return transactionResult(db, ['questions'], 'readwrite', tx => tx.objectStore('questions').delete(id));
}
export async function deletePage(id) {
    const db = await openDatabase();
    const questions = await listQuestions();
    return transactionResult(db, ['pages','questions'], 'readwrite', tx => {
        tx.objectStore('pages').delete(id);
        for (const q of questions.filter(q => q.pageId === id)) tx.objectStore('questions').delete(q.id);
    });
}
/** Atomic restore; caller explicitly confirmed replacing existing local work. */
export async function replaceAll(pages, questions) {
    const db = await openDatabase();
    return transactionResult(db, ['pages','questions'], 'readwrite', tx => {
        const ps = tx.objectStore('pages'), qs = tx.objectStore('questions');
        ps.clear(); qs.clear();
        for (const p of pages) ps.put(p);
        for (const q of questions) qs.put(q);
    });
}

export async function storageEstimate() {
    const e = await navigator.storage?.estimate?.().catch(()=>null);
    const persisted = await navigator.storage?.persisted?.().catch(()=>false);
    return {used:e?.usage||0, quota:e?.quota||0, persisted:!!persisted};
}
export async function requestPersistentStorage() {
    return !!await navigator.storage?.persist?.();
}
