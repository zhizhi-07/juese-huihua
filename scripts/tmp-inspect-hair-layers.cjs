const fs=require('fs');
const file=process.argv[2];
const j=JSON.parse(fs.readFileSync(file,'utf8'));
const ss=j.spriteSheets;
const hairRe=/前发|后发|发|刘海|双马尾|披发/;
console.log('=== hair-related layers (non-group)');
for(const l of j.layers){
  if(l.isGroup) continue;
  if(!hairRe.test(l.name)) continue;
  const keys=Object.keys(l.frameData||{});
  const sheets=[...new Set(keys.map(k=>k.split('_')[0]))];
  console.log(' idx',j.layers.indexOf(l),'|',l.name,'| sheet',ss[l.sheetIndex].name,'| vis',l.visible,'| locked',l.locked,'| parent',l.parent,'| link',l.hairAnimationId?'YES':(l.hairAnimation?'MASTER':'-'),'| frames',keys.length,'| inSheets',sheets.join(','));
}
console.log('\n=== groups');
for(const l of j.layers) if(l.isGroup) console.log(' idx',j.layers.indexOf(l),'|',l.name,'| children?',j.layers.filter(x=>x.parent===j.layers.indexOf(l)).map(x=>x.name).join(','));
