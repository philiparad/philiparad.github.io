import {textObjectHeight} from './scene.js?v=20261024-image-actions';

/** Precise hit testing for the full visible text box, including empty glyph gaps. */
export function pointInTextBox(item,point){
    if(!item||!['text','note'].includes(item.type)||!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return false;
    const w=item.w||1,h=textObjectHeight(item);
    const cx=item.x+w/2,cy=item.y+h/2;
    const a=(item.rotation||0)*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    const dx=point.x-cx,dy=point.y-cy;
    const x=dx*c+dy*s+w/2,y=-dx*s+dy*c+h/2;
    return x>=0&&x<=w&&y>=0&&y<=h;
}
/** Return the frontmost text box under a world-space point, or null. */
export function hitTextBox(items,point){
    for(let i=items.length-1;i>=0;i--)if(pointInTextBox(items[i],point))return items[i];
    return null;
}
