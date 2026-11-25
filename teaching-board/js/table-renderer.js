import {offsets,cellLines,cellStyle} from './table-model.js?v=20261121-variation-fields';
import {TEXT_FONT_FAMILY} from './text-font.js?v=20261121-variation-fields';

export function gridPath(xs,ys) {
    const w=xs.at(-1), h=ys.at(-1);
    return ['M0 0H'+w+'V'+h+'H0Z',...xs.slice(1,-1).map(x=>'M'+x+' 0V'+h),
        ...ys.slice(1,-1).map(y=>'M0 '+y+'H'+w)].join(' ');
}
export function renderTable(t,svgEl) {
    const g=svgEl('g',{'data-table-grid':'','font-family':TEXT_FONT_FAMILY});
    const style=t.tableStyle, xs=offsets(t.colWidths),ys=offsets(t.rowHeights);
    const holes=[];
    if(style.fill!=='none') for(let r=0;r<t.rows;r++) for(let c=0;c<t.cols;c++){
        if(t.cells[r][c].style?.fill==='none')holes.push('M'+xs[c]+' '+ys[r]+'H'+xs[c+1]+'V'+ys[r+1]+'H'+xs[c]+'Z');
    }
    g.append(svgEl('rect',{width:t.w,height:t.h,fill:holes.length?'none':style.fill,'pointer-events':'all'}));
    if(holes.length)g.append(svgEl('path',{d:['M0 0H'+t.w+'V'+t.h+'H0Z',...holes].join(' '),
        'fill-rule':'evenodd',fill:style.fill,'pointer-events':'none'}));
    for(let r=0;r<t.rows;r++) for(let c=0;c<t.cols;c++) {
        const cell=t.cells[r][c];
        if(!cell.text && !cell.style?.fill && !(style.headerRow&&r===0)) continue;
        const s=cellStyle(t,r,c), w=t.colWidths[c],h=t.rowHeights[r];
        if(s.fill!==style.fill) {
            if(s.fill!=='none') g.append(svgEl('rect',{x:xs[c],y:ys[r],width:w,height:h,fill:s.fill}));
        }
        if(!cell.text) continue;
        const lines=cellLines(t,r,c,s), lineHeight=s.fontSize*1.3, block=lines.length*lineHeight;
        const slack=Math.max(0,h-block-2*s.cellPadding);
        const y=s.cellPadding+(s.verticalAlign==='bottom'?slack:s.verticalAlign==='middle'?slack/2:0);
        const textBox=svgEl('svg',{x:xs[c],y:ys[r],width:w,height:h,overflow:'hidden',style:'width:'+w+'px;height:'+h+'px;cursor:inherit',
            'data-table-row':r,'data-table-col':c,'font-size':s.fontSize,'font-weight':s.bold?700:400,fill:s.textColor});
        lines.forEach((line,n)=>{
            const startEdge=s.align==='start' ? line.direction==='ltr' : line.direction==='rtl';
            const x=s.align==='center'?w/2:startEdge?s.cellPadding:w-s.cellPadding;
            const node=svgEl('text',{x,y:y+n*lineHeight+s.fontSize,
                direction:line.direction,'unicode-bidi':'isolate','text-anchor':s.align==='center'?'middle':s.align,
                'xml:space':'preserve',...(line.fit?{textLength:line.width,lengthAdjust:'spacingAndGlyphs'}:{})});
            node.textContent=line.text;textBox.append(node);
        });
        g.append(textBox);
    }
    if(style.borderWidth) g.append(svgEl('path',{d:gridPath(xs,ys),fill:'none',stroke:style.borderColor,
        'stroke-width':style.borderWidth,'stroke-linejoin':'round','pointer-events':'none'}));
    return g;
}
