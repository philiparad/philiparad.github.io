import {el,btn} from './ui.js?v=20261017-history-budget';
import {svgEl} from './scene.js?v=20261024-image-actions';
const icons={clear:'M5 7h14 M9 4h6 M7 7v14h10V7 M10 10v8 M14 10v8'};
export class BoardMenu{
 constructor(actions){
  this.root=el('details',null,'board-menu');this.summary=el('summary','☰');this.summary.setAttribute('aria-label','Board menu');this.summary.title='Board menu';
  this.panel=el('div',null,'board-menu-panel');
  const row=(label,icon,action,separator=false)=>{
   const button=btn('',()=>{this.root.open=false;return action();},separator?'board-menu-item board-menu-separated':'board-menu-item');
   const svg=svgEl('svg',{viewBox:'0 0 24 24','aria-hidden':'true'});svg.append(svgEl('path',{d:icons[icon]}));button.append(svg,el('span',label));this.panel.append(button);return button;
  };
  row('Clear board','clear',actions.clear);
  this.root.append(this.summary,this.panel);
  this.outside=event=>{if(!this.root.contains(event.target))this.root.open=false;};document.addEventListener('pointerdown',this.outside);
  this.root.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.root.open=false;this.summary.focus();}};
 }
 dispose(){document.removeEventListener('pointerdown',this.outside);}
}
