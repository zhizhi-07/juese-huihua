const fs=require('fs');
for(const f of process.argv.slice(2)){
 const j=JSON.parse(fs.readFileSync(f,'utf8'));
 console.log('===',f);
 for(let si=0;si<j.spriteSheets.length;si++){const s=j.spriteSheets[si];if(!s.name.startsWith('original32_'))continue;
  for(let ai=0;ai<s.actions.length;ai++){const a=s.actions[ai];
   const desc=a.frames.map(fr=>fr.width+'x'+fr.height+(fr.locked?' LOCKED':'')+(fr.lockedRegions&&fr.lockedRegions.length?' LR'+fr.lockedRegions.length:'')).join(' ');
   console.log('  si'+si,s.name,a.direction,'frames',desc);
  }}
}
