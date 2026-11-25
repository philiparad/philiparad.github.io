import {el} from './ui.js?v=20261121-variation-fields';
import {toolIcon} from './tool-icons.js?v=20261121-variation-fields';
import {svgEl} from './scene.js?v=20261121-variation-fields';
import {gridPath} from './table-renderer.js?v=20261121-variation-fields';
import {numberInput,wholeNumber,choices,labeled,widthChoices,directionChoices,tableDialog} from './table-dialog.js?v=20261121-variation-fields';

const label=(c,r)=>c+' column'+(c===1?'':'s')+' × '+r+' row'+(r===1?'':'s');
export class TablePicker {
    constructor(tables) {
        this.tables=tables;const button=this.button=el('button',null,'tool');
        button.type='button';button.title='Table';button.setAttribute('aria-label','Insert table');
        button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.append(toolIcon('table'));
        const panel=this.panel=el('div',null,'table-picker');panel.hidden=true;panel.id='table-picker-'+crypto.randomUUID();
        panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Insert table');button.setAttribute('aria-controls',panel.id);
        const grid=this.grid=el('div',null,'table-picker-grid');grid.tabIndex=0;grid.setAttribute('role','grid');
        grid.setAttribute('aria-label','Table dimensions');grid.setAttribute('aria-rowcount','8');grid.setAttribute('aria-colcount','10');
        this.squares=[];
        for(let r=1;r<=8;r++) {
            const row=el('div');row.setAttribute('role','row');
            for(let c=1;c<=10;c++) {
                const square=el('span');square.setAttribute('role','gridcell');square.dataset.c=c;square.dataset.r=r;
                square.id=panel.id+'-'+c+'-'+r;square.setAttribute('aria-label',label(c,r));row.append(square);this.squares.push(square);
            }
            grid.append(row);
        }
        this.readout=el('div','Choose columns and rows','table-readout');this.readout.setAttribute('aria-live','polite');
        const more=el('button','Insert Table…','table-more');more.type='button';
        panel.append(el('strong','Insert Table'),grid,this.readout,more);
        button.onkeydown=event=>{if(event.key===' '||event.key==='Enter')event.stopPropagation();};
        button.onclick=event=>{
            if(!panel.hidden){this.close(true);return;}
            if(!this.tables.ready()) return;
            if(matchMedia('(pointer: coarse), (max-width: 520px)').matches) this.configure();
            else this.open(event.detail===0);
        };
        more.onpointerdown=()=>{this.dialogSize=this.size||this.recent;};
        more.onclick=()=>this.configure(this.dialogSize||this.size||this.recent);
        grid.onpointerover=event=>{const s=event.target.closest('[data-c]');if(s)this.highlight(+s.dataset.c,+s.dataset.r);};
        grid.onpointerleave=()=>this.highlight(0,0);
        grid.onclick=event=>{const s=event.target.closest('[data-c]');if(s)this.insert(+s.dataset.c,+s.dataset.r);};
        grid.onkeydown=event=>this.key(event);
        panel.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.close(true);}};
        panel.onfocusout=event=>{if(event.relatedTarget&&!panel.contains(event.relatedTarget)&&event.relatedTarget!==button)this.close(false);};
        this.outside=event=>{
            if(panel.contains(event.target)||button.contains(event.target))return;
            this.close(false);
            // Dismissing the picker over the canvas must not start a pen stroke or erase an object.
            if(tables.editor.svg.contains(event.target)){
                event.preventDefault();event.stopPropagation();tables.editor.svg.focus({preventScroll:true});
            }
        };
        this.position=()=>{
            const a=button.getBoundingClientRect(),p=panel.getBoundingClientRect();
            const top=a.bottom+4+p.height<=innerHeight?a.bottom+4:a.top-p.height-4;
            panel.style.left=Math.max(6,Math.min(a.left,innerWidth-p.width-6))+'px';
            panel.style.top=Math.max(6,Math.min(top,innerHeight-p.height-6))+'px';
        };
    }
    open(keyboard) {
        this.close(false);this.tables.editor.selectionMenu?.close();
        document.body.append(this.panel);this.panel.hidden=false;this.button.setAttribute('aria-expanded','true');
        this.position();document.addEventListener('pointerdown',this.outside,true);
        window.addEventListener('resize',this.position);window.addEventListener('scroll',this.position,true);
        this.grid.focus({preventScroll:true});if(keyboard)this.highlight(1,1);
    }
    highlight(c,r) {
        if((this.size?.c||0)===c&&(this.size?.r||0)===r)return;
        this.size=c&&r?{c,r}:null;if(this.size)this.recent=this.size;
        for(const el of this.squares)el.setAttribute('aria-selected',String(!!c&&+el.dataset.c<=c&&+el.dataset.r<=r));
        this.readout.textContent=c?label(c,r):'Choose columns and rows';
        this.ghost?.remove();this.ghost=null;
        if(!c){this.grid.removeAttribute('aria-activedescendant');return;}
        this.grid.setAttribute('aria-activedescendant',this.panel.id+'-'+c+'-'+r);
        try {
            const p=this.tables.geometry({cols:c,rows:r}), xs=Array.from({length:c+1},(_,i)=>i*p.width),ys=Array.from({length:r+1},(_,i)=>i*p.height);
            this.ghost=svgEl('path',{d:gridPath(xs,ys),transform:'translate('+p.x+' '+p.y+')',fill:'#168fa514',
                stroke:'#147d92','stroke-width':1.5,'stroke-dasharray':'5 3','pointer-events':'none','data-table-preview':''});
            this.tables.editor.sceneLayer.append(this.ghost);
        }catch(e){this.readout.textContent=label(c,r)+'. '+e.message;}
    }
    key(event) {
        let {c=1,r=1}=this.size||{};
        switch(event.key){
            case 'ArrowRight':c=Math.min(10,c+1);break;case 'ArrowLeft':c=Math.max(1,c-1);break;
            case 'ArrowDown':r=Math.min(8,r+1);break;case 'ArrowUp':r=Math.max(1,r-1);break;
            case 'Home':c=1;break;case 'End':c=10;break;
            case 'Enter':case ' ':event.preventDefault();event.stopPropagation();if(!event.repeat)this.insert(c,r);return;
            default:return;
        }
        event.preventDefault();event.stopPropagation();this.highlight(c,r);
    }
    insert(c,r) {
        if(this.panel.hidden)return;
        try {this.tables.insert({cols:c,rows:r});this.close(false);this.tables.editor.svg.focus();}
        catch(e){this.readout.textContent=e.message;}
    }
    close(focus=false) {
        this.highlight(0,0);this.recent=this.dialogSize=null;this.panel.hidden=true;this.panel.remove();
        this.button.setAttribute('aria-expanded','false');document.removeEventListener('pointerdown',this.outside,true);
        window.removeEventListener('resize',this.position);window.removeEventListener('scroll',this.position,true);
        if(focus)this.button.focus({preventScroll:true});
    }
    configure(size) {
        const cols=numberInput(size?.c??4,1,30),rows=numberInput(size?.r??3,1,100);
        this.close(false);const mode=choices(widthChoices,'fixed'),width=numberInput('',36,2000),dir=choices(directionChoices,'auto');
        const header=el('input');header.type='checkbox';width.placeholder='Auto / equal columns';
        const config=()=>({cols:wholeNumber(cols,'Columns'),rows:wholeNumber(rows,'Rows'),sizingMode:mode.value,
            columnWidth:mode.value==='fixed'&&width.value.trim()?wholeNumber(width,'Column width'):null,
            direction:dir.value,headerRow:header.checked});
        const ui=tableDialog('Insert Table','Insert',()=>this.tables.insert(config()),result=>{
            this.dialog=null;if(!this.tables.editor.disposed)(result==='saved'?this.tables.editor.svg:this.button).focus({preventScroll:true});
        });
        this.dialog=ui.dialog;
        const readout=el('output',null,'table-dimensions'),widthLabel=labeled('Column width',width);
        ui.body.append(labeled('Columns',cols),labeled('Rows',rows),labeled('Width behavior',mode),widthLabel,
            labeled('Text direction',dir),labeled('Header row',header),readout);
        const update=()=>{widthLabel.hidden=mode.value!=='fixed';try {
            const v=config(),p=this.tables.geometry(v);ui.error.textContent='';ui.submit.disabled=false;
            readout.textContent=v.cols*v.rows+' cells · '+Math.round(p.w)+' × '+Math.round(p.h)+' board units';
        }catch(e){readout.textContent='';ui.error.textContent=e.message;ui.submit.disabled=true;}};
        ui.body.oninput=update;ui.body.onchange=update;update();ui.open(cols);
    }
    dispose(){this.close(false);this.dialog?.close();this.dialog?.remove();}
}
