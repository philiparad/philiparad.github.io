import {el,btn} from './ui.js?v=20261017-history-budget';
import {svgEl} from './scene.js?v=20261024-image-actions';
const icons={pdf:'M5 2h10l4 4v16H5z M15 2v5h4 M8 12h8 M8 16h8',image:'M3 4h18v16H3z M3 17l6-6 5 5 3-3 4 4 M15 8h1',selection:'M5 2v16h17 M2 5h16v17',backups:'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v6l4 2',clear:'M5 7h14 M9 4h6 M7 7v14h10V7 M10 10v8 M14 10v8'};
export class BoardMenu{
 constructor(actions){
  this.root=el('details',null,'board-menu');this.summary=el('summary','☰');this.summary.setAttribute('aria-label','Board menu');this.summary.title='Board menu';
  this.panel=el('div',null,'board-menu-panel');
  const row=(label,icon,action,separator=false)=>{
   const button=btn('',()=>{this.root.open=false;return action();},separator?'board-menu-item board-menu-separated':'board-menu-item');
   const svg=svgEl('svg',{viewBox:'0 0 24 24','aria-hidden':'true'});svg.append(svgEl('path',{d:icons[icon]}));button.append(svg,el('span',label));this.panel.append(button);return button;
  };
  row('Download PDF','pdf',actions.pdf);row('Download Image','image',actions.image);
  this.selection=row('Export selection','selection',actions.selection);
  row('Backups','backups',actions.backups,true);row('Clear board','clear',actions.clear,true);
  this.root.append(this.summary,this.panel);
  this.outside=event=>{if(!this.root.contains(event.target))this.root.open=false;};document.addEventListener('pointerdown',this.outside);
  this.root.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();this.root.open=false;this.summary.focus();}};
 }
 update(selected){this.selection.disabled=!selected;}
 dispose(){document.removeEventListener('pointerdown',this.outside);}
}
