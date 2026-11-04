const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=fs.readFileSync(root+'/自检记录/duck-sit-front-side-sync-path.txt','utf8');
const before=JSON.parse(fs.readFileSync(out+'/original.json')),meta=JSON.parse(fs.readFileSync(out+'/source.json'));
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(root+'/js/'+n+'.js','utf8'));
const si=before.spriteSheets.findIndex(s=>s.name==='original32_sit');assert(si>=0);
const actions=['side','down'].map(d=>before.spriteSheets[si].actions.findIndex(a=>a.direction===d));assert(actions.every(a=>a>=0));
const li=before.layers.findIndex(l=>l.sheetIndex===si&&l.name==='服装 / 衣服-小黄鸭');assert(li>=0);
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const nonempty=im=>im.data.some((v,i)=>i%4===3&&v>0);
function bounds(im){let x=im.width,y=im.height,r=-1,b=-1;for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++)if(im.data[(yy*im.width+xx)*4+3]){x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy)}return r<0?null:{x,y,w:r-x+1,h:b-y+1}}
const keys=actions.flatMap(a=>[1,2,3].map(f=>`${si}_${a}_${f}`));
function scope(p){const restored=structuredClone(p);for(const key of keys)restored.layers[li].frameData[key]=structuredClone(before.layers[li].frameData[key]);assert.deepEqual(restored,before,'只允许修改正侧坐姿服装后3帧');return restored}
async function render(p,label){
 const model=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]))).project;
 const cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.init(model,cm);
 const studio=fs.readFileSync(root+'/js/studio.js','utf8'),start=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),end=studio.indexOf('  const originalSetTool=',start);assert(start>=0&&end>start);
 const app={project:model,canvasManager:cm,animationPlayer:new PE.AnimationPlayer()};app.animationPlayer.canvas=createCanvas(144,144);new Function('app','bounds',studio.slice(start,end))(app,bounds);
 const contacts=actions.map(()=>createCanvas(768,800)),ctxs=contacts.map(c=>c.getContext('2d'));ctxs.forEach(c=>c.imageSmoothingEnabled=false);
 let checked=0;
 for(let ai=0;ai<model.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<4;fi++){
  Object.assign(model,{currentSheetIndex:si,currentActionIndex:ai,currentFrameIndex:fi});
  const im=cm.getCompositeImageData(si,ai,fi,true,1);assert(nonempty(im));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data,'主画布');
  const exp=png.decode(Buffer.from(await(await ex.exportFrameAsBlob(si,ai,fi)).arrayBuffer()));assert.deepEqual([...exp.data],[...im.data],'PNG导出');
  Object.assign(app.animationPlayer,{sheetIndex:si,actionIndex:ai,currentFrame:fi});app.animationPlayer._renderPreviewFrame(false);assert(nonempty(app.animationPlayer.canvas.getContext('2d').getImageData(0,0,144,144)),'动画预览');checked++;
  const ci=actions.indexOf(ai);if(ci<0)continue;
  const cloth=model.layers[li],hair=model.layers.filter(l=>l.sheetIndex===si&&/前发|后发/.test(l.name)),vis=hair.map(l=>l.visible);
  hair.forEach(l=>l.visible=false);const nohair=cm.getCompositeImageData(si,ai,fi,true,1);
  const cv=cloth.visible;cloth.visible=false;const bare=cm.getCompositeImageData(si,ai,fi,true,1);cloth.visible=cv;hair.forEach((l,i)=>l.visible=vis[i]);
  const garment=decode(p.layers[li].frameData[`${si}_${ai}_${fi}`]);assert(nonempty(garment));assert(nonempty(nohair));assert(nonempty(bare));
  const images=[im,im,nohair,garment,bare],ctx=ctxs[ci];
  for(let row=0;row<5;row++){
   const tile=createCanvas(32,32);tile.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(images[row].data),32,32),0,0);
   ctx.fillStyle=row===1?'#302d39':'#e3dfe8';ctx.fillRect(fi*192,row*160,192,160);ctx.drawImage(tile,fi*192+4,row*160+20,128,128);ctx.drawImage(tile,fi*192+154,row*160+80,32,32);
   ctx.fillStyle=row===1?'#fff':'#222';ctx.font='12px sans-serif';ctx.fillText(`${label} ${['full light','full dark','no hair','outfit','bare'][row]} ${fi+1}`,fi*192+4,row*160+14);
  }
  fs.writeFileSync(out+`/${label}-${ai}-${fi}.png`,png.encode(32,32,im.data));
 }
 for(let i=0;i<actions.length;i++)fs.writeFileSync(out+`/${label}-${['side','front'][i]}.png`,contacts[i].toBuffer('image/png'));
 return checked;
}
(async()=>{
 if(process.argv[2]==='publish'){
  const p=JSON.parse(fs.readFileSync(out+'/candidate.json'));scope(p);
  const latest=await fetch(meta.url);assert(latest.ok);assert.deepEqual(await latest.json(),before,'出现新保存，停止并比较，禁止盲目覆写');
  const r=await fetch(meta.url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(p)}),text=await r.text();
  fs.writeFileSync(out+'/save-response.json',JSON.stringify({status:r.status,body:text,etag:r.headers.get('etag')},null,2));assert.equal(r.status,200,text);
  const back=await fetch(meta.url);assert(back.ok);const raw=await back.text(),readback=JSON.parse(raw);assert.deepEqual(readback,p);scope(readback);fs.writeFileSync(out+'/api-readback.json',raw);
  await render(readback,'readback');const v=JSON.parse(fs.readFileSync(out+'/verification.json'));Object.assign(v,{saved:true,apiReadbackExact:true,etag:back.headers.get('etag')});fs.writeFileSync(out+'/verification.json',JSON.stringify(v,null,2));console.log('PASS PUT 200 / API exact / all 12 sitting frames rendered');return;
 }
 const checkedBefore=await render(before,'before'),p=structuredClone(before),changes=[];
 for(const ai of actions){
  assert.equal(p.spriteSheets[si].actions[ai].frames.length,4);
  const source=p.layers[li].frameData[`${si}_${ai}_0`],first=decode(source);assert.equal(first.width,32);assert.equal(first.height,32);assert(nonempty(first));
  for(let fi=1;fi<4;fi++){
   const key=`${si}_${ai}_${fi}`,old=decode(p.layers[li].frameData[key]),edits=[];
   assert.equal(old.width,32);assert.equal(old.height,32);
   for(let k=0;k<old.data.length;k+=4)if(!Buffer.from(old.data.subarray(k,k+4)).equals(Buffer.from(first.data.subarray(k,k+4))))edits.push({x:k/4%32,y:Math.floor(k/128),before:[...old.data.subarray(k,k+4)],after:[...first.data.subarray(k,k+4)]});
   p.layers[li].frameData[key]={...p.layers[li].frameData[key],dataURL:source.dataURL};assert.deepEqual([...decode(p.layers[li].frameData[key]).data],[...first.data]);
   changes.push({layer:li,key,source:`${si}_${ai}_0`,changedPixels:edits.length,edits});
  }
 }
 const restored=scope(p);fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/changes.json',JSON.stringify(changes,null,2));
 const checkedAfter=await render(p,'after');
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:meta.sha256,layer:li,changedKeys:keys,firstFramesExact:true,otherLayersActionsAndBackExact:true,allSixOutfitCelsMatchOwnFirstFrame:true,noScalingCompressionRecolorOrMovement:true,frameTimingAndMetadataExact:true,restoreExtraCopyExact:true,mainCanvasPNGAnimationPreviewBefore:checkedBefore,mainCanvasPNGAnimationPreviewAfter:checkedAfter,browserChecked:false,saved:false},null,2));
 fs.writeFileSync(out+'/恢复说明.txt','original.json 是本次 API 原始备份；SHA256 与 ETag 见 source.json。changes.json 记录6帧逐像素差异。只撤销本次同步时，仅恢复坐姿服装层所列6个 frameData，不覆盖整份工程；恢复副本 restore-extra-copy.json 已验证与原稿一致。在线恢复须先比较用户后续修改，再以当前 ETag 条件保存。');
 console.log(JSON.stringify({out,changes:changes.map(({key,changedPixels})=>({key,changedPixels})),checkedBefore,checkedAfter},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
