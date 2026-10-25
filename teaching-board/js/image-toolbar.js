import {el,btn} from './ui.js?v=20261017-history-budget';
import {bounds} from './scene.js?v=20261024-image-actions';
export class ImageToolbar{
 constructor(e){this.e=e;this.root=el('div',null,'image-selection-toolbar');this.root.setAttribute('role','toolbar');this.root.setAttribute('aria-label','Selected image');this.root.hidden=true;
 this.crop=btn('Crop image',()=>e.action(()=>e.editSelected()));this.crop.title='Crop the image; the original is preserved';
 const stroke=el('label','Border ');this.color=el('input');this.color.type='color';this.color.setAttribute('aria-label','Image border color');this.color.onchange=()=>e.modify({imageBorder:this.color.value,imageBorderWidth:+this.width.value||2});stroke.append(this.color);
 this.none=btn('No border',()=>e.modify({imageBorder:'none'}));this.width=el('select');this.width.setAttribute('aria-label','Image border width');for(const n of [1,2,3,5,8,12]){const o=el('option',n+' px');o.value=n;this.width.append(o);}this.width.onchange=()=>e.modify({imageBorderWidth:+this.width.value,imageBorder:this.color.value});
 const opacity=el('label','Opacity ');this.opacity=el('input');this.opacity.type='range';this.opacity.min=0;this.opacity.max=100;this.opacity.step=1;this.opacity.setAttribute('aria-label','Image opacity');this.opacity.onchange=()=>e.modify({opacity:+this.opacity.value/100});opacity.append(this.opacity);
 this.more=btn('⋯',event=>{const r=this.more.getBoundingClientRect();e.selectionMenu.open({target:this.more,clientX:r.left,clientY:r.bottom,preventDefault(){}});});this.more.setAttribute('aria-label','Image actions');this.more.setAttribute('aria-haspopup','menu');
 this.root.append(stroke,this.width,this.none,this.crop,opacity,this.more);e.area.append(this.root);
 }
 update(){const e=this.e,items=e.board.items.filter(i=>e.selected.has(i.id));const item=items[0];this.root.hidden=e.tool!=='select'||items.length!==1||item?.type!=='image'||!!e.drag;
 if(this.root.hidden)return;const locked=e.isLocked(item);for(const c of [this.crop,this.color,this.width,this.none,this.opacity])c.disabled=locked;
 this.color.value=item.imageBorder&&item.imageBorder!=='none'?item.imageBorder:'#243c59';this.width.value=String(item.imageBorderWidth||2);this.opacity.value=String(Math.round((item.opacity??1)*100));
 const b=bounds(item),v=e.board.viewport,w=this.root.offsetWidth,h=this.root.offsetHeight,left=v.x+(b.x+b.w/2)*v.zoom-w/2,bottom=v.y+(b.y+b.h)*v.zoom+20;
 this.root.style.left=Math.max(6,Math.min(left,e.area.clientWidth-w-6))+'px';this.root.style.top=Math.max(6,Math.min(bottom+h<e.area.clientHeight?bottom:v.y+b.y*v.zoom-h-20,e.area.clientHeight-h-6))+'px';
 }
 dispose(){this.root.remove();}
}
