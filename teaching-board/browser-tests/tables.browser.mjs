import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

async function download(page,format){
    const pending=page.waitForEvent('download');
    await page.getByLabel('Export lesson').selectOption(format);
    if(format!=='json')await page.getByRole('dialog').getByRole('button',{name:'Export',exact:true}).click();
    const chunks=[],stream=await (await pending).createReadStream();
    for await(const chunk of stream)chunks.push(chunk);
    return Buffer.concat(chunks);
}

// Exercise the real toolbar, drawing surface, persistence and export routes in an isolated lesson.
export async function checkTables(page,base,output,engine){
    await mkdir(output,{recursive:true});
    const screenshot=name=>page.screenshot({path:join(output,engine+'-table-'+name+'.png')});
    const button=name=>page.getByRole('button',{name,exact:true});
    const command=button('Insert table'), items=page.locator('[data-layer="items"]');
    const tables=items.locator('[data-table-grid]'), canvas=page.getByLabel('Teaching canvas');
    const picker=page.getByRole('grid',{name:'Table dimensions'}), editor=page.locator('.table-cell-editor');
    const dialog=page.getByRole('dialog'),backup=async()=>JSON.parse(await download(page,'json')).board;
    const square=(c,r)=>picker.locator('[data-c="'+c+'"][data-r="'+r+'"]');
    const config=async()=>{
        await command.click();
        const more=button('Insert Table…');
        if(await more.isVisible())await more.click();
        await dialog.getByLabel('Columns',{exact:true}).waitFor();
    };
    const gridCell=async(r,c,action='click')=>{
        const point=await tables.first().evaluate((node,{r,c})=>{
            const xs=node.parentElement.querySelector('[data-table-grid] > rect').getBBox();
            // Until resizing, the four columns and three rows in this fixture have equal sizes.
            return new DOMPoint(xs.width*(c+.5)/4,xs.height*(r+.5)/3).matrixTransform(node.getScreenCTM()).toJSON();
        },{r,c});
        await page.mouse[action](point.x,point.y);
    };
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:/New lesson/i}).click();
    await dialog.getByLabel('Lesson title').fill('Distance and time');
    await dialog.locator('button[type="submit"]').click();
    await command.waitFor();
    const boardURL=page.url();
    const bounds=await canvas.boundingBox();
    const outside={x:bounds.x+45,y:bounds.y+100};

    await button('Pen (P)').click();
    await command.click();
    await square(4,3).hover();
    assert.equal(await picker.locator('[aria-selected="true"]').count(),12);
    assert.equal(await page.locator('.table-readout').textContent(),'4 columns × 3 rows');
    assert.equal(await canvas.locator('[data-table-preview]').count(),1);
    await screenshot('picker');
    await square(1,1).hover();
    assert.equal(await picker.locator('[aria-selected="true"]').count(),1);
    await page.mouse.click(outside.x,outside.y);
    assert.equal(await items.locator('[data-id]').count(),0);
    assert.equal(await canvas.locator('[data-table-preview]').count(),0);
    assert.equal(await button('Undo').isDisabled(),true);
    assert.equal(await button('Pen (P)').getAttribute('aria-pressed'),'true');

    // A normal drawing selection is a critical regression boundary for table controls.
    await page.mouse.move(outside.x,outside.y);await page.mouse.down();
    await page.mouse.move(outside.x+85,outside.y,{steps:6});await page.mouse.up();
    await button('Select (V)').click();await page.mouse.click(outside.x+40,outside.y);
    assert.equal(await items.locator('[data-id]').count(),1);
    assert.equal(await page.locator('.table-context').isVisible(),false);
    await button('Undo').click();
    await command.focus();await command.press('Enter');await picker.press('End');
    for(let i=1;i<8;i++)await picker.press('ArrowDown');
    assert.equal(await picker.locator('[aria-selected="true"]').count(),80);
    const times={};
    async function timeInsertion(locator){
        return locator.evaluate(async button=>{
            const start=performance.now();button.click();
            await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
            return Math.round(performance.now()-start);
        });
    }
    times.grid80=await timeInsertion(square(10,8));
    let board=await backup();
    assert.deepEqual([board.items[0].cols,board.items[0].rows],[10,8]);
    await button('Undo').click();assert.equal(await tables.count(),0);
    await command.focus();await command.press('Enter');await picker.press('ArrowRight');await picker.press('Enter');
    board=await backup();assert.deepEqual([board.items[0].cols,board.items[0].rows],[2,1]);
    await button('Undo').click();

    await config();const columns=dialog.getByLabel('Columns',{exact:true}), rows=dialog.getByLabel('Rows',{exact:true});
    await columns.fill('30');await rows.fill('21');assert.equal(await button('Insert').isDisabled(),true);
    assert.match(await dialog.getByRole('alert').textContent(),/600/);
    await rows.fill('20');times.grid600=await timeInsertion(button('Insert'));
    board=await backup();assert.equal(board.items[0].cells.flat().length,600);
    await button('Undo').click();

    await page.getByLabel('Canvas layout').selectOption('a4');
    await config();await columns.fill('1');await rows.fill('100');
    assert.equal(await button('Insert').isDisabled(),true);
    assert.match(await dialog.getByRole('alert').textContent(),/A4/);
    await button('Cancel').click();
    await command.click();await square(4,3).click();
    board=await backup();assert.equal(board.items.length,1);
    const first=board.items[0];assert.deepEqual([first.cols,first.rows],[4,3]);
    await button('Undo').click();assert.equal(await tables.count(),0);
    await button('Redo').click();assert.equal((await backup()).items[0].id,first.id);

    await gridCell(0,0,'dblclick');await editor.fill('זמן');await editor.press('Tab');
    await editor.fill('Time');await editor.press('Shift+Tab');
    assert.equal(await editor.inputValue(),'זמן');
    await editor.fill('discard draft');await editor.press('Escape');
    assert.equal((await backup()).items[0].cells[0][0].text,'זמן');
    const values=[['זמן','Time','Distance','Speed'],['שעה 1','1 h','60 km','60 km/h'],['שעה 2','2 h','120 km','60 km/h']];
    await button('Table options').click();
    await dialog.locator('summary').click();
    await dialog.getByLabel('Tab-separated text').fill(values.map(row=>row.join('\t')).join('\n'));
    await button('Paste into selected cell').click();
    await button('Table options').click();await dialog.getByLabel('Header row').check();
    await button('Apply formatting').click();
    board=await backup();
    assert.deepEqual(board.items[0].cells.map(row=>row.map(cell=>cell.text)),values);
    assert.equal(board.items[0].tableStyle.headerRow,true);
    assert.equal(await tables.locator('text[direction="rtl"]').count(),3);
    await screenshot('bilingual');

    // Divider changes, a row operation, movement and outer resize must each survive an undo.
    const divider=canvas.locator('[data-table-divider="column"][data-index="0"]');
    const d=await divider.boundingBox();await page.mouse.move(d.x+d.width/2,d.y+d.height/4);
    await page.mouse.down();await page.mouse.move(d.x+d.width/2+12,d.y+d.height/4,{steps:3});await page.mouse.up();
    let changed=(await backup()).items[0];assert(changed.colWidths[0]>first.colWidths[0]);assert.equal(changed.w,first.w);
    await button('Undo').click();await gridCell(1,1);
    await button('Table options').click();await dialog.getByLabel('Structure').selectOption('below');await button('Apply change').click();
    changed=(await backup()).items[0];assert.equal(changed.rows,4);assert.equal(changed.cells[3][0].text,'שעה 2');
    await button('Undo').click();
    const tableBox=await tables.first().boundingBox(),x=tableBox.x+tableBox.width*.15,y=tableBox.y+tableBox.height*.18;
    await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+16,y+10,{steps:4});await page.mouse.up();
    changed=(await backup()).items[0];assert(changed.x>first.x);assert(changed.y>first.y);
    const resize=await canvas.locator('[data-resize="se"]').boundingBox();
    await page.mouse.move(resize.x+resize.width/2,resize.y+resize.height/2);await page.mouse.down();
    await page.mouse.move(resize.x+resize.width/2+12,resize.y+resize.height/2+7,{steps:4});await page.mouse.up();
    changed=(await backup()).items[0];assert(changed.w>first.w);assert(changed.h>first.h);
    assert(Math.abs(changed.w-changed.colWidths.reduce((a,b)=>a+b,0))<1e-6);

    // Export while editing commits exactly the visible draft and keeps native text in SVG.
    await gridCell(1,2,'dblclick');await editor.fill('60 km · מרחק');
    const svg=(await download(page,'svg')).toString();
    const exportView=await page.evaluate(source=>{
        const doc=new DOMParser().parseFromString(source,'image/svg+xml');
        return {grids:doc.querySelectorAll('[data-table-grid]').length,rtl:doc.querySelectorAll('text[direction="rtl"]').length,
            text:doc.documentElement.textContent,chrome:doc.querySelectorAll('[data-table-controls],[data-table-preview],textarea').length};
    },svg);
    assert.equal(exportView.grids,1);assert.equal(exportView.chrome,0);assert(exportView.rtl>=3);assert.match(exportView.text,/מרחק/);
    const png=await download(page,'png');assert.equal(png.subarray(1,4).toString(),'PNG');assert(png.length>1000);
    await writeFile(join(output,engine+'-table-export.png'),png);
    const saved=(await backup()).items[0];
    await page.locator('.editor-brand').click();
    await page.getByRole('button',{name:/New lesson/i}).waitFor();
    assert(await page.locator('.thumbnail path').count()>0);
    await page.goto(boardURL);await tables.first().waitFor();
    assert.deepEqual((await backup()).items[0],saved);

    const sample=tables.locator('svg[data-table-row="1"][data-table-col="1"]');
    const cellBox=()=>sample.evaluate(node=>{
        const matrix=node.closest('[data-table-grid]').getScreenCTM();
        const x=node.x.baseVal.value,y=node.y.baseVal.value,w=node.width.baseVal.value,h=node.height.baseVal.value;
        const start=new DOMPoint(x,y).matrixTransform(matrix),end=new DOMPoint(x+w,y+h).matrixTransform(matrix);
        return {x:start.x,y:start.y,w:end.x-start.x,h:end.y-start.y,zoom:matrix.a};
    });
    for(const zoom of [.25,1,2,4]){
        const before=await cellBox();
        await canvas.dispatchEvent('wheel',{clientX:before.x+before.w/2,clientY:before.y+before.h/2,
            ctrlKey:true,deltaY:-Math.log(zoom/before.zoom)/.002});
        await page.waitForFunction(expected=>Math.abs(document.querySelector('[data-layer="items"] [data-table-grid]').getScreenCTM().a-expected)<.001,zoom);
        const cell=await cellBox();
        await page.mouse.dblclick(cell.x+cell.w/2,cell.y+cell.h/2);
        await editor.waitFor();
        const box=await editor.boundingBox();
        const address=await editor.getAttribute('aria-label');
        assert.equal(address,'Table cell, row 2, column 2');
        assert(Math.abs(cell.x-box.x)<2 && Math.abs(cell.y-box.y)<2 && Math.abs(cell.w-box.width)<2 && Math.abs(cell.h-box.height)<2,
            'Cell editor must align at '+zoom+'×: '+JSON.stringify({cell,box}));
        await editor.press('Escape');
    }
    await button('100%').click();
    const cell=await cellBox();await page.mouse.dblclick(cell.x+cell.w/2,cell.y+cell.h/2);
    await editor.dispatchEvent('compositionstart');
    await editor.press('Escape');assert.equal(await editor.isVisible(),true);
    await editor.dispatchEvent('compositionend');
    await editor.fill('x'.repeat(2001));await editor.press('Control+Enter');
    await button('Pen (P)').click();
    assert.equal((await editor.inputValue()).length,2001);
    assert.equal(await button('Select (V)').getAttribute('aria-pressed'),'true');
    await page.evaluate(()=>{location.hash='/';});
    await page.waitForURL(boardURL);
    assert.equal((await editor.inputValue()).length,2001);
    await editor.press('Escape');
    assert.deepEqual((await backup()).items[0].cells,saved.cells);

    // Inspect the print document produced by the same A4 builder used by Print / Save as PDF.
    const printPage=await page.context().newPage();
    try{
        await printPage.goto(base);
        await printPage.evaluate(async board=>{
            const url=new URL(document.querySelector('script[type="module"]').src);
            url.pathname=url.pathname.replace(/app\.js$/,'export.js');
            const {preparePrintPagesDocument}=await import(url.href);
            preparePrintPagesDocument(document,board);
        },await backup());
        const paper=printPage.locator('section');
        assert.equal(await paper.count(),1);assert.equal(await paper.locator('[data-table-grid]').count(),1);
        assert.match(await paper.textContent(),/מרחק/);
        await paper.screenshot({path:join(output,engine+'-table-a4.png')});
        if(engine==='chromium')await printPage.pdf({path:join(output,'table-a4.pdf'),preferCSSPageSize:true,printBackground:true});
    }finally{await printPage.close();}
    for (const width of [1440,1024,768,320]) {
        await page.setViewportSize({width,height:720});
        const layout=await page.locator('.command-deck .tools').evaluate(strip=>{
            const bars=[document.querySelector('.editor-top'),strip.parentElement,strip];
            const scrolls=bars.some(bar=>{
                bar.scrollTo(bar.scrollWidth,bar.scrollHeight);
                return bar.scrollLeft!==0 || bar.scrollTop!==0;
            });
            const bounds=strip.getBoundingClientRect();
            const clipped=[...strip.children].filter(tool=>{
                const r=tool.getBoundingClientRect();
                const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
                return r.left<bounds.left-1 || r.right>bounds.right+1 ||
                    r.top<bounds.top-1 || r.bottom>bounds.bottom+1 || !tool.contains(hit);
            }).map(tool=>tool.title || tool.className);
            return {scrolls,clipped};
        });
        assert.deepEqual(layout,{scrolls:false,clipped:[]},'Every drawing tool must fit without scrolling at '+width+'px');
    }
    await command.click();
    assert.equal(await dialog.getByLabel('Columns',{exact:true}).inputValue(),'4');
    const mobile=await dialog.boundingBox();assert(mobile.x>=0&&mobile.x+mobile.width<=321);
    await columns.fill('12');await rows.fill('9');await button('Insert').click();
    assert.equal((await backup()).items.at(-1).cols,12);
    await page.setViewportSize({width:1440,height:900});
    await writeFile(join(output,engine+'-table-timings.json'),JSON.stringify(times,null,2));
    console.log('Table insertion to the second animation frame (ms): '+JSON.stringify(times));
}
