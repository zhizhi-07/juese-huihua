const fs=require('fs');
const p=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/original.json','utf8'));
for(const [si,s] of p.spriteSheets.entries())for(const [ai,a] of s.actions.entries())for(const [fi,f] of a.frames.entries()){
 if(f.locked||(f.lockedRegions&&f.lockedRegions.length))console.log(si,s.name,a.direction,fi,'locked',f.locked,'regions',JSON.stringify(f.lockedRegions));
}
console.log('done');
