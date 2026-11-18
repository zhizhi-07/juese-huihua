const fs=require('fs');
const p=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/original.json','utf8'));
const names={};p.layers.forEach(l=>{names[l.name]=(names[l.name]||0)+1});
console.log(names);
console.log('layers with 0_0_0 cel:',p.layers.filter(l=>l.frameData&&l.frameData['0_0_0']).map(l=>l.name+'#'+l.sheetIndex).join(', '));
console.log('sheet0 layer tree:');
p.layers.forEach((l,i)=>{if(l.sheetIndex===0)console.log(i,' '.repeat(l.depth*2)+(l.isGroup?'[G] ':'')+l.name,'vis',l.visible)});
