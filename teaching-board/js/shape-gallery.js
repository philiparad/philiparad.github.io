import { el,btn } from './ui.js?v=20261017-history-budget';
import { SHAPE_GROUPS,SHAPES,drawPreset } from './shapes.js?v=20261017-history-budget';
export class ShapeGallery{
 constructor(editor){this.e=editor;this.root=el('details',null,'shape-gallery');const summary=el('summary');summary.setAttribute('aria-label','Shape gallery');summary.title='Shapes, solids and curves';this.summary=summary;summary.addEventListener('click',()=>{editor.lineStyle='solid';editor.selected.clear();editor.paint();});const panel=el('div',null,'shape-panel');panel.setAttribute('aria-label','Shape presets');
 for(const [name,items]of SHAPE_GROUPS){panel.append(el('h3',name));const grid=el('div',null,'shape-grid');for(const [id,label]of items){const button=btn('',()=>{editor.shapePreset=id;this.root.open=false;editor.setTool('shape');summary.focus();});button.title=label;button.setAttribute('aria-label',label);button.dataset.shape=id;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','-4 -4 108 108');svg.setAttribute('aria-hidden','true');svg.append(drawPreset({shape:id,w:100,h:100,lineWidth:4,stroke:'#607e9d',fill:'none'}));button.append(svg);grid.append(button);}panel.append(grid);}
 panel.append(btn('Custom polygon',()=>{this.root.open=false;editor.setTool('polygon');}));this.root.append(summary,panel);this.root.onkeydown=e=>{e.stopPropagation();if(e.key==='Escape'){this.root.open=false;summary.focus();}};this.root.addEventListener('focusout',e=>{if(e.relatedTarget&&!this.root.contains(e.relatedTarget))this.root.open=false;});}
 update(){
 const legacy=['rectangle','ellipse','triangle'].includes(this.e.tool),active=this.e.tool==='shape'||legacy;
 const preset=legacy?this.e.tool:this.e.shapePreset,label=SHAPES.get(preset)?.label||'Shape';
 this.root.setAttribute('data-active',String(active));this.summary.setAttribute('aria-pressed',String(active));
 if(this.iconPreset!==preset){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','-5 -5 110 110');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','shape-current-icon');
  svg.append(drawPreset({shape:preset,w:100,h:100,lineWidth:7,stroke:'currentColor',fill:'none'}));
  const arrow=el('span','▾','shape-dropdown-arrow');arrow.setAttribute('aria-hidden','true');this.summary.replaceChildren(svg,arrow);this.iconPreset=preset;
 }
 for(const b of this.root.querySelectorAll('[data-shape]'))b.setAttribute('aria-pressed',String(active&&b.dataset.shape===preset));
 this.summary.title=active?label+' — active; drag to draw; Shift for equal proportions':'Shapes — '+label;
 }
}
