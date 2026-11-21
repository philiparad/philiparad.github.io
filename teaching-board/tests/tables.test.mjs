import test from 'node:test';
import assert from 'node:assert/strict';
import {createBoard,checkBoard,validateBoard,serializeBackup,parseBackup} from '../js/model.js';
import {tableDimensions,tableGeometry,createTable,validateTableItem,cellAt,cellRect,tablePoint,
    changeAxis,moveDivider,distribute,fitTable,scaleTable,setWidthMode,cellLines,cellStyle} from '../js/table-model.js';
import {selectedRange,rangeTSV,parseTSV,pasteRange} from '../js/table-range.js';
import {createSnippet,snippetCopies,serializeSnippet,parseSnippet} from '../js/snippet-model.js';
import {copiedItems} from '../js/groups.js';
import {History} from '../js/history.js';
import {summarizeBoard} from '../js/dashboard-data.js';
import {beginResize,resizeItems} from '../js/selection-transform.js';

function table(cols=4,rows=3,config={}) {
    const values={rows,cols,...config};
    return createTable(values,tableGeometry(values,{x:400,y:300},1000));
}
test('all 80 picker positions map to independent, correctly placed cells',()=>{
    for(let rows=1;rows<=8;rows++)for(let cols=1;cols<=10;cols++){
        const t=table(cols,rows);assert.doesNotThrow(()=>validateTableItem(t));
        const unique=new Set(t.cells.flat());assert.equal(unique.size,cols*rows);
        assert.equal(t.x+t.w/2,400);assert.equal(t.y+t.h/2,300);
        for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
            const p=cellRect(t,r,c);
            assert.deepEqual(cellAt(t,{x:t.x+p.x+p.w/2,y:t.y+p.y+p.h/2}),{r,c});
        }
    }
});
test('numeric limits and A4 placement respect size, current page and printable margins',()=>{
    const page={x:0,y:1155,w:794,h:1123};
    for(const [cols,rows] of [[12,9],[30,20],[6,100]])assert.equal(table(cols,rows).cells.flat().length,cols*rows);
    for(const pair of [[0,1],[1.2,3],[-1,6],[NaN,2],[Infinity,1],[3,101],[31,1],[30,21]])assert.throws(()=>tableDimensions(...pair));
    const g=tableGeometry({cols:12,rows:9,sizingMode:'viewport'},{x:0,y:0},900,page);
    assert.equal(g.x,24);assert(g.y>page.y&&g.y+g.h<page.y+page.h);
    for(const values of [{cols:30,rows:2},{cols:1,rows:100},{cols:2,rows:2,columnWidth:750}])
        assert.throws(()=>tableGeometry(values,{x:0,y:0},1000,page),/A4/);
});
test('version-one backups, snippets, clipboard and undo/redo preserve data and isolate copies',()=>{
    const board=createBoard(),empty=serializeBackup(board);assert.deepEqual(parseBackup(empty),board);
    const history=new History({items:[]}),t=table();
    t.cells[1][1]={text:'שלום  f(x)=2x+1\nمرحبا',style:{bold:true,textColor:'#314159',align:'end',direction:'rtl'}};
    t.tableStyle.headerRow=true;t.rotation=37;fitTable(t);board.items.push(t);history.commit({items:board.items});
    assert.deepEqual(history.undo().items,[]);assert.deepEqual(history.redo().items,[t]);
    assert.deepEqual(parseBackup(serializeBackup(board)),board);
    for(const copy of [copiedItems([t])[0],snippetCopies(parseSnippet(serializeSnippet(createSnippet('Sample',[t]))),{x:0,y:0})[0]]){
        assert.notEqual(copy.id,t.id);assert.deepEqual(copy.cells,t.cells);assert.deepEqual(copy.rowHeights,t.rowHeights);
        copy.cells[1][1].text='';assert(t.cells[1][1].text.startsWith('שלום'));
    }
    const preview=summarizeBoard(board).preview.items[0];assert.equal(preview.cols,4);assert.equal(preview.rows,3);assert.equal(preview.cells,undefined);
});
test('malformed, excessive or unsafe table fields are rejected before import',()=>{
    const board=createBoard();board.items=[table()];
    for(const corrupt of [
        t=>t.cells[0].pop(),t=>{t.colWidths[0]=Infinity;},t=>{t.w++;},t=>{t.h=NaN;},
        t=>{t.cells[1][1].text='a'.repeat(2001);},t=>{t.cells[0][0].text='\u0001';},
        t=>{t.tableStyle.fill='url(javascript:example)';},t=>{t.tableStyle.headerRow='yes';},
        t=>{t.cells[0][0].rowSpan=2;},t=>{t.cells[0][0].style={direction:'sideways'};},
        t=>{t.cells[0][0].style={onload:'bad'};},t=>{t.innerHTML='<b/>';},t=>{t.rotation=Infinity;}
    ]){
        const bad=structuredClone(board);corrupt(bad.items[0]);assert.throws(()=>validateBoard(bad));
    }
    assert.throws(()=>checkBoard({...board,items:[...board.items,...board.items]}));
    const big=table(30,20);big.cells.forEach(row=>row.forEach(cell=>cell.text='x'.repeat(250)));assert.throws(()=>validateTableItem(big));
    assert.equal(board.items[0].cells[0][0].text,'');
});
test('structural changes preserve neighboring content and reject empty dimensions',()=>{
    const t=table(3,2);
    for(const [r,row] of t.cells.entries())row.forEach((c,i)=>{c.text=r+','+i;});
    const original=structuredClone(t);
    changeAxis(t,'row',1,1);changeAxis(t,'column',0,1);assert.equal(t.cells[2][3].text,'1,2');
    changeAxis(t,'row',1,-1);changeAxis(t,'column',0,-1);assert.deepEqual(t,original);
    assert.throws(()=>changeAxis(table(1,1),'row',0,-1));assert.throws(()=>changeAxis(table(1,1),'column',0,-1));
    const full=table(30,20);assert.throws(()=>changeAxis(full,'row',20,1));validateTableItem(full);
});
test('content wraps, rows expand and AutoFit responds to real edits',()=>{
    const t=table(2,2);t.cells[0][1].text='שלום 123 — f(x)=2x+1\n'+'word '.repeat(32);
    const before=t.colWidths.slice();fitTable(t);assert.deepEqual(t.colWidths,before);assert(t.rowHeights[0]>45);
    assert.equal(cellLines(t,0,1)[0].direction,'rtl');
    setWidthMode(t,'contents',650);assert(t.colWidths[1]>t.colWidths[0]);assert(t.w<=650);
    setWidthMode(t,'viewport',746);assert.equal(t.w,746);assert.equal(t.colWidths[0],373);
    t.cells[0][0].style={fill:'none',direction:'ltr'};t.tableStyle.headerRow=true;
    assert.equal(cellStyle(t,0,0).fill,'none');assert.equal(cellStyle(t,0,0).bold,true);
    validateTableItem(t);
});
test('outer resize, dividers, equal sizing and rotated hit testing preserve geometry',()=>{
    const t=table(),board={items:[t]},start=t.w;
    moveDivider(t,'column',0,2000);assert.equal(t.colWidths[1],36);assert.equal(t.w,start);
    moveDivider(t,'row',1,-1000);assert.equal(t.rowHeights[1],34);
    distribute(t,'column');distribute(t,'row');assert.equal(new Set(t.colWidths).size,1);
    const drag=beginResize([t],'se',{x:0,y:0});resizeItems(board,drag,{x:80,y:30});assert.equal(t.w,start+80);
    scaleTable(t,t,.001,.001);validateTableItem(t);assert(t.colWidths.every(w=>w>=36-1e-8));
    t.rotation=73;const rc=cellRect(t,1,2);assert.deepEqual(cellAt(t,tablePoint(t,{x:rc.x+10,y:rc.y+10})),{r:1,c:2});
});
test('spreadsheet paste is rectangular and lossless for quotes, tabs and line breaks',()=>{
    const t=table(1,1),values=[['Name','Value'],['שלום','1\t2'],['a"b','First\nSecond'],['','']];
    pasteRange(t,0,0,values);fitTable(t);validateTableItem(t);
    const all=selectedRange(t,0,0,'table');assert.deepEqual(parseTSV(rangeTSV(t,all)),values);
    assert.equal(rangeTSV(t,selectedRange(t,0,1,'column')).split('\n')[0],'Value');
    assert.throws(()=>pasteRange(t,0,29,[['1','2']]));assert.throws(()=>parseTSV('"missing'));
});

test('copying a single column round-trips blank final cells',()=>{
    const t=table(1,3);
    t.cells[0][0].text='Time';
    assert.deepEqual(parseTSV(rangeTSV(t,selectedRange(t,0,0,'column'))),[['Time'],[''],['']]);
});

test('viewport sizing keeps its stored width across structure edits and A4 placement follows the visible area',()=>{
    const t=table(4,3);
    setWidthMode(t,'viewport',746);
    changeAxis(t,'column',1,1);assert.equal(t.w,746);assert.equal(t.colWidths[1],746/5);
    changeAxis(t,'column',1,-1);assert.equal(t.w,746);
    const page={x:0,y:1155,w:794,h:1123};
    const g=tableGeometry({cols:1,rows:1},{x:87,y:2180},250,page);
    assert.equal(g.x,24.5);assert.equal(g.y+g.h/2,2180);
});
