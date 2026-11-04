const fs=require('fs');
const file=process.argv[2];
const j=JSON.parse(fs.readFileSync(file,'utf8'));
const ss=j.spriteSheets;
const hairRe=/前发|后发|刘海|发/;
const masters=j.layers.filter(l=>l.hairAnimation);
console.log('FILE',file);
for(const m of masters){
  const g=m.hairAnimation;
  console.log(' MASTER:',m.name,'@'+ss[m.sheetIndex].name,'enabled',g.enabled,'live',g.live);
  console.log('   params',JSON.stringify(g.params));
  console.log('   overrides',JSON.stringify(g.overrides));
  console.log('   dirOverrides',JSON.stringify(g.directionOverrides||{}).slice(0,900));
}
console.log('\n per-sheet visible hair layers:');
for(let si=0;si<ss.length;si++){
 const s=ss[si]; if(!s.name.startsWith('original32_')) continue;
 for(const a of s.actions){
  const vis=j.layers.filter(l=>!l.isGroup&&l.sheetIndex===si&&l.visible&&hairRe.test(l.name)&&!/\/(衣服与发型)/.test(l.name));
  if(!vis.length) continue;
  const parts=vis.map(l=>`${l.name}${l.hairAnimation?'[M]':l.hairAnimationId?'[L]':'[UNLINKED]'}`);
  console.log('  ',s.name,a.direction,'::',parts.join(' | '));
 }
}
