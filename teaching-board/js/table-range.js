import {TABLE_LIMITS,tableDimensions,changeAxis} from './table-model.js?v=20261125-variation-toolbar';

export function selectedRange(t,r,c,scope) {
    return {firstRow:scope==='column'||scope==='table'?0:r,lastRow:scope==='column'||scope==='table'?t.rows-1:r,
        firstCol:scope==='row'||scope==='table'?0:c,lastCol:scope==='row'||scope==='table'?t.cols-1:c};
}
export function rangeTSV(t,range) {
    const rows=[];
    for(let r=range.firstRow;r<=range.lastRow;r++){
        const row=[];
        for(let c=range.firstCol;c<=range.lastCol;c++){
            const s=t.cells[r][c].text;
            // A blank final record would otherwise read as a spreadsheet's trailing newline.
            const blankRecord=s===''&&range.firstCol===range.lastCol;
            row.push(blankRecord||/["\n\t\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s);
        }
        rows.push(row.join('\t'));
    }
    return rows.join('\n');
}
// Quoted fields preserve multiline cells copied from a spreadsheet or another board.
export function parseTSV(source) {
    if(typeof source!=='string'||source.length>2*TABLE_LIMITS.totalText+2000) throw Error('Copied data exceeds the table limit.');
    const text=source.replace(/\r\n?/g,'\n'), rows=[[]];
    let field='',quoted=false,closed=false;
    const end=()=>{rows.at(-1).push(field);field='';closed=false;if(rows.at(-1).length>TABLE_LIMITS.cols)throw Error('A table supports up to 30 columns.');};
    for(let i=0;i<text.length;i++){
        const ch=text[i];
        if(quoted){
            if(ch!=='"')field+=ch;
            else if(text[i+1]==='"'){field+='"';i++;}
            else {quoted=false;closed=true;}
        }else if(ch==='\t')end();
        else if(ch==='\n'){
            end();if(i===text.length-1)return rows;
            if(rows.length>=TABLE_LIMITS.rows)throw Error('A table supports up to 100 rows.');
            rows.push([]);
        }else if(ch==='"'&&!field&&!closed)quoted=true;
        else if(closed)throw Error('Invalid text after a quoted spreadsheet cell.');
        else field+=ch;
        if(field.length>TABLE_LIMITS.cellText)throw Error('Use at most 2,000 characters per cell.');
    }
    if(quoted)throw Error('A quoted spreadsheet cell is missing its closing quote.');
    end();return rows;
}
export function pasteRange(t,r,c,rows) {
    const neededRows=Math.max(t.rows,r+rows.length), neededCols=Math.max(t.cols,c+Math.max(...rows.map(row=>row.length)));
    tableDimensions(neededCols,neededRows);
    while(t.cols<neededCols)changeAxis(t,'column',t.cols,1);
    while(t.rows<neededRows)changeAxis(t,'row',t.rows,1);
    rows.forEach((row,dr)=>row.forEach((text,dc)=>{t.cells[r+dr][c+dc].text=text;}));
}
