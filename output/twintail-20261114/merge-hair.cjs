// 把 双马尾 / 丸子头 / 马尾辫 的「后发」并入「前发」图层，每个动作只留一个头发图层；删除后发图层。
// 用法：node merge-hair.cjs [--save]
const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const D=__dirname+'/',ID='base-outlined-1794365455561',API='http://127.0.0.1:8765/api/project?id='+ID,SAVE=process.argv.includes('--save');
const STYLES=['双马尾','丸子头','马尾辫'];
const box=c=>c.placement||{x:0,y:0,w:c.width,h:c.height};
async function draw(cx,c,dx=0,dy=0){const im=await loadImage(c.dataURL),p=box(c);assert.equal(p.w,c.width);assert.equal(p.h,c.height);cx.drawImage(im,p.x+dx,p.y+dy);}
async function merge(rear,front,f){
  const cels=[rear,front].filter(Boolean),bs=cels.map(box);
  const L=Math.min(0,...bs.map(b=>b.x)),T=Math.min(0,...bs.map(b=>b.y)),R=Math.max(f.width,...bs.map(b=>b.x+b.w)),B=Math.max(f.height,...bs.map(b=>b.y+b.h)),w=R-L,h=B-T;
  const cv=createCanvas(w,h),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;for(const c of cels)await draw(cx,c,-L,-T);
  const cel={width:w,height:h,dataURL:'data:image/png;base64,'+cv.toBuffer('image/png').toString('base64')};
  if(L||T||w!==f.width||h!==f.height)cel.placement={x:L,y:T,w,h};return cel;
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
async function frame(j,si,ai,fi){const f=j.spriteSheets[si].actions[ai].frames[fi],key=`${si}_${ai}_${fi}`,t=createCanvas(f.width,f.height),tx=t.getContext('2d');tx.imageSmoothingEnabled=false;
  for(const l of renderOrder(j,si,ai)){const c=l.frameData[key];if(!c)continue;const im=await loadImage(c.dataURL),p=box(c);tx.globalAlpha=l.opacity??1;tx.drawImage(im,p.x,p.y,p.w,p.h);}
  return Buffer.from(tx.getImageData(0,0,f.width,f.height).data);}
const show=(j,style)=>{const v={...j,layers:j.layers.map(l=>/^头发( \/|$)/.test(l.name)?{...l,visible:l.name.startsWith('头发 / '+style+' /')}:l)};return v;};
const diffs=new Set();async function sameLook(a,b){let n=0;for(const style of STYLES){const va=show(a,style),vb=show(b,style);
  for(const [si,s] of a.spriteSheets.entries())for(const [ai,ac] of s.actions.entries())for(let fi=0;fi<ac.frames.length;fi++){if((await frame(va,si,ai,fi)).equals(await frame(vb,si,ai,fi)))n++;else diffs.add(`${style} ${s.name} ${ac.direction} 第${fi+1}帧`);}}return n;}
(async()=>{
  const res=await fetch(API);assert(res.ok);const raw=Buffer.from(await res.arrayBuffer()),etag=res.headers.get('etag');
  fs.writeFileSync(D+'base-before-merge.json',raw);fs.writeFileSync(D+'base-before-merge.meta.json',JSON.stringify({etag,sha256:crypto.createHash('sha256').update(raw).digest('hex'),bytes:raw.length,at:new Date().toISOString()}));
  const original=JSON.parse(raw),j=JSON.parse(raw);
  const rearOf=l=>STYLES.some(s=>l.name===`头发 / ${s} / 后发`),frontOf=l=>STYLES.some(s=>l.name===`头发 / ${s} / 前发`);
  const firstNew=j.layers.findIndex(l=>rearOf(l)||frontOf(l));
  assert(j.layers.slice(firstNew).every(l=>(rearOf(l)||frontOf(l))&&l.parent==null),'新增头发图层之后出现了其他图层，停止');
  assert(!j.layers.some(l=>l.parent!=null&&l.parent>=firstNew));
  let merged=0;
  for(const style of STYLES)for(const [si,s] of j.spriteSheets.entries()){
    const front=j.layers.filter(l=>l.sheetIndex===si&&l.name===`头发 / ${style} / 前发`),rear=j.layers.filter(l=>l.sheetIndex===si&&l.name===`头发 / ${style} / 后发`);
    assert.equal(front.length,1);assert.equal(rear.length,1);
    const data={};
    for(const [ai,a] of s.actions.entries())for(const [fi,f] of a.frames.entries()){const key=`${si}_${ai}_${fi}`,r=rear[0].frameData[key],fr=front[0].frameData[key];if(!r&&!fr)continue;data[key]=await merge(r,fr,f);merged++;}
    front[0].frameData=data;
  }
  const removed=j.layers.filter(rearOf).length;
  j.layers=j.layers.filter(l=>!rearOf(l));
  if(j.currentLayerIndex>=j.layers.length)j.currentLayerIndex=j.layers.length-1;
  const ids=new Set(j.layers.filter(l=>l.hairAnimation).map(l=>l.hairAnimation.id));for(const l of j.layers)if(l.hairAnimationId)assert(ids.has(l.hairAnimationId),'头发关联缺少基准层');
  const frames=await sameLook(original,j);
  console.log('合并帧',merged,'删除后发图层',removed,'剩余图层',j.layers.length,'；逐帧画面一致',frames,'帧；画面有变化的帧',[...diffs]);
  const body=Buffer.from(JSON.stringify(j));fs.writeFileSync(D+'base-merge-candidate.json',body);
  if(!SAVE){console.log('候选稿已生成，未保存');return;}
  const put=await fetch(API,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body});
  console.log('PUT',put.status,await put.text());assert.equal(put.status,200,'保存失败，候选稿保留');
  const back=await fetch(API),backRaw=Buffer.from(await back.arrayBuffer()),b=JSON.parse(backRaw);
  assert.deepEqual(b,j,'回读与候选稿不一致');
  assert.deepEqual(b.spriteSheets,original.spriteSheets);
  assert.deepEqual(b.layers.slice(0,firstNew),original.layers.slice(0,firstNew),'原有图层发生变化');
  assert.equal(b.layers.length,original.layers.length-removed);
  assert(!b.layers.some(l=>/后发/.test(l.name)&&STYLES.some(s=>l.name.includes(s))));
  const before=[...diffs].sort().join();diffs.clear();await sameLook(original,b);assert.equal([...diffs].sort().join(),before,'回读画面与候选稿不一致');
  fs.writeFileSync(D+'base-merged.meta.json',JSON.stringify({etag:back.headers.get('etag'),sha256:crypto.createHash('sha256').update(backRaw).digest('hex'),bytes:backRaw.length,at:new Date().toISOString()}));
  console.log('回读验证通过',back.headers.get('etag'),b.layers.slice(firstNew).filter(l=>l.sheetIndex===1).map(l=>l.name+' vis='+l.visible));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
