const fs=require('fs');
const p=JSON.parse(fs.readFileSync('output/eyes-down-1px-20261111/original.json','utf8'));
console.log('top keys:',Object.keys(p).join(', '));
console.log('name:',p.name,'currentSheet',p.currentSheetIndex,p.currentActionIndex,p.currentFrameIndex,'currentLayer',p.currentLayerIndex);
console.log('canvas?',p.width,p.height);
console.log('sheets:');
p.spriteSheets.forEach((s,i)=>{
  console.log(' ',i,s.name,'actions:',s.actions.map(a=>a.name+'/'+a.direction+'/'+a.frames.length).join(' | '));
  const f=s.actions[0].frames[0];
  console.log('   frame keys:',Object.keys(f).join(','));
  console.log('   frame shape:',f.width,f.height,'sourceX',f.sourceX,'sourceY',f.sourceY,'pixelsType',typeof f.pixels,'len',f.pixels&&f.pixels.length);
});
console.log('layers:',p.layers.length);
const seen={};
p.layers.forEach((l,i)=>{const k=l.type||'?';seen[k]=(seen[k]||0)+1});
console.log(seen);
