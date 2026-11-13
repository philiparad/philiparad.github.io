import test from 'node:test';
import assert from 'node:assert/strict';
import {TextHistory} from '../js/text-history.js';

test('text history provides bounded isolated undo and redo',()=>{
 const initial={runs:[{text:'א'}],paragraphs:[{align:'auto',list:'none',dir:'rtl'}]};
 const h=new TextHistory(initial,3);
 initial.runs[0].text='mutated';
 assert.equal(h.current.runs[0].text,'א');
 assert.equal(h.push(h.current),false);
 h.push({runs:[{text:'אב'}],paragraphs:[{align:'auto',list:'none',dir:'rtl'}]});
 h.push({runs:[{text:'אבג'}],paragraphs:[{align:'auto',list:'none',dir:'rtl'}]});
 h.push({runs:[{text:'אבגד'}],paragraphs:[{align:'auto',list:'none',dir:'rtl'}]});
 assert.equal(h.entries.length,3);
 assert.equal(h.undo().runs[0].text,'אבג');
 assert.equal(h.undo().runs[0].text,'אב');
 assert.equal(h.undo(),null);
 assert.equal(h.redo().runs[0].text,'אבג');
 h.push({runs:[{text:'אחר'}],paragraphs:[{align:'auto',list:'none',dir:'rtl'}]});
 assert.equal(h.canRedo,false);
 assert.equal(h.current.runs[0].text,'אחר');
});
test('invalid history bounds are rejected',()=>{
 for(const n of [0,1,1001,1.5])assert.throws(()=>new TextHistory({},n));
});
