const fs=require('fs');
const file=process.argv[2];
const j=JSON.parse(fs.readFileSync(file,'utf8'));
const ss=j.spriteSheets;
const names=process.argv.slice(3);
for(const name of names){
  console.log('=== layer name:',name);
  j.layers.forEach((l,i)=>{
    if(l.name!==name||l.isGroup) return;
    const keys=Object.keys(l.frameData||{});
    console.log('  idx',i,'@'+ss[l.sheetIndex].name,'vis',l.visible,'locked',l.locked,'parent',l.parent,'inheritedBase',l.inheritedBase,'link',l.hairAnimationId?'Y':'N','frames',keys.length);
  });
}
