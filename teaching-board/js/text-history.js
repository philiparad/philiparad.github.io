/**
 * Bounded, document-local editing history.
 * Stores plain validated editor snapshots, never raw HTML.
 * The lesson's board history is deliberately independent.
 */
export class TextHistory {
    constructor(initial, limit=100) {
        if (!Number.isInteger(limit) || limit < 2 || limit > 1000) throw new Error('Invalid text history limit.');
        this.limit=limit;
        this.entries=[structuredClone(initial)];
        this.index=0;
    }
    get current() { return structuredClone(this.entries[this.index]); }
    get canUndo() { return this.index > 0; }
    get canRedo() { return this.index < this.entries.length-1; }
    push(value) {
        const copy=structuredClone(value);
        if (JSON.stringify({runs:copy.runs,paragraphs:copy.paragraphs}) === JSON.stringify({runs:this.entries[this.index].runs,paragraphs:this.entries[this.index].paragraphs})) {this.entries[this.index].selection=copy.selection??this.entries[this.index].selection;return false;}
        this.entries.length=this.index+1;
        this.entries.push(copy);
        if(this.entries.length > this.limit) this.entries.shift();
        this.index=this.entries.length-1;
        return true;
    }
    /**
     * Some browsers dispatch their final insertFromComposition input AFTER
     * compositionend. Coalesce that trailing commit into the same single
     * undo step; never overwrite the earlier precomposition history entry.
     * Only the editing session can call this for its own recorded index.
     */
    amendCurrent(value,expectedIndex=this.index){
        if(this.index<1||this.index!==expectedIndex)return false;
        const copy=structuredClone(value),old=this.entries[this.index];
        const changed=JSON.stringify({runs:copy.runs,paragraphs:copy.paragraphs})!==
            JSON.stringify({runs:old.runs,paragraphs:old.paragraphs});
        this.entries[this.index]=copy;
        return changed;
    }
    setSelection(selection) { if (selection) this.entries[this.index].selection=structuredClone(selection); }
    undo() {
        if(!this.canUndo)return null;
        this.index--;
        return this.current;
    }
    redo() {
        if(!this.canRedo)return null;
        this.index++;
        return this.current;
    }
}
