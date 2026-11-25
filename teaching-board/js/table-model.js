import {equationLines, firstStrongTextDirection} from './inline-equation.js?v=20261121-variation-fields';
import {textMeasurer} from './text-measure.js?v=20261121-variation-fields';

export const TABLE_LIMITS = {cols:30, rows:100, cells:600, cellText:2000, totalText:120000};
export const MIN_COL = 36, MIN_ROW = 34, PAGE_MARGIN = 24;
const modes = ['fixed', 'contents', 'viewport'];
const directions = ['auto', 'ltr', 'rtl'];
const alignments = ['start', 'center', 'end'];
const verticals = ['top', 'middle', 'bottom'];
const color = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
const within = (v, min, max) => Number.isFinite(v) && v >= min && v <= max;
const sum = numbers => numbers.reduce((a,b) => a+b, 0);
const emptyCell = () => ({text:''});
const commonStyle = {
    fill:v => v === 'none' || color(v), textColor:color, fontSize:v => within(v,10,72),
    align:v => alignments.includes(v), verticalAlign:v => verticals.includes(v),
    direction:v => directions.includes(v), bold:v => typeof v === 'boolean'
};
const tableStyle = {...commonStyle, borderColor:color, borderWidth:v => within(v,0,8),
    cellPadding:v => within(v,0,16), headerRow:v => typeof v === 'boolean'};
const defaults = {fill:'#ffffff', textColor:'#203954', fontSize:22, align:'start', verticalAlign:'middle',
    direction:'auto', bold:false, borderColor:'#607e9d', borderWidth:1.5, cellPadding:7, headerRow:false};
const itemKeys = new Set(['id','type','x','y','w','h','rotation','opacity','locked','backgroundLocked','groupId',
    'rows','cols','colWidths','rowHeights','cells','tableStyle','sizingMode']);

export function tableDimensions(cols, rows) {
    if (!Number.isInteger(cols) || !within(cols,1,TABLE_LIMITS.cols) ||
        !Number.isInteger(rows) || !within(rows,1,TABLE_LIMITS.rows))
        throw Error('Choose 1–30 columns and 1–100 rows, using whole numbers.');
    if (cols*rows > TABLE_LIMITS.cells) throw Error('A table can contain up to 600 cells.');
}

export function tableGeometry({cols,rows,sizingMode='fixed',columnWidth}, center, visibleWidth, page=null) {
    tableDimensions(cols, rows);
    if (!modes.includes(sizingMode)) throw Error('Choose a table width behavior.');
    if (columnWidth != null && !within(columnWidth,MIN_COL,2000)) throw Error('Column width must be 36–2,000 board units.');
    const available = page ? page.w-2*PAGE_MARGIN : Math.max(cols*MIN_COL,Math.min(1600,visibleWidth-2*PAGE_MARGIN));
    let width = Math.max(MIN_COL,Math.min(sizingMode==='contents' ? 72 : 125, available/cols));
    if (sizingMode==='viewport') width = Math.max(MIN_COL,available/cols);
    if (sizingMode==='fixed' && columnWidth != null) width = columnWidth;
    const height = page ? Math.max(MIN_ROW, Math.min(45,(page.h-2*PAGE_MARGIN)/rows)) : 45;
    const w=width*cols, h=height*rows;
    if (page && (w>available+1e-6 || h>page.h-2*PAGE_MARGIN+1e-6))
        throw Error('This table cannot fit on one A4 page. Reduce its dimensions or use Infinite canvas.');
    const x=center.x-w/2, y=center.y-h/2;
    return {
        x:page ? Math.max(page.x+PAGE_MARGIN,Math.min(x,page.x+page.w-PAGE_MARGIN-w)) : x,
        y:page ? Math.max(page.y+PAGE_MARGIN,Math.min(y,page.y+page.h-PAGE_MARGIN-h)) : y,
        w,h,width,height
    };
}

export function createTable(config, geometry) {
    const {cols, rows, sizingMode='fixed', direction='auto', headerRow=false}=config;
    tableDimensions(cols,rows);
    const {x,y,width,height}=geometry;
    const table={id:crypto.randomUUID(),type:'table',x,y,w:width*cols,h:height*rows,rotation:0,locked:false,
        cols,rows,colWidths:Array(cols).fill(width),rowHeights:Array(rows).fill(height),
        cells:Array.from({length:rows},()=>Array.from({length:cols},emptyCell)),
        tableStyle:{...defaults,direction,headerRow},sizingMode};
    validateTableItem(table);
    return table;
}

