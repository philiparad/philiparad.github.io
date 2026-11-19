/** Pure shared MathAudit rules. No backend and no external dependencies. */
export const CHECKS = ['source', 'symbols', 'fractions', 'domain'];
export const MAX_PAGES_PER_FILE = 30;
export const MAX_FILE_BYTES = 35 * 1024 * 1024;
export const SCHEMA = 1;
export const OCR_ENGINES = ['texify2', 'texteller', 'mathpix'];

export function uid() {
    return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function normalizeForComparison(s = '') {
    let result = String(s).trim();
    for (const cmd of ['\\left', '\\right', '\\displaystyle', '\\,', '\\;', '\\!']) {
        result = result.split(cmd).join('');
    }
    return result.replaceAll('\\dfrac', '\\frac').replaceAll('\\tfrac', '\\frac')
        .replaceAll('−', '-').replaceAll('\\(', '').replaceAll('\\)', '')
        .replace(/\s+/g, '').replace(/^\$+|\$+$/g, '');
}

export function disagreement(ocr = {}) {
    const candidates = Object.values(ocr).filter(v => v && typeof v.latex === 'string' && v.latex.trim());
    if (candidates.length < 2) return null;
    const variants = new Set(candidates.map(v => normalizeForComparison(v.latex)));
    return variants.size > 1;
}

export function reviewIsValid(record) {
    return !!record && !!String(record.finalLatex || '').trim()
        && !!String(record.review?.reviewer || '').trim()
        && CHECKS.every(key => record.review?.checks?.[key] === true);
}

export function verifiedRecord(record, reviewer, checks, notes = '', sourceError = false, now = new Date().toISOString()) {
    const updated = {
        ...record, notes: String(notes), sourceError: !!sourceError,
        review: { reviewer: String(reviewer).trim(), checks: {...checks}, reviewedAt: now },
        status: 'verified', updatedAt: now,
    };
    if (!reviewIsValid(updated)) throw new Error('All four checks, reviewer and LaTeX are required');
    return updated;
}

/** Any change to recognized/final math invalidates previous human verification. */
export function updateTranscript(record, latex, now = new Date().toISOString()) {
    const value = String(latex);
    if (value === record.finalLatex) return {...record};
    return {...record, finalLatex: value, analysis: null, status: 'needs_review', review: null, updatedAt: now};
}

export function parseExpectedNumbers(text, limit = 1000) {
    const s = String(text || '').trim();
    if (!s) return [];
    const tokens = s.split(/[,،;\n]+/).map(v => v.trim()).filter(Boolean);
    const seen = new Set();
    for (const token of tokens) {
        const match = token.match(/^(\d+)\s*[-–]\s*(\d+)$/);
        if (match) {
            const start = Number(match[1]), end = Number(match[2]);
            if (end < start || end - start > limit) throw new Error('Invalid exercise range');
            for (let n = start; n <= end; n++) seen.add(String(n));
        } else if (/^[\p{L}\p{N}][\p{L}\p{N}\s._-]{0,45}$/u.test(token)) {
            seen.add(token);
        } else {
            throw new Error(`Invalid exercise label: ${token}`);
        }
        if (seen.size > limit) throw new Error('Too many exercise numbers');
    }
    return [...seen];
}

export function coverageReport(expectedText, questions) {
    const expected = parseExpectedNumbers(expectedText);
    const actual = questions.map(q => String(q.label || '').trim()).filter(Boolean);
    const counts = new Map();
    actual.forEach(n => counts.set(n, (counts.get(n) || 0) + 1));
    const reference = new Set(expected);
    return {
        expected,
        missing: expected.filter(n => !counts.has(n)),
        duplicate: [...counts.entries()].filter(([, count]) => count > 1).map(([n]) => n),
        unexpected: expected.length ? [...counts.keys()].filter(n => !reference.has(n)) : [],
    };
}

export function clampCrop(rect, naturalWidth, naturalHeight) {
    const W = Math.max(1, Math.round(naturalWidth)), H = Math.max(1, Math.round(naturalHeight));
    const x0 = Math.max(0, Math.min(W, Math.floor(Math.min(rect.x0, rect.x1))));
    const y0 = Math.max(0, Math.min(H, Math.floor(Math.min(rect.y0, rect.y1))));
    const x1 = Math.max(0, Math.min(W, Math.ceil(Math.max(rect.x0, rect.x1))));
    const y1 = Math.max(0, Math.min(H, Math.ceil(Math.max(rect.y0, rect.y1))));
    if (x1 - x0 < 12 || y1 - y0 < 12) throw new Error('Selection too small');
    return {x:x0, y:y0, width:x1-x0, height:y1-y0};
}

export function latexRows(questions, verifiedOnly = true) {
    return questions.filter(q => !verifiedOnly || (q.status === 'verified' && reviewIsValid(q))).map(q => ({
        id: q.id, pageId: q.pageId, label: String(q.label || ''), latex: String(q.finalLatex || ''),
        status: q.status, reviewer: q.review?.reviewer || '', reviewedAt: q.review?.reviewedAt || '',
        sourceError: !!q.sourceError, notes: q.notes || '',
        ocr: q.ocr || {}, analysis: q.analysis || null,
    }));
}

export function csvEscape(value) {
    let s = String(value ?? '');
    // Prevent spreadsheet programs from treating untrusted OCR results as formulas.
    if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
}

export function toCSV(rows) {
    const fields = ['id','pageId','label','latex','status','reviewer','reviewedAt','sourceError','notes'];
    return '\uFEFF' + fields.join(',') + '\r\n' + rows.map(row => fields.map(f => csvEscape(row[f])).join(',')).join('\r\n');
}

export function toTeX(rows) {
    return rows.map(q => `% Page ${String(q.pageId).replace(/\n/g,' ')} - Q ${String(q.label).replace(/\n/g,' ')} (${q.status})\n\\[\n${q.latex}\n\\]`).join('\n\n');
}

export function validateBackupManifest(manifest) {
    if (!manifest || manifest.schema !== SCHEMA || !Array.isArray(manifest.pages) || !Array.isArray(manifest.questions)) {
        throw new Error('Unsupported or damaged MathAudit backup');
    }
    if (manifest.pages.length > 5000 || manifest.questions.length > 100000) throw new Error('Backup exceeds safety limits');
    const ids = new Set();
    for (const page of manifest.pages) {
        if (!/^[A-Za-z0-9-]{1,90}$/.test(page.id) || ids.has(page.id)) throw new Error('Invalid page ID');
        ids.add(page.id);
    }
    const questionIds = new Set();
    for (const question of manifest.questions) {
        if (!/^[A-Za-z0-9-]{1,90}$/.test(question.id) || questionIds.has(question.id) || !ids.has(question.pageId)) {
            throw new Error('Backup question references invalid page');
        }
        questionIds.add(question.id);
    }
    return true;
}
