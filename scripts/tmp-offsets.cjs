const fs=require('fs');
const file=process.argv[2];
const j=JSON.parse(fs.readFileSync(file,'utf8'));
const ss=j.spriteSheets;
for(const m of j.layers.filter(l=>l.hairAnimation)){
  const g=m.hairAnimation;
  console.log('== MASTER',m.name,'enabled',g.enabled,'offsets keys',Object.keys(g.offsets||{}).length);
  const have=new Set(Object.keys(g.offsets||{}));
  for(let si=0;si<ss.length;si++){
    const s=ss[si];if(!s.name.startsWith('original32_'))continue;
    for(const [ai,a] of s.actions.entries()){
      const miss=[];
      for(let fi=0;fi<a.frames.length;fi++){
        const k=s.name+'/'+a.direction+'/'+fi;
        if(!have.has(k))miss.push(fi);
      }
      if(miss.length)console.log('   MISSING offsets',s.name,a.direction,'frames',miss.join(','));
    }
  }
  // extra keys not in project
  const valid=new Set();
  for(let si=0;si<ss.length;si++){const s=ss[si];if(!s.name.startsWith('original32_'))continue;
    for(const a of s.actions)for(let fi=0;fi<a.frames.length;fi++)valid.add(s.name+'/'+a.direction+'/'+fi);}
  const extra=[...have].filter(k=>!valid.has(k));
  if(extra.length)console.log('   EXTRA offsets',extra.slice(0,20).join(', '));
}
