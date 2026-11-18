const fs=require('fs');
const p=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/original.json','utf8'));
console.log('palette sample:',JSON.stringify(p.palette).slice(0,300));
console.log('palette len',p.palette.length);
const l=p.layers[0];
console.log('layer0 keys:',Object.keys(l).join(','));
console.log(JSON.stringify({...l,frames:undefined}).slice(0,600));
console.log('frames len',l.frames&&l.frames.length);
if(l.frames){const f=l.frames[0];console.log('frame0 keys',Object.keys(f).join(','));console.log(JSON.stringify(f).slice(0,500));}
console.log('--- names list ---');
p.layers.forEach((x,i)=>console.log(i, JSON.stringify(x.name), 'sheet',x.sheetIndex,'vis',x.visible,'frames',x.frames?x.frames.length:0));
