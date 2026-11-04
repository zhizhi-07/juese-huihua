const fs=require('fs');
const file=process.argv[2];
const j=JSON.parse(fs.readFileSync(file,'utf8'));
const ss=j.spriteSheets;
// group layers by hairAnimationId
const groups=new Map();
for(const l of j.layers){
  if(l.hairAnimationId){
    if(!groups.has(l.hairAnimationId))groups.set(l.hairAnimationId,[]);
    groups.get(l.hairAnimationId).push(l);
  }
}
for(const m of j.layers.filter(l=>l.hairAnimation)){
  const g=m.hairAnimation;
  console.log('== MASTER',m.name,'@'+ss[m.sheetIndex].name,'id',g.id.slice(0,8),'enabled',g.enabled,'live',g.live);
  console.log('   dirOverrides keys:',Object.keys(g.directionOverrides||{}).join(', ')||'(none)');
  console.log('   overrides keys:',Object.keys(g.overrides||{}).join(', ')||'(none)');
  for(const [k,v] of Object.entries(g.directionOverrides||{})) console.log('     ',k,'V'+v.ampV,'H'+v.ampH,'traj',v.trajectories?Object.keys(v.trajectories).join('+'):'-');
}
console.log('\n== groups by link id');
for(const [id,ls] of groups){
  const names=new Set(ls.map(l=>l.name));
  console.log(' link',id.slice(0,8),'layers',ls.length,'names:',[...names].join(' || '));
  for(const l of ls) console.log('    idx',j.layers.indexOf(l),l.name,'@'+ss[l.sheetIndex].name,'vis',l.visible,'master'+(l.hairAnimation?'*':''));
}
