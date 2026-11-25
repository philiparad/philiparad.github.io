import {el} from './ui.js?v=20261125-variation-toolbar';
import {cellStyle,changeAxis,distribute,setWidthMode,MIN_COL,MIN_ROW} from './table-model.js?v=20261125-variation-toolbar';
import {selectedRange,rangeTSV,parseTSV,pasteRange} from './table-range.js?v=20261125-variation-toolbar';
import {numberInput,wholeNumber,choices,labeled,widthChoices,directionChoices,tableDialog} from './table-dialog.js?v=20261125-variation-toolbar';

function colorInput(value){const n=el('input');n.type='color';n.value=value;return n;}
function checkbox(checked){const n=el('input');n.type='checkbox';n.checked=checked;return n;}
export function tableOptions(tables,t) {
    const active=tables.address(t);
    const row=numberInput(active.r+1,1,t.rows),col=numberInput(active.c+1,1,t.cols);
    const scope=choices([['cell','Cell'],['row','Row'],['column','Column'],['table','Whole table']],tables.scope);
    const coords=()=>({r:wholeNumber(row,'Row')-1,c:wholeNumber(col,'Column')-1});
    const ui=tableDialog('Table options','Apply formatting',apply,()=>{
        tables.options=null;
        if(!tables.editor.disposed)tables.editor.svg.focus({preventScroll:true});
    });
    const dirty=new Set();
    const section=title=>{const group=el('fieldset');group.append(el('legend',title));ui.body.append(group);return group;};
    const command=(text,fn)=>{const b=el('button',text);b.type='button';b.onclick=()=>ui.run(fn);return b;};
    const selection=section('Selection');
    selection.append(labeled('Row',row),labeled('Column',col),labeled('Apply cell formatting to',scope));
    const format=section('Cell formatting');
    const controls={
        fill:colorInput('#ffffff'),clearFill:checkbox(false),textColor:colorInput('#203954'),
        fontSize:numberInput(22,10,72),bold:checkbox(false),direction:choices(directionChoices,'auto'),
        align:choices([['start','Start'],['center','Center'],['end','End']],'start'),
        verticalAlign:choices([['top','Top'],['middle','Middle'],['bottom','Bottom']],'middle')
    };
    const labels={fill:'Cell fill',clearFill:'Transparent fill',textColor:'Text color',fontSize:'Font size',bold:'Bold',
        direction:'Text direction',align:'Alignment',verticalAlign:'Vertical alignment'};
    for(const [key,n] of Object.entries(controls)){
        format.append(labeled(labels[key],n));
        n.oninput=n.onchange=()=>{dirty.add(key==='clearFill'?'fill':key);if(key==='fill')controls.clearFill.checked=false;};
    }
    const appearance=section('Table formatting');
    const preset=choices([['','Custom'],['plain','Plain'],['header','Header'],['highlight','Highlighted']],'');
    const header=checkbox(t.tableStyle.headerRow),border=colorInput(t.tableStyle.borderColor);
    const borderWidth=el('input');borderWidth.type='number';borderWidth.min=0;borderWidth.max=8;borderWidth.step=.5;borderWidth.value=t.tableStyle.borderWidth;
    const padding=numberInput(t.tableStyle.cellPadding,0,16),mode=choices(widthChoices,t.sizingMode);
    appearance.append(labeled('Teaching style',preset),labeled('Header row',header),labeled('Border color',border),
        labeled('Border width (0 hides)',borderWidth),labeled('Cell padding',padding),labeled('Width behavior',mode));
    preset.onchange=()=>{if(preset.value)header.checked=preset.value==='header';};
    const layout=section('Rows and columns');
    const columnWidth=el('input'),rowHeight=el('input');
    for(const [n,min] of [[columnWidth,MIN_COL],[rowHeight,MIN_ROW]]){n.type='number';n.min=min;n.max=100000;n.step='any';}
    layout.append(labeled('Selected column width',columnWidth),labeled('Selected row height',rowHeight));
    const operations=[['above','Insert row above'],['below','Insert row below'],['before','Insert column before'],
        ['after','Insert column after'],['deleteRow','Delete row'],['deleteCol','Delete column'],['evenRows','Distribute rows evenly'],
        ['evenCols','Distribute columns evenly'],['clear','Clear selected cells']];
    const op=choices(operations,'below');
    layout.append(labeled('Structure',op),command('Apply change',()=>{
        const {r,c}=coords(),range=selectedRange(t,r,c,scope.value);
        tables.change(t.id,draft=>{
            switch(op.value){
                case 'above':changeAxis(draft,'row',r,1);break;case 'below':changeAxis(draft,'row',r+1,1);break;
                case 'before':changeAxis(draft,'column',c,1);break;case 'after':changeAxis(draft,'column',c+1,1);break;
                case 'deleteRow':changeAxis(draft,'row',r,-1);break;case 'deleteCol':changeAxis(draft,'column',c,-1);break;
                case 'evenRows':distribute(draft,'row');break;case 'evenCols':distribute(draft,'column');break;
                case 'clear':for(let i=range.firstRow;i<=range.lastRow;i++)for(let j=range.firstCol;j<=range.lastCol;j++)draft.cells[i][j].text='';break;
            }
        });ui.dialog.close('saved');
    }));
    const data=el('details',null,'table-data');data.append(el('summary','Copy or paste tabular data'));
    const clipboard=el('textarea');clipboard.rows=3;clipboard.dir='auto';
    const copyStatus=el('output');copyStatus.setAttribute('aria-live','polite');
    data.append(labeled('Tab-separated text',clipboard),command('Copy selected cells',()=>{
        const {r,c}=coords();clipboard.value=rangeTSV(t,selectedRange(t,r,c,scope.value));
        clipboard.focus();clipboard.select();
        navigator.clipboard?.writeText(clipboard.value).then(()=>{copyStatus.textContent='Copied.';},
            ()=>{copyStatus.textContent='Press Ctrl+C or ⌘C to copy the selection.';});
    }),command('Paste into selected cell',()=>{
        const {r,c}=coords(),values=parseTSV(clipboard.value);
        tables.change(t.id,draft=>pasteRange(draft,r,c,values));ui.dialog.close('saved');
    }),copyStatus);ui.body.append(data);
    function reflect(){
        const {r,c}=coords(),style=cellStyle(t,r,c);tables.remember(t,{r,c},scope.value);tables.editor.paint();
        controls.clearFill.checked=style.fill==='none';controls.fill.value=style.fill==='none'?'#ffffff':style.fill;
        for(const key of ['textColor','fontSize','direction','align','verticalAlign'])controls[key].value=String(style[key]);
        controls.bold.checked=style.bold;dirty.clear();columnWidth.value=t.colWidths[c];rowHeight.value=t.rowHeights[r];
        for(const option of op.options){
            option.disabled=option.value==='deleteRow'&&t.rows===1||option.value==='deleteCol'&&t.cols===1||
                ['above','below'].includes(option.value)&&(t.rows===100||(t.rows+1)*t.cols>600)||
                ['before','after'].includes(option.value)&&(t.cols===30||t.rows*(t.cols+1)>600);
        }
        if(op.selectedOptions[0]?.disabled)op.value='clear';
    }
    row.onchange=col.onchange=scope.onchange=()=>ui.run(reflect);
    function apply(){
        const {r,c}=coords(),range=selectedRange(t,r,c,scope.value);
        tables.change(t.id,(draft,available)=>{
            const s=draft.tableStyle;
            if(preset.value){
                s.fill=preset.value==='highlight'?'#fff4bd':'#ffffff';
                for(const cells of draft.cells)for(const cell of cells)if(cell.style){delete cell.style.fill;delete cell.style.bold;}
            }
            s.headerRow=header.checked;s.borderColor=border.value;
            if(!borderWidth.value)throw Error('Enter a border width from 0 to 8.');
            s.borderWidth=borderWidth.valueAsNumber;s.cellPadding=wholeNumber(padding,'Cell padding');
            const props={};
            for(const key of dirty)props[key]=key==='fill'&&controls.clearFill.checked?'none':
                key==='fontSize'?wholeNumber(controls.fontSize,'Font size'):key==='bold'?controls.bold.checked:controls[key].value;
            if(scope.value==='table')Object.assign(s,props);
            for(let i=range.firstRow;i<=range.lastRow;i++)for(let j=range.firstCol;j<=range.lastCol;j++){
                const cell=draft.cells[i][j];
                if(scope.value==='table'){if(cell.style)for(const key of dirty)delete cell.style[key];}
                else if(dirty.size)cell.style={...cell.style,...props};
            }
            if(mode.value!==draft.sizingMode)setWidthMode(draft,mode.value,available);
            const w=columnWidth.valueAsNumber,h=rowHeight.valueAsNumber;
            if(!Number.isFinite(w)||w<MIN_COL||!Number.isFinite(h)||h<MIN_ROW)throw Error('Use a column width of at least 36 and row height of at least 34.');
            if(w!==t.colWidths[c]){draft.colWidths[c]=w;draft.sizingMode='fixed';}
            if(h!==t.rowHeights[r])draft.rowHeights[r]=h;
        });
    }
    tables.options=ui.dialog;reflect();ui.open(row);
}
