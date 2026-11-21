import assert from 'node:assert/strict';

async function exportBackup(page){
    const download=page.waitForEvent('download');
    await page.getByLabel('Export lesson').selectOption('json');
    const file=await download;
    const chunks=[];for await(const chunk of await file.createReadStream())chunks.push(chunk);
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

// Runs against the actual static Teaching Board, not a mocked variation renderer.
export async function checkVariationTable(page,base){
    const dialog=page.getByRole('dialog');
    const removedFields=dialog.getByLabel(/קישור לגרף בלוח|ערכי פונקציה בנקודות/);
    await page.goto(base,{waitUntil:'domcontentloaded'});
    await page.getByRole('button',{name:/New lesson/i}).click();
    await dialog.getByLabel('Lesson title').fill('Variation table regression');
    await dialog.locator('button[type="submit"]').click();
    const insert=page.getByRole('button',{name:'Insert variation table'});
    await insert.waitFor();
    await insert.click();
    assert.equal(await removedFields.count(),0);
    assert.equal(await dialog.getByText(/בגרף המקושר/).count(),0);
    const fill=async(key,value)=>dialog.locator('[data-variation-field="'+key+'"] input').fill(value);
    await fill('zeros','1,4');
    await fill('undefinedPoints','-2,2');
    await fill('functionSource','(x^2+2*x-9)/(x^2-4)');
    await fill('derivativeSource','(-2*x^2+10*x-8)/(x^2-4)^2');
    await dialog.locator('.variation-flag input').nth(2).check(); // numeric sign support
    await dialog.getByRole('button',{name:'בנה / עדכן עמודות'}).click();
    assert.equal(await dialog.locator('.variation-preview-table tbody tr').count(),5);
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({state:'hidden'});
    const table=page.locator('[data-variation-table]');
    await table.waitFor();
    const data=await table.evaluate(root=>{
        const texts=[...root.querySelectorAll('text')].map(t=>t.textContent);
        const shaded=[...root.querySelectorAll('rect')].filter(r=>r.getAttribute('fill')==='#b8d4eb');
        return {texts,shaded:shaded.length};
    });
    assert.equal(data.shaded,2);
    assert(data.texts.includes('מינימום'));
    assert(data.texts.includes('מקסימום'));
    await page.getByRole('button',{name:'Undo'}).click();
    assert.equal(await page.locator('[data-variation-table]').count(),0);
    await page.getByRole('button',{name:'Redo'}).click();
    await table.waitFor();

    // Import an older lesson whose table already has a linked graph and exact point values.
    const legacy=await exportBackup(page);
    const savedTable=legacy.board.items.find(item=>item.type==='variationTable');
    assert.equal(savedTable.spec.graphId,undefined);
    assert.deepEqual(savedTable.spec.pointValues,{});
    const pointValues={'1':'2','4':'5/4'};
    savedTable.spec.pointValues=pointValues;
    savedTable.spec.graphId='saved-graph';
    legacy.board.items.push({
        id:savedTable.spec.graphId,type:'graph',x:savedTable.x+savedTable.w+40,y:savedTable.y,w:320,h:240,
        source:savedTable.spec.functionSource,range:[-5,5,5,-5],
        src:await page.evaluate(()=>document.createElement('canvas').toDataURL())
    });
    await page.goto(base,{waitUntil:'domcontentloaded'});
    const choose=page.waitForEvent('filechooser');
    await page.getByRole('button',{name:'Import backup'}).click();
    await (await choose).setFiles({name:'variation.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});
    await table.waitFor();

    // Editing in place must produce a combined f' / f'' table, not a new object.
    await table.click({button:'right'});
    await page.getByRole('menuitem',{name:'Edit variation table'}).click();
    await dialog.getByLabel('סוג הטבלה').selectOption('combined');
    assert.equal(await removedFields.count(),0);
    await fill('secondZeros','0');
    await fill('secondSource','6*x');
    await dialog.locator('.variation-flag input').nth(3).check(); // continuity
    await dialog.getByRole('button',{name:'בנה / עדכן עמודות'}).click();
    await dialog.locator('button[type="submit"]').click();
    await dialog.waitFor({state:'hidden'});
    assert.equal(await page.locator('[data-variation-table]').count(),1);
    // The SVG layer may repaint on the next animation frame after the dialog closes.
    await page.locator('[data-variation-table] text').filter({hasText:'פיתול'}).waitFor();

    const backup=await exportBackup(page);
    const item=backup.board.items.find(i=>i.type==='variationTable');
    assert(item);
    assert.equal(item.spec.mode,'combined');
    assert.equal(item.spec.points.length,5);
    assert.equal(item.spec.graphId,savedTable.spec.graphId);
    assert.deepEqual(item.spec.pointValues,pointValues);

    // Reload verifies the same persistence path used by normal lessons.
    await page.reload({waitUntil:'domcontentloaded'});
    await page.locator('[data-variation-table]').waitFor();
    const restored=await page.locator('[data-variation-table] text').allTextContents();
    assert(restored.includes('פיתול'));
    assert(restored.includes('5/4'));
    assert(await table.locator('[data-variation-interval]').count()>0);
};
