import {graphAxisOptions} from './graph-axes.js?v=20261016-navigation';
export function rangeMembers(items,selected){
 const chosen=items.filter(i=>selected.has(i.id)),id=chosen[0]?.graphLinkId;
 if(!id||chosen.some(i=>i.type!=='graph'||i.graphLinkId!==id))throw new Error('Select graphs from one linked set.');
 const members=items.filter(i=>i.type==='graph'&&i.graphLinkId===id);
 if(members.length<2)throw new Error('This set needs at least two graphs.');return members;
}
export function shiftedRange(range,action){const min=range[0],max=range[2],span=max-min,center=(min+max)/2;
 if(action==='left')return [min-span/4,max-span/4];if(action==='right')return [min+span/4,max+span/4];
 const factor=action==='in'?.5:action==='out'?2:NaN;if(!Number.isFinite(factor))throw new Error('Unknown graph navigation action.');return [center-span*factor/2,center+span*factor/2];
}
/** Prepare every rendered graph before the caller commits a single history entry. */
export async function linkedRangeUpdates(members,min,max,render){
 if(!Number.isFinite(min)||!Number.isFinite(max)||min>=max)throw new Error('Enter a minimum x smaller than maximum x.');
 const drafts=members.map(item=>{const range=[min,item.range[1],max,item.range[3]],box=graphAxisOptions(range,item.axes).boundingbox;
 if(Math.abs(box[0]-min)>1e-8||Math.abs(box[2]-max)>1e-8)throw new Error('Turn off Equal axis scale for graphs whose y bounds would expand the linked x range.');
 return {item,range};});
 const patches=[];for(const {item,range}of drafts){const value=await render(item.series||item.source,range,item.parameters||[],item.definitions||[],item.axes||{});patches.push({id:item.id,src:value.src,range});}return patches;
}
