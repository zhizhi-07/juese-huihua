const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {warp,body,raster,encode,compose}=require('./try-idle-overalls-20261104.cjs');
const {createCanvas,GlobalFonts}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
GlobalFonts.registerFromPath('C:/Windows/Fonts/msyh.ttc','YaHei');
const root=path.resolve(__dirname,'..'),id='character-1f622669-b72b-4df8-bafd-ce25df22c486',api='http://127.0.0.1:8765/api/project?id=',name='服装 / 算法背带裤';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function clothing(p,key){const matches=p.layers.filter(l=>l.name===name&&l.frameData?.[key]);assert.equal(matches.length,1,'ambiguous clothing '+key);return matches[0];}
function check(before,after){
  assert.equal(before.layers.length,after.layers.length);const normalized=structuredClone(after),changed=[];
  before.layers.forEach((l,li)=>{if(l.name!==name){assert.deepEqual(after.layers[li],l,'unrelated layer changed');return;}
    const next=after.layers[li];assert.deepEqual(Object.keys(next.frameData).sort(),Object.keys(l.frameData).sort());
    for(const [key,cel]of Object.entries(l.frameData)){const [si,,fi]=key.split('_').map(Number);if(si===1&&fi===0)assert.deepEqual(next.frameData[key],cel,'user source changed');if(JSON.stringify(next.frameData[key])!==JSON.stringify(cel))changed.push({layer:li,key});}
    normalized.layers[li]=structuredClone(l);
  });
  assert.deepEqual(normalized,before,'non-clothing project data changed');return changed;
}
function preview(p,dir){
  const titles=['行走 · 算法','待机 · 你的源稿','拾取 · 算法','坐姿 · 算法'],cv=createCanvas(800,455),c=cv.getContext('2d');c.fillStyle='#ddd5ed';c.fillRect(0,0,cv.width,cv.height);c.imageSmoothingEnabled=false;
  for(let si=0;si<4;si++){c.fillStyle='#292b40';c.font='17px YaHei';c.fillText(titles[si],si*200+10,25);for(let ai=0;ai<3;ai++){const tile=compose(p,si,ai,0);c.drawImage(tile,si*200+20,35+ai*135,tile.width*6,tile.height*6);}}
  fs.writeFileSync(dir+'/preview.png',cv.toBuffer('image/png'));
  const all=createCanvas(1280,880),ctx=all.getContext('2d');ctx.fillStyle='#ddd5ed';ctx.fillRect(0,0,all.width,all.height);ctx.imageSmoothingEnabled=false;
  const animation=[];
  for(let si=0;si<4;si++){ctx.fillStyle='#292b40';ctx.font='18px YaHei';ctx.fillText(titles[si],10,si*220+24);const s=p.spriteSheets[si];animation.push({name:titles[si],actions:s.actions.map((a,ai)=>({direction:a.direction,frames:a.frames.map((f,fi)=>{const tile=compose(p,si,ai,fi);ctx.drawImage(tile,100+fi*140,si*220+30+ai*60,tile.width*3,tile.height*3);return {url:tile.toDataURL(),ms:s.useFrameDurations!==false&&f.duration?f.duration:1000/(s.fps||8)};})}))});}
  fs.writeFileSync(dir+'/all-frames.png',all.toBuffer('image/png'));
  fs.writeFileSync(dir+'/animation.html',`<!doctype html><meta charset="utf-8"><title>你的三张待机源稿 · 算法同步</title><style>body{background:#ddd5ed;color:#292b40;font:16px sans-serif}main{display:flex;gap:20px}section{width:23%}img{display:block;width:190px;height:170px;object-fit:contain;image-rendering:pixelated}</style><h2>你的待机三张首帧保持不动，其余全由算法生成</h2><main></main><script>const data=${JSON.stringify(animation)};for(const s of data){const section=document.createElement('section');section.innerHTML='<h3>'+s.name+'</h3>';document.querySelector('main').append(section);for(const a of s.actions){const img=document.createElement('img');section.append(img);let i=0;function next(){const f=a.frames[i];img.src=f.url;i=(i+1)%a.frames.length;setTimeout(next,f.ms)}next()}}</script>`);
}
async function main(){
  if(process.argv[2]==='--save'){
    const dir=path.resolve(process.argv[3]);assert(dir.startsWith(root+path.sep+'output'+path.sep));assert(!fs.existsSync(dir+'/saved.json'),'already saved');
    const meta=JSON.parse(fs.readFileSync(dir+'/source-meta.json')),raw=fs.readFileSync(dir+'/before.json','utf8'),before=JSON.parse(raw),candidate=JSON.parse(fs.readFileSync(dir+'/candidate.json'));
    assert.equal(sha(raw),meta.sha256);const changed=check(before,candidate),currentMain=await(await fetch(api+'main')).text();
    const r=await fetch(api+id,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(candidate)}),reply=await r.text();assert(r.ok,`PUT ${r.status}; candidate retained, no retry: ${reply}`);
    const get=await fetch(api+id),saved=await get.text();assert(get.ok);assert.deepEqual(JSON.parse(saved),candidate,'readback differs');assert.equal(await(await fetch(api+'main')).text(),currentMain,'main changed during save');
    fs.writeFileSync(dir+'/after.json',saved);fs.writeFileSync(dir+'/saved.json',JSON.stringify({id,etag:get.headers.get('etag'),sha256:sha(saved),changedCels:changed.length,sourceFramesPreserved:3,mainUnchanged:true},null,2));console.log('PASS saved with source ETag, exact readback; 3 sources + all non-clothing data preserved; changed cels '+changed.length);return;
  }
  await(await fetch('http://127.0.0.1:8765/api/projects')).json();const r=await fetch(api+id);assert(r.ok);const raw=await r.text(),before=JSON.parse(raw),p=structuredClone(before),dir=path.join(root,'output','overalls-user-sync-20261104-'+Date.now());fs.mkdirSync(dir);
  fs.writeFileSync(dir+'/before.json',raw);fs.writeFileSync(dir+'/source-meta.json',JSON.stringify({id,etag:r.headers.get('etag'),sha256:sha(raw)},null,2));
  const idle=p.spriteSheets.findIndex(s=>s.name==='original16_idle');assert.equal(idle,1);const sources={};
  p.spriteSheets[idle].actions.forEach((a,ai)=>{const key=`${idle}_${ai}_0`,f=a.frames[0];sources[a.direction]={body:body(p,idle,ai,0),clothes:raster(clothing(p,key).frameData[key],f.width,f.height)};fs.writeFileSync(dir+'/source-'+a.direction+'.json',JSON.stringify(clothing(p,key).frameData[key]));});
  const checks=[];
  for(let si=0;si<p.spriteSheets.length;si++)for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<p.spriteSheets[si].actions[ai].frames.length;fi++){
    if(si===idle&&fi===0)continue;const a=p.spriteSheets[si].actions[ai],key=`${si}_${ai}_${fi}`,src=sources[a.direction];assert(src);const target=body(p,si,ai,fi),out=warp(src.body,src.clothes,target);let pixels=0;
    for(let i=0;i<out.data.length;i+=4)if(out.data[i+3]){assert(target.data[i+3]);assert(!(target.data[i]===70&&target.data[i+1]===70&&target.data[i+2]===94),'outline overwritten '+key);pixels++;}assert(pixels>0);
    clothing(p,key).frameData[key]=encode(out);checks.push({key,pixels});
  }
  assert.equal(checks.length,63);const changed=check(before,p);fs.writeFileSync(dir+'/candidate.json',JSON.stringify(p));preview(before,dir);fs.renameSync(dir+'/preview.png',dir+'/before-preview.png');preview(p,dir);
  const report={sourceFrames:3,generatedFrames:checks.length,changed,checks,sourceFramesPreserved:true,allNonClothingDataPreserved:true};fs.writeFileSync(dir+'/checks.json',JSON.stringify(report,null,2));console.log(JSON.stringify({dir,generatedFrames:checks.length,changedCels:changed.length,checks:'PASS; no save yet'},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
