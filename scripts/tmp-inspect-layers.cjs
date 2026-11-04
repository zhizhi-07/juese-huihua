const fs=require('fs');
const j=JSON.parse(fs.readFileSync('data/shared-project.json','utf8'));
const L=j.layers||[];
const rows=[];
L.forEach((l,i)=>{
  rows.push([i,l.name,l.sheetIndex,l.parent,l.depth,l.isGroup?'G':'',l.inheritedBase?'IB':'',l.locked?'LK':'',l.visible?'':'H',Object.keys(l.frameData||{}).length].join(' | '));
});
fs.writeFileSync('tmp_layers.txt',rows.join('\n'));
console.log('layers',L.length);
const fd=L.reduce((n,l)=>n+Object.keys(l.frameData||{}).length,0);
console.log('frameData entries total',fd);