function checkStyle(style, rules, required=false) {
    if (!style || typeof style!=='object' || Array.isArray(style) ||
        Object.entries(style).some(([key,value])=>!Object.hasOwn(rules,key) || !rules[key](value)) ||
        required && Object.keys(rules).some(key=>!Object.hasOwn(style,key))) throw Error('Invalid table formatting.');
}
export function validateTableItem(t) {
    tableDimensions(t.cols,t.rows);
    if (Object.keys(t).some(k=>!itemKeys.has(k)) || !modes.includes(t.sizingMode) ||
        ![t.x,t.y,t.w,t.h,t.rotation??0].every(Number.isFinite) || typeof t.locked!=='boolean')
        throw Error('Invalid table object.');
    for (const [sizes,count,total,min] of [[t.colWidths,t.cols,t.w,MIN_COL],[t.rowHeights,t.rows,t.h,MIN_ROW]]) {
        if (!Array.isArray(sizes) || sizes.length!==count || !within(total,1,100000) ||
            Array.from(sizes).some(n=>!within(n,min-1e-8,100000)) || Math.abs(sum(sizes)-total)>1e-6)
            throw Error('Table dimensions must match its row heights and column widths.');
    }
    checkStyle(t.tableStyle,tableStyle,true);
    if (!Array.isArray(t.cells) || t.cells.length!==t.rows) throw Error('Invalid table rows.');
    let length=0;
    for (const row of t.cells) {
        if (!Array.isArray(row) || row.length!==t.cols) throw Error('Invalid table columns.');
        for (const c of row) {
            if (!c || typeof c!=='object' || Array.isArray(c) || Object.keys(c).some(k=>k!=='text'&&k!=='style') ||
                typeof c.text!=='string' || c.text.length>TABLE_LIMITS.cellText ||
                /[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(c.text))
                throw Error('Use plain text and at most 2,000 characters per cell.');
            if (c.style!==undefined) checkStyle(c.style,commonStyle);
            length+=c.text.length;
        }
    }
    if (length>TABLE_LIMITS.totalText) throw Error('A table can contain up to 120,000 characters.');
    return t;
}

export function offsets(sizes) {
    const out=[0];
    for (const n of sizes) out.push(out.at(-1)+n);
    return out;
}
export function cellRect(t,r,c) {
    return {x:sum(t.colWidths.slice(0,c)),y:sum(t.rowHeights.slice(0,r)),w:t.colWidths[c],h:t.rowHeights[r]};
}
// Transform through the same rotation about the table center as the SVG scene.
export function tablePoint(t,p,inverse=false) {
    const a=(t.rotation||0)*Math.PI/180*(inverse?-1:1), cx=t.w/2,cy=t.h/2;
    const dx=p.x-cx-(inverse?t.x:0), dy=p.y-cy-(inverse?t.y:0);
    return {x:cx+dx*Math.cos(a)-dy*Math.sin(a)+(inverse?0:t.x),
        y:cy+dx*Math.sin(a)+dy*Math.cos(a)+(inverse?0:t.y)};
}
export function cellAt(t,world) {
    const p=tablePoint(t,world,true);
    const index=(sizes,value)=>{
        let end=0;
        for (let n=0;n<sizes.length;n++) {end+=sizes[n];if (value<end) return n;}
        return sizes.length-1;
    };
    return {r:index(t.rowHeights,p.y),c:index(t.colWidths,p.x)};
}
export function cellStyle(t,r,c) {
    const header=t.tableStyle.headerRow && r===0 ? {fill:'#dcecf4',bold:true} : {};
    return {...t.tableStyle,...header,...t.cells[r][c].style};
}
export function cellLines(t,r,c,style=cellStyle(t,r,c)) {
    const text=t.cells[r][c].text;
    const paragraphs=text.split('\n').map(part=>({runs:[{text:part,bold:style.bold}],dir:style.direction,
        base:style.direction==='auto'?firstStrongTextDirection(part):style.direction}));
    const width=Math.max(1,t.colWidths[c]-2*style.cellPadding);
    return equationLines(paragraphs,width,style.fontSize,textMeasurer(style.fontSize)).map(line=>({
        text:line.parts.map(part=>part.text).join(''), direction:paragraphs[line.paragraphIndex].base,
        fit:line.parts.some(part=>part.fitText), width
    }));
}
function syncSize(t) {t.w=sum(t.colWidths); t.h=sum(t.rowHeights);}
export function requiredRowHeight(t,r) {
    let height=MIN_ROW;
    for (let c=0;c<t.cols;c++) {
        if (!t.cells[r][c].text) continue;
        const s=cellStyle(t,r,c);
        height=Math.max(height,Math.ceil(cellLines(t,r,c,s).length*s.fontSize*1.3+2*s.cellPadding));
    }
    return height;
}
export function fitTable(t,available=1600) {
    if (t.sizingMode==='contents') {
        const wanted=t.colWidths.map((width,c)=>{
            for(let r=0;r<t.rows;r++){
                if(!t.cells[r][c].text) continue;
                const s=cellStyle(t,r,c), measure=textMeasurer(s.fontSize);
                for(const line of t.cells[r][c].text.split('\n'))
                    width=Math.max(width,Math.min(480,Math.ceil(measure(line,s)+2*s.cellPadding)));
            }
            return width;
        });
        const growth=sum(wanted)-sum(t.colWidths);
        const fraction=growth>0?Math.max(0,Math.min(1,(available-sum(t.colWidths))/growth)):0;
        t.colWidths=t.colWidths.map((w,c)=>w+(wanted[c]-w)*fraction);
    }
    t.rowHeights=t.rowHeights.map((h,r)=>Math.max(h,requiredRowHeight(t,r)));
    syncSize(t);
}
export function setWidthMode(t,mode,available) {
    if (!modes.includes(mode)) throw Error('Invalid table width behavior.');
    t.sizingMode=mode;
    if (mode==='viewport') t.colWidths.fill(Math.max(MIN_COL,available/t.cols));
    if (mode==='contents') t.colWidths.fill(Math.max(MIN_COL,Math.min(72,available/t.cols)));
    fitTable(t,available);
}
export function changeAxis(t,axis,index,delta) {
    const row=axis==='row', sizes=row?t.rowHeights:t.colWidths, count=sizes.length;
    if (!Number.isInteger(index) || index<0 || index>count || ![1,-1].includes(delta) || delta<0&&index===count)
        throw Error('Choose a valid row or column.');
    tableDimensions(t.cols+(row?0:delta),t.rows+(row?delta:0));
    if (delta>0) {
        sizes.splice(index,0,sizes[Math.min(index,count-1)]);
        if (row) t.cells.splice(index,0,Array.from({length:t.cols},emptyCell));
        else for (const cells of t.cells) cells.splice(index,0,emptyCell());
    } else {
        sizes.splice(index,1);
        if (row) t.cells.splice(index,1); else for (const cells of t.cells) cells.splice(index,1);
    }
    t.rows=t.rowHeights.length;t.cols=t.colWidths.length;
    if(!row&&t.sizingMode==='viewport')t.colWidths.fill(Math.max(MIN_COL,t.w/t.cols));
    syncSize(t);
}
export function dividerDelta(t,axis,index,delta) {
    const row=axis==='row', sizes=row?t.rowHeights:t.colWidths;
    const before=row?requiredRowHeight(t,index):MIN_COL, after=row?requiredRowHeight(t,index+1):MIN_COL;
    return Math.min(sizes[index+1]-after,Math.max(before-sizes[index],delta));
}
export function moveDivider(t,axis,index,delta) {
    const sizes=axis==='row'?t.rowHeights:t.colWidths;
    const d=dividerDelta(t,axis,index,delta);
    sizes[index]+=d; sizes[index+1]-=d;
    if(axis==='column') t.sizingMode='fixed';
    syncSize(t);
}
export function distribute(t,axis) {
    const row=axis==='row', sizes=row?t.rowHeights:t.colWidths, equal=sum(sizes)/sizes.length;
    if(row && t.cells.some((_,r)=>requiredRowHeight(t,r)>equal))
        throw Error('The text in one row needs more than an equal share of the height. Enlarge the table first.');
    sizes.fill(equal);
    if(!row) t.sizingMode='fixed';
    syncSize(t);
}
export function scaleTable(t,source,sx,sy) {
    sx=Math.max(sx,MIN_COL/Math.min(...source.colWidths));
    sy=Math.max(sy,MIN_ROW/Math.min(...source.rowHeights));
    t.colWidths=source.colWidths.map(w=>w*sx);t.rowHeights=source.rowHeights.map(h=>h*sy);
    if(sx!==1) t.sizingMode='fixed';
    fitTable(t,sum(t.colWidths));
}
