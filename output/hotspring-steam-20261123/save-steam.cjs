const fs=require('fs'),crypto=require('crypto');
const d='C:/Users/Administrator/Desktop/角色绘画/output/hotspring-steam-20261123';
(async()=>{const old=JSON.parse(fs.readFileSync(d+'/original.json','utf8')),p=structuredClone(old),si=p.spriteSheets.findIndex(s=>s.name==='温泉'),s=p.spriteSheets[si],a=s.actions[0],base=structuredClone(a.frames[0]),pool=p.layers.find(l=>l.sheetIndex===si&&l.name.includes('池体')),steam=p.layers.find(l=>l.sheetIndex===si&&l.name.includes('烟雾')),poolData=structuredClone(pool.frameData[`${si}_0_0`]);
if(a.frames.length!==1)throw Error('Unexpected existing animation');
const png=n=>'data:image/png;base64,'+fs.readFileSync(d+'/'+n+'.png').toString('base64');
s.columns=8;s.rows=1;s.fps=6.25;s.useFrameDurations=true;s.imageDataURL=png('spritesheet');a.frames=[];
for(let f=0;f<8;f++){a.frames.push({...base,sourceX:f*32,sourceY:0,duration:160,notes:'烟雾轻缓循环；池体保持原样'});pool.frameData[`${si}_0_${f}`]=structuredClone(poolData);steam.frameData[`${si}_0_${f}`]={width:32,height:34,dataURL:png('steam-'+f)};}
fs.writeFileSync(d+'/candidate.json',JSON.stringify(p));
const r=await fetch('http://127.0.0.1:8765/api/project?id=scene-inn-20261119',{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':fs.readFileSync(d+'/original.etag','utf8')},body:JSON.stringify(p)});const message=await r.text();if(!r.ok)throw Error(r.status+' '+message);
const back=await fetch('http://127.0.0.1:8765/api/project?id=scene-inn-20261119').then(r=>r.json());fs.writeFileSync(d+'/readback.json',JSON.stringify(back));
const sl=back.layers.filter(l=>l.sheetIndex===si),bs=back.spriteSheets[si];
const v={saveStatus:r.status,frames:bs.actions[0].frames.length,durations:bs.actions[0].frames.map(f=>f.duration),size:[bs.frameWidth,bs.frameHeight],sheetPixels:bs.imageDataURL===s.imageDataURL,allFramePixels:JSON.stringify(sl)===JSON.stringify(p.layers.filter(l=>l.sheetIndex===si)),staticPoolEveryFrame:Object.values(sl.find(l=>l.name.includes('池体')).frameData).every(f=>f.dataURL===poolData.dataURL),steamUniqueFrames:new Set(Object.values(sl.find(l=>l.name.includes('烟雾')).frameData).map(f=>f.dataURL)).size,otherSheetsUnchanged:JSON.stringify(back.spriteSheets.filter((_,i)=>i!==si))===JSON.stringify(old.spriteSheets.filter((_,i)=>i!==si)),otherLayersUnchanged:JSON.stringify(back.layers.filter(l=>l.sheetIndex!==si))===JSON.stringify(old.layers.filter(l=>l.sheetIndex!==si)),sceneUnchanged:JSON.stringify(back.sceneAssembly)===JSON.stringify(old.sceneAssembly)};
fs.writeFileSync(d+'/verification.json',JSON.stringify(v,null,2));console.log(v);
})();
