import {compileExpression} from './expression.js?v=20261015-minimap';
import {el} from './ui.js?v=20261015-minimap';
export function domainContains(row,x){return x>=(row.domainMin??-Infinity)&&x<=(row.domainMax??Infinity)&&!(row.domainMinOpen&&x===row.domainMin)&&!(row.domainMaxOpen&&x===row.domainMax);}
export function endpointMarkers(row,parameters={},range,functions={}){
 const f=compileExpression(row.source,'x',parameters,functions),markers=[];
 for(const key of ['Min','Max']){const x=row['domain'+key];if(!Number.isFinite(x))continue;const y=f(x);if(!Number.isFinite(y)||range&&(x<range[0]||x>range[2]||y<range[3]||y>range[1]))continue;markers.push({x,y,open:row['domain'+key+'Open']===true,color:row.color});}return markers;
}
export function endpointControls(row,prefix,schedule,piecewise=false){const root=el('div',null,'graph-expressions');for(const [side,label]of [['Min','Lower endpoint'],['Max','Upper endpoint']]){const wrap=el('label',label),select=el('select'),key='domain'+side+'Open';select.setAttribute('aria-label',`${prefix} ${label.toLowerCase()}`);for(const [value,text]of [['closed','Closed (included)'],['open','Open (excluded)']]){const option=el('option',text);option.value=value;select.append(option);}select.value=(row[key]??(piecewise&&side==='Max'))?'open':'closed';select.onchange=()=>{row[key]=select.value==='open';schedule();};wrap.append(select);root.append(wrap);}root.append(el('small','Endpoint settings apply only to finite domain bounds.'));return root;}
