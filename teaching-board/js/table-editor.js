import {el,notify} from './ui.js?v=20261121-variation-fields';
import {svgEl} from './scene.js?v=20261121-variation-fields';
import {pageRect,A4} from './pages.js?v=20261121-variation-fields';
import {toScreen,toWorld} from './viewport.js?v=20261121-variation-fields';
import {TEXT_FONT_FAMILY} from './text-font.js?v=20261121-variation-fields';
import {createTable,tableGeometry,validateTableItem,offsets,cellRect,cellAt,tablePoint,cellStyle,
    fitTable,changeAxis,dividerDelta,moveDivider,PAGE_MARGIN,TABLE_LIMITS} from './table-model.js?v=20261121-variation-fields';
import {parseTSV,pasteRange,selectedRange} from './table-range.js?v=20261121-variation-fields';
import {TablePicker} from './table-picker.js?v=20261121-variation-fields';
import {tableOptions} from './table-actions.js?v=20261121-variation-fields';

export class TableEditor {
    constructor(editor) {
        this.editor=editor;this.picker=new TablePicker(this);this.scope='cell';
        this.more=el('button','Table options','table-context');
        this.more.type='button';this.more.hidden=true;this.more.onclick=()=>editor.action(()=>this.openOptions());
        editor.area.append(this.more);
        this.outside=event=>{
            this.blockedTarget=null;
            if(!this.input || this.input===event.target)return;
            const t=this.item(this.activeId),hit=event.target.closest?.('[data-id]')?.getAttribute('data-id');
            const next=t&&hit===t.id&&event.button===0&&!event.shiftKey&&!event.altKey?
                cellAt(t,toWorld(editor.screen(event),editor.board.viewport)):null;
            if(!this.finish(true,false)){
                this.blockedTarget=event.target;
                event.preventDefault();event.stopImmediatePropagation();return;
            }
            if(next){event.preventDefault();event.stopImmediatePropagation();this.edit(this.item(hit),next);}
        };
        this.blockInvalidClick=event=>{
            // Cancelling a pointerdown alone still permits the following toolbar click.
            if(this.blockedTarget===event.target){
                event.preventDefault();event.stopImmediatePropagation();
            }
            this.blockedTarget=null;
        };
        document.addEventListener('pointerdown',this.outside,true);
        document.addEventListener('click',this.blockInvalidClick,true);
    }
    item(id){return this.editor.board.items.find(item=>item.id===id&&item.type==='table');}
    selected(){
        const ids=this.editor.selected;
        return ids.size===1?this.item(ids.values().next().value):null;
    }
    editable(t){return t?.type==='table'&&!t.groupId&&!this.editor.isLocked(t)&&!this.editor.isBackgroundLocked(t);}
    get hasDraft(){
        if(!this.input)return false;
        const {r,c}=this.cursor;
        return this.input.value!==this.item(this.activeId)?.cells[r]?.[c]?.text;
    }
    ready(){
        const e=this.editor;
        if(e.disposed||e.drag)return false;
        e.inlineText?.finish(true,false);
        return !e.inlineText&&this.finish(true,false);
    }
    geometry(config){
        const e=this.editor, page=e.board.layout==='a4'?pageRect(e.pages.index):null;
        return tableGeometry(config,e.center(),e.area.clientWidth/e.board.viewport.zoom,page);
    }
    insert(config){
        if(!this.ready())throw Error('Finish editing the current object first.');
        const e=this.editor,t=createTable(config,this.geometry(config));
        e.board.items.push(t);e.selected=new Set([t.id]);this.remember(t,{r:0,c:0});e.setTool('select');e.commit();
    }
    remember(t,{r,c},scope='cell'){this.cursor={id:t.id,r,c};this.scope=scope;}
    address(t){
        const p=this.cursor?.id===t.id?this.cursor:{r:0,c:0};
        return {r:Math.min(t.rows-1,p.r),c:Math.min(t.cols-1,p.c)};
    }
    change(id,edit){
        const e=this.editor,old=this.item(id);
        if(e.disposed||!this.editable(old))throw Error('Select an unlocked, ungrouped table to edit.');
        const t=structuredClone(old),a4=e.board.layout==='a4';
        const page=a4?pageRect(Math.max(0,Math.min((e.board.pageCount||1)-1,
            Math.floor((old.y+old.h/2)/(A4.h+A4.gap))))):null;
        const available=a4?A4.w-2*PAGE_MARGIN:Math.max(t.cols*36,Math.min(1600,e.area.clientWidth/e.board.viewport.zoom-2*PAGE_MARGIN));
        edit(t,available);fitTable(t,available);validateTableItem(t);
        if(page&&(old.w!==t.w||old.h!==t.h)){
            const a=(t.rotation||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
            const w=t.w*c+t.h*s,h=t.w*s+t.h*c;
            if(w>available+1e-6||h>page.h-2*PAGE_MARGIN+1e-6)throw Error('The edited table needs more room. Reduce its contents or use Infinite canvas.');
            const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
            t.x=clamp(t.x+t.w/2,page.x+PAGE_MARGIN+w/2,page.x+page.w-PAGE_MARGIN-w/2)-t.w/2;
            t.y=clamp(t.y+t.h/2,page.y+PAGE_MARGIN+h/2,page.y+page.h-PAGE_MARGIN-h/2)-t.h/2;
        }
        e.board.items[e.board.items.indexOf(old)]=t;
        e.commit();return t;
    }
    openOptions(){
        if(!this.ready())return;
        const t=this.selected();if(this.editable(t))tableOptions(this,t);
    }
    edit(t,where){
        if(!this.editable(t)||!this.ready())return;
        const e=this.editor,{r,c}=where||this.address(t);
        this.remember(t,{r,c});this.activeId=t.id;
        const input=this.input=el('textarea',null,'table-cell-editor');input.value=t.cells[r][c].text;
        input.setAttribute('aria-label','Table cell, row '+(r+1)+', column '+(c+1));
        input.setAttribute('aria-description','Tab saves and moves to the next cell. Control or Command plus Enter finishes. Escape cancels.');
        input.addEventListener('compositionstart',()=>{this.composing=true;});
        input.addEventListener('compositionend',()=>{this.composing=false;});
        input.oninput=()=>input.setCustomValidity('');
        input.onkeydown=event=>{
            event.stopPropagation();if(event.isComposing||this.composing||event.keyCode===229)return;
            if(event.key==='Escape'){event.preventDefault();this.finish(false,true);}
            if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();this.finish(true,true);}
            if(event.key==='Tab'){event.preventDefault();this.step(event.shiftKey?-1:1);}
        };
        input.onpaste=event=>{
            const text=event.clipboardData?.getData('text/plain');
            if(!text?.includes('\t'))return;
            event.preventDefault();event.stopPropagation();
            try{
                const values=parseTSV(text);
                this.change(t.id,draft=>pasteRange(draft,r,c,values));
                this.finish(false,true);
            }catch(error){this.error(error);}
        };
        e.area.append(input);e.paint();input.focus({preventScroll:true});input.setSelectionRange(input.value.length,input.value.length);
    }
    error(error){this.input?.setCustomValidity(error.message);this.input?.reportValidity();this.input?.focus();notify(error.message);}
    finish(save=true,focus=false){
        if(!this.input)return true;
        if(save&&this.composing)return false;
        const t=this.item(this.activeId),{r,c}=this.cursor;
        if(save&&t&&this.input.value!==t.cells[r]?.[c]?.text){
            const text=this.input.value;
            try{
                if(text.length>TABLE_LIMITS.cellText)throw Error('Use at most 2,000 characters per cell.');
                this.change(t.id,draft=>{draft.cells[r][c].text=text;});
            }catch(error){this.error(error);return false;}
        }
        this.input.remove();this.input=null;this.activeId=null;this.composing=false;
        if(!this.editor.disposed){this.editor.paint();if(focus)this.editor.svg.focus({preventScroll:true});}
        return true;
    }
    step(delta){
        const id=this.activeId,old=this.item(id),{r,c}=this.address(old);
        if(!this.finish(true,false))return;
        let t=this.item(id),pos=r*t.cols+c+delta;
        if(pos<0){this.editor.svg.focus();return;}
        if(pos>=t.rows*t.cols){
            try{t=this.change(id,draft=>changeAxis(draft,'row',draft.rows,1));}
            catch(error){notify(error.message);this.editor.svg.focus();return;}
        }
        this.edit(t,{r:Math.floor(pos/t.cols),c:pos%t.cols});
    }
    update(t,layer){
        const e=this.editor,v=e.board.viewport,usable=e.tool==='select'&&this.editable(t);
        this.more.hidden=!usable||!!this.input||!!e.drag;
        if(!usable)return;
        const {r,c}=this.address(t),xs=offsets(t.colWidths),ys=offsets(t.rowHeights);
        const place='translate('+t.x+' '+t.y+') rotate('+(t.rotation||0)+' '+t.w/2+' '+t.h/2+')';
        const overlay=svgEl('g',{transform:place,'data-table-controls':''});
        const range=selectedRange(t,r,c,this.scope);
        overlay.append(svgEl('rect',{x:xs[range.firstCol],y:ys[range.firstRow],
            width:xs[range.lastCol+1]-xs[range.firstCol],height:ys[range.lastRow+1]-ys[range.firstRow],
            fill:'none',stroke:'#087e98','stroke-width':1.5/v.zoom,'pointer-events':'none'}));
        for(const [axis,coords] of [['column',xs],['row',ys]])for(let i=1;i<coords.length-1;i++){
            const column=axis==='column',d=column?'M'+coords[i]+' 0V'+t.h:'M0 '+coords[i]+'H'+t.w;
            overlay.append(svgEl('path',{d,fill:'none',stroke:'transparent','stroke-width':Math.min(10,7/v.zoom),
                'pointer-events':'stroke',cursor:column?'col-resize':'row-resize','data-table-divider':axis,'data-index':i-1}));
        }
        layer.append(overlay);
        if(!this.more.hidden){
            const p=toScreen(tablePoint(t,{x:t.w/2,y:t.h}),v);
            this.more.style.left=Math.max(4,Math.min(e.area.clientWidth-this.more.offsetWidth-4,p.x-this.more.offsetWidth/2))+'px';
            this.more.style.top=Math.max(4,Math.min(e.area.clientHeight-this.more.offsetHeight-4,p.y+16))+'px';
        }
        if(this.input&&this.activeId===t.id){
            const rect=cellRect(t,r,c),p=toScreen(tablePoint(t,rect),v),style=cellStyle(t,r,c),input=this.input;
            input.dir=style.direction;
            Object.assign(input.style,{left:p.x+'px',top:p.y+'px',width:rect.w+'px',height:rect.h+'px',
                transform:'rotate('+(t.rotation||0)+'deg) scale('+v.zoom+')',fontFamily:TEXT_FONT_FAMILY,
                fontSize:style.fontSize+'px',fontWeight:style.bold?'700':'400',padding:style.cellPadding+'px',
                color:style.textColor,backgroundColor:style.fill==='none'?'#ffffff':style.fill,textAlign:style.align});
        }
    }
    startDivider(event,world){
        const axis=event.target.getAttribute('data-table-divider');
        if(!axis)return false;
        const t=this.selected();
        if(!this.editable(t))return false;
        const index=Number(event.target.getAttribute('data-index')),start=tablePoint(t,world,true);
        const line=svgEl('line',{stroke:'#087e98','stroke-width':2,'vector-effect':'non-scaling-stroke','pointer-events':'none'});
        event.target.parentNode.append(line);this.more.hidden=true;
        this.editor.drag={kind:'table-divider',id:t.id,axis,index,start,line,delta:0};this.moveDivider(world);return true;
    }
    moveDivider(world){
        const d=this.editor.drag,t=this.item(d.id);if(!t)return;
        const p=tablePoint(t,world,true),col=d.axis==='column',key=col?'x':'y';
        d.delta=dividerDelta(t,d.axis,d.index,p[key]-d.start[key]);
        const at=offsets(col?t.colWidths:t.rowHeights)[d.index+1]+d.delta;
        for(const [attr,value]of Object.entries({x1:col?at:0,y1:col?0:at,x2:col?at:t.w,y2:col?t.h:at}))d.line.setAttribute(attr,value);
    }
    endDivider(world){
        if(world)this.moveDivider(world);
        const d=this.editor.drag;this.editor.drag=null;d.line.remove();
        if(d.delta)this.editor.action(()=>this.change(d.id,t=>moveDivider(t,d.axis,d.index,d.delta)));
        this.editor.paint();
    }
    dispose(){
        document.removeEventListener('pointerdown',this.outside,true);
        document.removeEventListener('click',this.blockInvalidClick,true);
        this.picker.dispose();
        this.options?.close();this.options?.remove();this.input?.remove();this.input=null;this.more.remove();
    }
}
