// 主工程新增「头发 / 双马尾」前发+后发；光影参照女商人（顶部亮带、外缘/下方暗面）。
// 用法：node build.cjs        只生成候选稿与预览
//       node build.cjs --save 通过 API + ETag 保存并回读验证
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const D=__dirname+'/',API='http://127.0.0.1:8765/api/project?id=main',SAVE=process.argv.includes('--save');
const COLORS={A:'#46465E',B:'#DDA15E',C:'#F3C98B',D:'#B97A45',R:'#E8A6B6'};
const mirror=rows=>rows.map(r=>{assert.equal(r.length,10,r);return r+[...r.slice(0,9)].reverse().join('');});
const pad=(rows,top=2)=>{const out=Array(top).fill('.'.repeat(19)).concat(rows);while(out.length<19)out.push('.'.repeat(19));out.forEach(r=>assert.equal(r.length,19,r));return out;};
const ART={
 front:{
  down:pad(mirror([
   '......AAAA',
   '.....ACBBB',
   '....ACCBBB',
   '....ACCCBB',
   '....ABCCCB',
   '....ABBB.B',
   '....ABB...',
   '....ABB...',
   '....AB....',
   '.....B....'])),
  side:pad([
   '......AAAAAAA......',
   '......BBBBBBBA.....',
   '.....BBBCCBBCCA....',
   '.....BBBCCCBCCA....',
   '.....BBBBBBBBBA....',
   '.....DBBBB.B.BA....',
   '.....DBBB....BA....',
   '.....DDBB....BA....',
   '.....DDBB....BA....',
   '......DB...........'])
 },
 rear:{
  down:pad(mirror([
   '...A......',
   '..AR......',
   '.ACB......',
   '.ACB......',
   '.ACB......',
   '.ABB......',
   '.ABB......',
   '.ABDA.....',
   '.ABDA.....',
   'ABDA......',
   '.AA.......']),4),
  up:pad(mirror([
   '......AAAA',
   '.....ACBBB',
   '...AACCCCD',
   '..ARACCCCD',
   '.ACBABCCCD',
   '.ACBABBCCD',
   '.ACBABBBBD',
   '.ABBABBBBB',
   '.ABBADDBBB',
   '.ABDAAAAAA',
   '.ABDA.....',
   'ABDA......',
   '.AA.......'])),
  side:pad([
   '...A...............',
   '..AR...............',
   '.ACB...............',
   '.ACB...............',
   '.ACB...............',
   '.ABB...............',
   '.ABB...............',
   '.ABDA..............',
   '.ABDA..............',
   'ABDA...............',
   '.AA................'],4)
 }
};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
function artImage(rows,ox,oy,w,h){
  const cv=createCanvas(w,h),cx=cv.getContext('2d'),im=cx.createImageData(w,h);let n=0;
  rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c==='.')return;const X=x+ox,Y=y+oy;assert(X>=0&&Y>=0&&X<w&&Y<h,`像素越界 ${X},${Y} in ${w}x${h}`);im.data.set([...rgb(COLORS[c]),255],(Y*w+X)*4);n++;}));
  cx.putImageData(im,0,0);return {cel:{width:w,height:h,dataURL:'data:image/png;base64,'+cv.toBuffer('image/png').toString('base64')},count:n};
}
async function pixels(c,w,h){const cv=createCanvas(w,h),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;if(c){const im=await loadImage(c.dataURL),p=c.placement||{x:0,y:0,w:c.width,h:c.height};cx.drawImage(im,p.x,p.y,p.w,p.h);}return cx.getImageData(0,0,w,h);}
async function anchor(j,si,ai,fi){
  const f=j.spriteSheets[si].actions[ai].frames[fi],dir=j.spriteSheets[si].actions[ai].direction,key=`${si}_${ai}_${fi}`;
  const heads=j.layers.filter(l=>l.sheetIndex===si&&l.name==='head'&&!l.isGroup&&j.layers[l.parent]?.name===dir&&l.frameData[key]);
  assert.equal(heads.length,1,'头部不唯一 '+key);
  const im=await pixels(heads[0].frameData[key],f.width,f.height),w=f.width,h=f.height,seen=new Uint8Array(w*h);let best=null;
  for(let i=0;i<seen.length;i++){if(seen[i]||!im.data[i*4+3])continue;const q=[i];seen[i]=1;let l=w,r=0,t=h;
    for(let k=0;k<q.length;k++){const at=q[k],x=at%w,y=Math.floor(at/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);
      for(const nx of [x>0?at-1:-1,x+1<w?at+1:-1,at-w,at+w]){if(nx<0||nx>=seen.length||seen[nx]||!im.data[nx*4+3])continue;seen[nx]=1;q.push(nx);}}
    if(!best||q.length>best.count)best={x:(l+r)/2,y:t,count:q.length};}
  assert(best);return best;
}
const isHand=l=>l.name==='hand'||l.name==='hand 2';
function renderOrder(j,si,ai){
  const dir=j.spriteSheets[si].actions[ai].direction;
  const inAction=l=>{if(l.sheetIndex!==si)return false;if(dir==='up'&&!l.isGroup&&/眼/.test(l.name))return false;if(l.parent==null)return true;const g=j.layers[l.parent];return g.name===dir&&g.visible!==false;};
  const ls=j.layers.filter(l=>!l.isGroup&&inAction(l)&&l.visible!==false),rear=l=>/后发/.test(l.name);
  if(dir==='up')return [...ls.filter(isHand),...ls.filter(l=>!isHand(l)&&!rear(l)),...ls.filter(rear)];
  const rest=ls.filter(l=>!rear(l)),base=rest.findLastIndex(l=>l.name==='head'||l.name==='body');rest.splice(base+1,0,...ls.filter(rear));
  return [...rest.filter(l=>l.name!=='hand'),...rest.filter(l=>l.name==='hand')];
}
async function sheetPreview(j,file,scale,only){
  const rows=[];for(const [si,s] of j.spriteSheets.entries())for(const [ai,a] of s.actions.entries())if(!only||only(s,a))rows.push({si,ai,s,a});
  const cw=Math.max(...rows.flatMap(r=>r.a.frames.map(f=>f.width))),ch=Math.max(...rows.flatMap(r=>r.a.frames.map(f=>f.height))),cols=Math.max(...rows.map(r=>r.a.frames.length));
  const cv=createCanvas(cols*(cw+1)*scale,rows.length*(ch+1)*scale),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;cx.fillStyle='#8FA3B8';cx.fillRect(0,0,cv.width,cv.height);
  for(const [ri,{si,ai,a}] of rows.entries())for(const [fi,f] of a.frames.entries()){
    const key=`${si}_${ai}_${fi}`,t=createCanvas(f.width,f.height),tx=t.getContext('2d');tx.imageSmoothingEnabled=false;
    for(const l of renderOrder(j,si,ai)){const c=l.frameData[key];if(!c)continue;const im=await loadImage(c.dataURL),p=c.placement||{x:0,y:0,w:c.width,h:c.height};tx.globalAlpha=l.opacity??1;tx.drawImage(im,p.x,p.y,p.w,p.h);}
    cx.fillStyle='#C9D4DF';cx.fillRect(fi*(cw+1)*scale,ri*(ch+1)*scale,f.width*scale,f.height*scale);
    cx.drawImage(t,fi*(cw+1)*scale,ri*(ch+1)*scale,f.width*scale,f.height*scale);}
  fs.writeFileSync(D+file,cv.toBuffer('image/png'));
}
(async()=>{
  const res=await fetch(API);assert(res.ok);const raw=Buffer.from(await res.arrayBuffer()),etag=res.headers.get('etag');
  const meta=JSON.parse(fs.readFileSync(D+'main-original.meta.json'));
  assert.equal(etag,meta.etag,'主工程已变化，停止（保留候选稿，需重新比较）');
  const original=JSON.parse(raw),j=JSON.parse(raw);
  assert(!j.layers.some(l=>l.name.startsWith('头发 / 双马尾')),'已存在双马尾图层');
  const idleSI=j.spriteSheets.findIndex(s=>s.name==='original16_idle'),idle=j.spriteSheets[idleSI];
  // 按头部重新标定各帧偏移（与编辑器 calibrate 相同算法）
  const offsets={};
  for(const [ai,a] of idle.actions.entries()){const o=await anchor(j,idleSI,ai,0);
    for(const [ti,s] of j.spriteSheets.entries()){const ta=s.actions.findIndex(b=>b.direction===a.direction);if(ta<0)continue;
      for(let fi=0;fi<s.actions[ta].frames.length;fi++){const at=await anchor(j,ti,ta,fi);offsets[`${s.name}/${a.direction}/${fi}`]={x:Math.round(at.x-o.x),y:at.y-o.y};}}}
  const ref=j.layers.find(l=>l.name==='头发 / 初始 / 前发'&&l.hairAnimation).hairAnimation;
  const diff=Object.keys(offsets).filter(k=>JSON.stringify(offsets[k])!==JSON.stringify(ref.offsets[k]));
  console.log('偏移帧数',Object.keys(offsets).length,'与现有头发联动偏移不一致的帧',diff.length?diff.map(k=>k+JSON.stringify(offsets[k])+'/'+JSON.stringify(ref.offsets[k])):'无');
  const use={};for(const k of Object.keys(offsets)){assert(ref.offsets[k],'缺少已保存偏移 '+k);use[k]=ref.offsets[k];}
  const hidden=[];for(const [i,l] of j.layers.entries())if(!l.isGroup&&/^头发 \//.test(l.name)&&l.visible!==false){l.visible=false;hidden.push(i+' '+l.name+' sh'+l.sheetIndex);}
  const added=[];
  for(const [slot,label] of [['rear','后发'],['front','前发']]){
    const id=crypto.randomUUID();
    for(const si of [idleSI,...j.spriteSheets.keys()].filter((v,i,a)=>a.indexOf(v)===i)){
      const s=j.spriteSheets[si],layer={sheetIndex:si,parent:null,name:`头发 / 双马尾 / ${label}`,visible:true,locked:false,opacity:1};
      if(si===idleSI)layer.hairAnimation={version:1,id,live:true,enabled:false,params:{ampV:0,ampH:1,cycles:1,lag:0.6,verticalMode:'wave',masks:{},protectedMasks:{},trajAmp:0.1,trajectories:{},stitch:{}},overrides:{},offsets:JSON.parse(JSON.stringify(use)),headOffsets:JSON.parse(JSON.stringify(offsets))};
      layer.hairAnimationId=id;layer.frameData={};
      for(const [ai,a] of s.actions.entries()){const rows=ART[slot][a.direction];if(!rows)continue;
        for(const [fi,f] of a.frames.entries()){const o=use[`${s.name}/${a.direction}/${fi}`];assert(o);layer.frameData[`${si}_${ai}_${fi}`]=artImage(rows,o.x,o.y,f.width,f.height).cel;}}
      j.layers.push(layer);added.push(layer);
    }
  }
  const body=Buffer.from(JSON.stringify(j));fs.writeFileSync(D+'main-candidate.json',body);
  await sheetPreview(j,'preview-idle.png',12,s=>s.name==='original16_idle');
  await sheetPreview(j,'preview-all.png',6);
  console.log('新增图层',added.map(l=>`${l.name} sh${l.sheetIndex} cels=${Object.keys(l.frameData).length}`));
  console.log('仅隐藏（像素未动）',hidden);
  if(!SAVE){console.log('候选稿已生成，未保存');return;}
  const put=await fetch(API,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body});
  const text=await put.text();console.log('PUT',put.status,text);assert.equal(put.status,200,'保存失败，候选稿保留');
  // 回读验证
  const back=await fetch(API),backRaw=Buffer.from(await back.arrayBuffer()),b=JSON.parse(backRaw);
  assert.equal(b.layers.length,original.layers.length+8);
  assert.deepEqual(b.spriteSheets,original.spriteSheets,'帧/时长/尺寸变化');
  for(const [i,l] of original.layers.entries()){const n=b.layers[i];assert.deepEqual(n.frameData,l.frameData,'旧图层像素变化 '+i);assert.deepEqual({...n,visible:0,frameData:0},{...l,visible:0,frameData:0},'旧图层属性变化 '+i);
    if(n.visible!==l.visible)assert(/^头发 \//.test(l.name)&&n.visible===false,'非预期可见性变化 '+i);}
  for(const [k,l] of added.entries()){const n=b.layers[original.layers.length+k];assert.deepEqual(n,l);
    for(const [key,c] of Object.entries(n.frameData)){const [si,ai,fi]=key.split('_').map(Number),f=b.spriteSheets[si].actions[ai].frames[fi];assert.equal(c.width,f.width);assert.equal(c.height,f.height);
      const im=await pixels(c,f.width,f.height);let cnt=0;const allowed=new Set(Object.values(COLORS));for(let p=0;p<im.data.length;p+=4)if(im.data[p+3]){cnt++;assert.equal(im.data[p+3],255);assert(allowed.has('#'+[0,1,2].map(q=>im.data[p+q].toString(16).padStart(2,'0')).join('').toUpperCase()));}
      const dir=b.spriteSheets[si].actions[ai].direction,slot=/后发/.test(n.name)?'rear':'front';assert.equal(cnt,ART[slot][dir].join('').replace(/\./g,'').length,'像素数不符 '+key);}}
  fs.writeFileSync(D+'main-saved.meta.json',JSON.stringify({etag:back.headers.get('etag'),sha256:crypto.createHash('sha256').update(backRaw).digest('hex'),bytes:backRaw.length,at:new Date().toISOString(),hidden}));
  await sheetPreview(b,'saved-all.png',6);
  console.log('回读验证通过',back.headers.get('etag'));
})().catch(e=>{console.error(e);process.exitCode=1;});
