/**
 * TXT-065 — Shared local font fallback for editing, canvas measurements,
 * SVG rendering and printable/exported SVG.
 * Arial remains first for backward-compatible lesson appearance.
 */
export const TEXT_FONT_FAMILY='Arial, "Noto Sans Hebrew", "Noto Sans", "DejaVu Sans", sans-serif';

export function canvasTextFont(size,run={}){
    return `${run.italic?'italic':'normal'} ${run.bold?'700':'400'} ${size}px ${TEXT_FONT_FAMILY}`;
}
export function editableTextFont(size,style='normal'){
    return `${style.includes('italic')?'italic':'normal'} ${style.includes('bold')?'700':'400'} ${size}px/1.3 ${TEXT_FONT_FAMILY}`;
}
