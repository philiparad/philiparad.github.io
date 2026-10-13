/** Return unique zero-based A4 page indexes in document order. */
export function printPageIndexes(board,value){
 const total=board.pageCount||1;
 if(board.layout!=='a4'||!Number.isInteger(total)||total<1||total>100)throw new Error('Switch Canvas layout to A4 pages before exporting document pages.');
 if(value===undefined)return Array.from({length:total},(_,i)=>i);
 if(typeof value!=='string'||!value.trim()||value.length>1000)throw new Error('Enter page numbers or ranges, for example 1, 3-5.');
 const result=new Set();
 for(const part of value.split(',')){
  const match=part.trim().match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if(!match)throw new Error('Use page numbers and ranges separated by commas.');
  const first=Number(match[1]),last=Number(match[2]||match[1]);
  if(!Number.isSafeInteger(first)||!Number.isSafeInteger(last)||first<1||last>total||last<first)throw new Error(`Choose pages from 1 to ${total}, with increasing ranges.`);
  for(let n=first;n<=last;n++)result.add(n-1);
 }
 return [...result].sort((a,b)=>a-b);
}
