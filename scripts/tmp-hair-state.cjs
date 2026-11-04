const fs=require('fs');
for(const file of process.argv.slice(2)){
 const j=JSON.parse(fs.readFileSync(file,'utf8'));
 const ss=j.spriteSheets;
 console.log('=== FILE',file,'layers',j.layers.length);
 const hairRe=/前发|后发|刘海|双马尾|披发/;
 for(const m of j.layers.filter(l=>l.hairAnimation)){
   const g=m.hairAnimation;
   console.log(' MASTER',m.name,'@'+ss[m.sheetIndex].name,'enabled',g.enabled,'live',g.live,'id',g.id.slice(0,8));
   console.log('   dirOverrides:',Object.entries(g.directionOverrides||{}).map(([k,v])=>k+'[V'+v.ampV+'H'+v.ampH+(v.trajectories&&Object.keys(v.trajectories).length?' TRAJ':'')+']').join(' '));
   console.log('   overrides:',Object.entries(g.overrides||{}).map(([k,v])=>k+'[V'+v.ampV+'H'+v.ampH+']').join(' '));
 }
 const groups=new Map();
 for(const l of j.layers){ if(l.hairAnimationId){ if(!groups.has(l.hairAnimationId))groups.set(l.hairAnimationId,[]); groups.get(l.hairAnimationId).push(l);} }
 for(const [id,ls] of groups){
   console.log('  LINK',id.slice(0,8), ls.map(l=>l.name+'@'+ss[l.sheetIndex].name+(l.visible?'':' [HIDDEN]')).join(' | '));
 }
 console.log('  visible hair per sheet:');
 for(let si=0;si<ss.length;si++){ const s=ss[si]; if(!s.name.startsWith('original32_'))continue;
   const v=j.layers.filter(l=>!l.isGroup&&l.sheetIndex===si&&l.visible&&hairRe.test(l.name));
   console.log('   ',s.name, v.map(l=>l.name+(l.hairAnimationId?'[L]':(l.hairAnimation?'[M]':'[UNLINKED]'))).join(' | ')||'(none)');
 }
}
