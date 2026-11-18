// 在「新主工程 · 原版描边素体」(base-outlined-1794365455561) 新增「头发 / 双马尾」前发+后发。
// 待机画布 17×17，头部比 main 靠左上 1 格、左右各只有 3 格余量，所以马尾尖不再外撇。
// 用法：node build-base.cjs [--save]
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const D=__dirname+'/',ID='base-outlined-1794365455561',API='http://127.0.0.1:8765/api/project?id='+ID,SAVE=process.argv.includes('--save'),W=17;
const COLORS={A:'#46465E',B:'#DDA15E',C:'#F3C98B',D:'#B97A45',R:'#E8A6B6'};
const mirror=rows=>rows.map(r=>{assert.equal(r.length,9,r);return r+[...r.slice(0,8)].reverse().join('');});
const full=(rows,top)=>{const out=Array(top).fill('.'.repeat(W)).concat(rows);while(out.length<W)out.push('.'.repeat(W));out.forEach(r=>assert.equal(r.length,W,r));assert.equal(out.length,W);return out;};
const ART={
 front:{
  down:full(mirror([
   '.....AAAA',
   '....ACBBB',
   '...ACCBBB',
   '...ACCCBB',
   '...ABCCCB',
   '...ABBB.B',
   '...ABB...',
   '...ABB...',
   '...AB....']),1),
  side:full([
   '.....AAAAAAA.....',
   '.....BBBBBBBA....',
   '....BBBCCBBCCA...',
   '....BBBCCCBCCA...',
   '....BBBBBBBBBA...',
   '....DBBBB.B.BA...',
   '....DBBB....BA...',
   '....DDBB....BA...',
   '....DDBB....BA...',
   '.....DB..........'],1)
 },
 rear:{
  down:full(mirror([
   '..A......',
   '.AR......',
   'ACB......',
   'ACB......',
   'ACB......',
   'ABB......',
   'ABB......',
   'ABDA.....',
   'ABDA.....',
   'ADA......',
   '.A.......']),3),
  up:full(mirror([
   '.....AAAA',
   '....ACBBB',
   '..AACCCCD',
   '.ARACCCCD',
   'ACBABCCCD',
   'ACBABBCCD',
   'ACBABBBBD',
   'ABBABBBBB',
   'ABBADDBBB',
   'ABDAAAAAA',
   'ABDA.....',
   'ADA......',
   '.A.......']),1),
  side:full([
   '..A..............',
   '.AR..............',
   'ACB..............',
   'ACB..............',
   'ACB..............',
   'ABB..............',
   'ABB..............',
   'ABDA.............',
   'ABDA.............',
   'ADA..............',
   '.A...............'],3)
 }
};
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const clippedFrames=[];
// 与编辑器同步算法一致：超出画布的像素不裁掉，改为扩大图像并记录 placement。
function artImage(rows,ox,oy,w,h,key){
  const pts=[];rows.forEach((r,y)=>[...r].forEach((c,x)=>{if(c!=='.')pts.push([x+ox,y+oy,c]);}));
  const L=Math.min(0,...pts.map(p=>p[0])),T=Math.min(0,...pts.map(p=>p[1])),R=Math.max(w-1,...pts.map(p=>p[0])),B=Math.max(h-1,...pts.map(p=>p[1])),cw=R-L+1,ch=B-T+1;
  const cv=createCanvas(cw,ch),cx=cv.getContext('2d'),im=cx.createImageData(cw,ch);
  for(const [X,Y,c] of pts)im.data.set([...rgb(COLORS[c]),255],((Y-T)*cw+X-L)*4);
  cx.putImageData(im,0,0);const cel={width:cw,height:ch,dataURL:'data:image/png;base64,'+cv.toBuffer('image/png').toString('base64')};
  if(L||T||cw!==w||ch!==h){cel.placement={x:L,y:T,w:cw,h:ch};clippedFrames.push(key+' 超出 '+pts.filter(p=>p[0]<0||p[1]<0||p[0]>=w||p[1]>=h).length+'px');}
  return cel;
}
async function pixels(c,w,h){const cv=createCanvas(w,h),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;if(c){const im=await loadImage(c.dataURL),p=c.placement||{x:0,y:0,w:c.width,h:c.height};cx.drawImage(im,p.x,p.y,p.w,p.h);}return cx.getImageData(0,0,w,h);}
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
  const rows=[];for(const [si,s] of j.spriteSheets.entries())for(const [ai,a] of s.actions.entries())if(!only||only(s,a))rows.push({si,ai,a});
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
  assert.equal(etag,JSON.parse(fs.readFileSync(D+'base-original.meta.json')).etag,'工程已变化，停止（候选稿保留，需重新比较）');
  const original=JSON.parse(raw),j=JSON.parse(raw);
  assert(!j.layers.some(l=>l.name.startsWith('头发 / 双马尾')),'已存在双马尾图层');
  const idleSI=j.spriteSheets.findIndex(s=>s.name==='original16_idle');
  // 沿用当前显示的商人头发联动里已标定的各帧头部偏移（offsets 与 headOffsets 一致）
  const ref=j.layers.find(l=>l.name==='头发 / 商人原版灰长发 / 前发'&&l.hairAnimation).hairAnimation;
  assert.deepEqual(ref.offsets,ref.headOffsets);
  const expected=j.spriteSheets.flatMap(s=>s.actions.flatMap(a=>a.frames.map((_,fi)=>`${s.name}/${a.direction}/${fi}`)));
  assert.deepEqual(Object.keys(ref.offsets).sort(),expected.sort(),'偏移表与帧结构不一致');
  const hidden=[];for(const [i,l] of j.layers.entries())if(!l.isGroup&&/^头发( \/|$)/.test(l.name)&&l.visible!==false){l.visible=false;hidden.push(i+' '+l.name+' sh'+l.sheetIndex);}
  const added=[];
  for(const [slot,label] of [['rear','后发'],['front','前发']]){
    const id=crypto.randomUUID();
    for(const si of [idleSI,...j.spriteSheets.keys()].filter((v,i,a)=>a.indexOf(v)===i)){
      const s=j.spriteSheets[si],layer={sheetIndex:si,parent:null,name:`头发 / 双马尾 / ${label}`,visible:true,locked:false,opacity:1};
      if(si===idleSI)layer.hairAnimation={version:1,id,live:true,enabled:false,params:JSON.parse(JSON.stringify(ref.params)),overrides:{},offsets:JSON.parse(JSON.stringify(ref.offsets)),headOffsets:JSON.parse(JSON.stringify(ref.headOffsets))};
      layer.hairAnimationId=id;layer.frameData={};
      for(const [ai,a] of s.actions.entries()){const rows=ART[slot][a.direction];if(!rows)continue;
        for(const [fi,f] of a.frames.entries()){const key=`${si}_${ai}_${fi}`,o=ref.offsets[`${s.name}/${a.direction}/${fi}`];layer.frameData[key]=artImage(rows,o.x,o.y,f.width,f.height,s.name+' '+key);}}
      j.layers.push(layer);added.push(layer);
    }
  }
  const body=Buffer.from(JSON.stringify(j));fs.writeFileSync(D+'base-candidate.json',body);
  const stamp=Date.now();
  await sheetPreview(j,`base-preview-idle-${stamp}.png`,12,s=>s.name==='original16_idle');
  await sheetPreview(j,`base-preview-all-${stamp}.png`,4);
  console.log('超出画布的帧',clippedFrames.length,clippedFrames);
  console.log('预览',stamp,'新增',added.length,'层；仅隐藏',hidden.length,'层');
  if(!SAVE){console.log('候选稿已生成，未保存');return;}
  const put=await fetch(API,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body});
  console.log('PUT',put.status,await put.text());assert.equal(put.status,200,'保存失败，候选稿保留');
  const back=await fetch(API),backRaw=Buffer.from(await back.arrayBuffer()),b=JSON.parse(backRaw);
  assert.equal(b.layers.length,original.layers.length+added.length);
  assert.deepEqual(b.spriteSheets,original.spriteSheets,'帧/时长/尺寸变化');
  for(const [i,l] of original.layers.entries()){const n=b.layers[i];assert.deepEqual(n.frameData,l.frameData,'旧图层像素变化 '+i);assert.deepEqual({...n,visible:0,frameData:0},{...l,visible:0,frameData:0},'旧图层属性变化 '+i);
    if(n.visible!==l.visible)assert(/^头发( \/|$)/.test(l.name)&&n.visible===false,'非预期可见性变化 '+i);}
  const allowed=new Set(Object.values(COLORS));let cels=0;
  for(const [k,l] of added.entries()){const n=b.layers[original.layers.length+k];assert.deepEqual(n,l);
    for(const [key,c] of Object.entries(n.frameData)){const [si,ai,fi]=key.split('_').map(Number),f=b.spriteSheets[si].actions[ai].frames[fi];if(!c.placement){assert.equal(c.width,f.width);assert.equal(c.height,f.height);}else assert.deepEqual([c.placement.w,c.placement.h],[c.width,c.height]);
      const im=await pixels({width:c.width,height:c.height,dataURL:c.dataURL},c.width,c.height);let cnt=0;for(let p=0;p<im.data.length;p+=4)if(im.data[p+3]){cnt++;assert.equal(im.data[p+3],255);assert(allowed.has('#'+[0,1,2].map(q=>im.data[p+q].toString(16).padStart(2,'0')).join('').toUpperCase()));}
      const dir=b.spriteSheets[si].actions[ai].direction,slot=/后发/.test(n.name)?'rear':'front';assert.equal(cnt,ART[slot][dir].join('').replace(/\./g,'').length,'像素数不符 '+key);cels++;}}
  fs.writeFileSync(D+'base-saved.meta.json',JSON.stringify({etag:back.headers.get('etag'),sha256:crypto.createHash('sha256').update(backRaw).digest('hex'),bytes:backRaw.length,at:new Date().toISOString(),hidden}));
  console.log('回读验证通过',cels,'帧',back.headers.get('etag'));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
