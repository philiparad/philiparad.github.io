export const BOARD_CLIPBOARD='application/x-teaching-board+json';
export function editingText(target){return Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"],math-field')||target?.isContentEditable);}
export function clipboardImages(data){const fromItems=Array.from(data?.items||[]).filter(i=>i.kind==='file'&&i.type.startsWith('image/')).map(i=>i.getAsFile()).filter(Boolean);return fromItems.length?fromItems:Array.from(data?.files||[]).filter(f=>f.type.startsWith('image/'));}
