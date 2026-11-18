const a=require('../yellow-sit-1794209285375/readback.json'),b=require('./before.json');
console.log('layer count',a.layers.length,b.layers.length);
for(const [i,l] of b.layers.entries())if(JSON.stringify(l)!==JSON.stringify(a.layers[i]))console.log('changed',i,l.name,l.sheetIndex);
