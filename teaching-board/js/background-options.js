export function backgroundOptions(kind, value={}) {
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid background settings.');
 const options={color:kind==='dark'?'#1d293b':'#ffffff',lineColor:kind==='dark'?'#344359':kind==='dots'?'#bbc8d5':'#e4e9ef',spacing:32,...value};
 if(!/^#[0-9a-f]{6}$/i.test(options.color)||!/^#[0-9a-f]{6}$/i.test(options.lineColor))throw new Error('Choose valid background and line colors.');
 if(!Number.isFinite(options.spacing)||options.spacing<8||options.spacing>256)throw new Error('Background spacing must be between 8 and 256.');
 return {color:options.color,lineColor:options.lineColor,spacing:options.spacing};
}
