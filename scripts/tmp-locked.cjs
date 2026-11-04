const fs=require('fs');
for(const file of process.argv.slice(2)){
 const j=JSON.parse(fs.readFileSync(file,'utf8'));
 const ss=j.spriteSheets;
 console.log('===',file);
 for(let si=0;si<ss.length;si++){const s=ss[si];if(!s.name.startsWith('original32_'))continue;
  for(const [ai,a] of s.actions.entries()){
   const bad=a.frames.map((f,i)=>(f.locked||(f.lockedRegions&&f.lockedRegions.length))?i+1:null).filter(v=>v!==null);
   if(bad.length)console.log('  LOCKED',s.name,a.direction,'frames',bad.join(','));
  }}
 // also layer-level locked
 const ll=j.layers.filter(l=>l.locked&&/发/.test(l.name)).map(l=>l.name+'@'+ss[l.sheetIndex].name);
 if(ll.length)console.log('  locked hair layers:',ll.join(', '));
}
