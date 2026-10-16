import {el,field} from './ui.js?v=20261016-overview';
export function validateAxes(axes={}) {
 if(!axes||typeof axes!=='object'||Array.isArray(axes))throw new Error('Invalid graph axis settings.');
 for(const key of ['grid','tickLabels','equalScale'])if(axes[key]!==undefined&&typeof axes[key]!=='boolean')throw new Error('Invalid graph axis setting.');
 for(const key of ['xLabel','yLabel'])if(axes[key]!==undefined&&(typeof axes[key]!=='string'||axes[key].length>40))throw new Error('Axis labels must be at most 40 characters.');
 for(const key of ['xTick','yTick'])if(axes[key]!==undefined&&(!Number.isFinite(axes[key])||axes[key]<=0||axes[key]>200000))throw new Error('Tick spacing must be positive and at most 200,000.');
 return axes;
}
export function graphAxisOptions(range,axes={}) {
 validateAxes(axes);
 if(!Array.isArray(range)||range.length!==4||!range.every(Number.isFinite)||range[0]>=range[2]||range[3]>=range[1]||range.some(x=>Math.abs(x)>100000))throw new Error('Use valid graph bounds: minimum smaller than maximum.');
 const box=[...range];
 if(axes.equalScale){const width=box[2]-box[0],height=box[1]-box[3],ratio=640/440;if(width/height<ratio){const extra=(height*ratio-width)/2;box[0]-=extra;box[2]+=extra;}else{const extra=(width/ratio-height)/2;box[1]+=extra;box[3]-=extra;}}
 const axis=key=>{const step=axes[key+'Tick'],span=key==='x'?box[2]-box[0]:box[1]-box[3];if(step!==undefined&&span/step>200)throw new Error('Tick spacing is too small for these bounds. Use at most 200 intervals per axis.');return {ticks:{majorHeight:axes.grid===false?10:-1,minorHeight:axes.grid===false?4:-1,label:{display:'internal'},drawLabels:axes.tickLabels!==false,...(step===undefined?{}:{ticksDistance:step,insertTicks:false,minorTicks:0})}};};
 return {boundingbox:box,axis:true,grid:axes.grid!==false,showCopyright:false,showNavigation:false,keepaspectratio:false,defaultAxes:{x:axis('x'),y:axis('y')}};
}
export function axisControls(axes,schedule){
 const root=el('div');root.append(el('h3','Axes'),el('p','Leave tick spacing blank for automatic spacing. Equal scale expands the visible bounds so one unit has the same length on both axes.','muted'));
 const fields=el('div',null,'graph-ranges');
 for(const [key,label,type]of [['xTick','x tick spacing','number'],['yTick','y tick spacing','number'],['xLabel','x axis label','text'],['yLabel','y axis label','text']]){const f=field(label,axes[key]??'',type);if(type==='number'){f.input.step='any';f.input.placeholder='Automatic';}else f.input.maxLength=40;f.input.oninput=()=>{if(type==='number'){if(f.input.validity.badInput)axes[key]=NaN;else if(f.input.value==='')delete axes[key];else axes[key]=+f.input.value;}else axes[key]=f.input.value;schedule();};fields.append(f.wrap);}
 root.append(fields);
 for(const [key,label,defaultValue]of [['grid','Show graph grid',true],['tickLabels','Show tick labels',true],['equalScale','Equal axis scale',false]]){const wrap=el('label'),input=el('input');input.type='checkbox';input.checked=axes[key]??defaultValue;input.onchange=()=>{axes[key]=input.checked;schedule();};wrap.append(input,document.createTextNode(label));root.append(wrap);}
 return root;
}
export function appendAxisLabels(svg,axes){
 for(const [key,x,y]of [['xLabel',620,424],['yLabel',14,20]])if(axes[key]){const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x',x);text.setAttribute('y',y);text.setAttribute('text-anchor',key==='xLabel'?'end':'start');text.setAttribute('font-size',15);text.setAttribute('font-family','Arial');text.setAttribute('fill','#172c45');text.textContent=axes[key];svg.append(text);}
}
