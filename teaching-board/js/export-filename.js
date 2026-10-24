// Use local calendar time, with filename-safe separators.
export function exportFilename(now=new Date()){
 const pad=n=>String(n).padStart(2,'0');
 return `tb_${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}
