const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),backup=path.join(root,'备份/20261030-v嘴与普通层自由放置-1793349734165'),out=path.join(root,'自检记录/小v嘴与普通层自由放置-20261030'),url='http://127.0.0.1:8765/api/project?id=character-gold-mix-1793320553623';
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'));
const decode=async raw=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;
function imageCanvas(d){const c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);return c;}
async function prepare(){
  fs.mkdirSync(out,{recursive:true});const r=await fetch(url);assert(r.ok);const bytes=Buffer.from(await r.arrayBuffer()),raw=JSON.parse(bytes),candidate=structuredClone(raw);
  fs.writeFileSync(path.join(backup,'mouth-original.json'),bytes);fs.writeFileSync(path.join(backup,'mouth-metadata.json'),JSON.stringify({url,etag:r.headers.get('etag'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')},null,2));
  const si=candidate.spriteSheets.findIndex(s=>s.name==='original32_idle'),ai=candidate.spriteSheets[si].actions.findIndex(a=>a.direction==='down'),eyes=candidate.layers.find(l=>l.sheetIndex===si&&l.name==='眼睛 / 浅蓝·仅眼睛可编辑画布');
  assert(eyes);assert(!candidate.layers.some(l=>l.sheetIndex===si&&/嘴|mouth/i.test(l.name)),'Existing mouth: inspect instead of replacing');
  const source=new ImageData(4,2),rgb=[171,115,126,255];for(const [x,y]of [[0,0],[2,0],[1,1]])source.data.set(rgb,(y*4+x)*4);
  assert.equal([...source.data].filter((v,i)=>i%4===3&&v).length,3);
  const src=imageCanvas(source);fs.writeFileSync(path.join(out,'小v嘴-透明源.png'),src.toBuffer('image/png'));
  const mouth={name:'嘴巴 / 小v',sheetIndex:si,parent:eyes.parent,isGroup:false,visible:true,locked:false,opacity:1,depth:eyes.depth,frameData:{}};
  for(let fi=0;fi<4;fi++){const k=`${si}_${ai}_${fi}`,e=eyes.frameData[k].placement;mouth.frameData[k]={width:4,height:2,dataURL:src.toDataURL('image/png'),placement:{x:Math.round((e.x+e.w/2-.75)*100)/100,y:e.y+8,w:2,h:1}};}
  candidate.layers.push(mouth);assert.deepEqual(candidate.layers.slice(0,-1),raw.layers);const copy=structuredClone(candidate);copy.layers.pop();assert.deepEqual(copy,raw);
  const p=await decode(candidate),before=await decode(raw),cm=new PE.CanvasManager(document.createElement('canvas'),p),oldCM=new PE.CanvasManager(document.createElement('canvas'),before),ex=new PE.ExportManager();ex.init(p,cm);
  const sheet=createCanvas(864,864),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let mode=0;mode<2;mode++)for(let state=0;state<2;state++){
    const model=state?p:before,manager=state?cm:oldCM,row=mode*2+state;
    for(const [i,l]of model.layers.entries())if(l.name.startsWith('头发 /')||l.name.startsWith('服装 /'))l.visible=mode===0?candidate.layers[i].visible:false;
    for(let fi=0;fi<4;fi++){const image=manager.getCompositeImageData(si,ai,fi,true,10);assert(image.data.some((v,i)=>i%4===3&&v));ctx.fillStyle=mode?'#333541':'#e8e0d8';ctx.fillRect(fi*216,row*216,216,216);ctx.drawImage(imageCanvas(image),fi*216,row*216,216,216);}
  }
  fs.writeFileSync(path.join(out,'加嘴前后-四帧-穿衣裸身.png'),sheet.toBuffer('image/png'));
  for(const [i,l]of p.layers.entries())l.visible=candidate.layers[i].visible;for(const [i,l]of before.layers.entries())l.visible=raw.layers[i].visible;
  for(let direction=0;direction<3;direction++)if(direction!==ai)for(let fi=0;fi<4;fi++){assert(!mouth.frameData[`${si}_${direction}_${fi}`]);assert.deepEqual(cm.getCompositeImageData(si,direction,fi,true,10).data,oldCM.getCompositeImageData(si,direction,fi,true,10).data);}
  p.selectFrame(si,ai,0);const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),p,cm);
  const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8'),bounds=studio.slice(studio.indexOf('  function bounds(image)'),studio.indexOf('  const frameList=')),preview=studio.slice(studio.indexOf('  app.animationPlayer._renderPreviewFrame=function(){'),studio.indexOf('  const originalSetTool='));vm.runInNewContext(bounds+preview,{app:{project:p,canvasManager:cm,animationPlayer:player},PE,document});
  for(let fi=0;fi<4;fi++){
    p.selectFrame(si,ai,fi);cm.canvas.width=432;cm.canvas.height=432;cm.zoom=12;cm.showGrid=false;cm.centerView();cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,432,432).data,cm.getCompositeImageData(si,ai,fi,true,12).data);
    const data=cm.getCompositeImageData(si,ai,fi,true,10),blob=await ex.exportFrameAsBlob(si,ai,fi),buf=Buffer.from(await blob.arrayBuffer()),im=await loadImage(buf),test=createCanvas(im.width,im.height);test.getContext('2d').drawImage(im,0,0);assert.deepEqual(test.getContext('2d').getImageData(0,0,im.width,im.height).data,data.data);
    fs.writeFileSync(path.join(out,`待机正面-${fi+1}.png`),buf);player.currentFrame=fi;player._renderPreviewFrame();fs.writeFileSync(path.join(out,`动画预览-${fi+1}.png`),player.canvas.toBuffer('image/png'));
    const thumb=document.createElement('canvas');vm.runInNewContext(bounds+'paintThumbnail(thumb,image);',{thumb,image:data,document});fs.writeFileSync(path.join(out,`缩略图-${fi+1}.png`),thumb.toBuffer('image/png'));
    if(fi===0)fs.writeFileSync(path.join(out,'主画布-小v嘴.png'),cm.canvas.toBuffer('image/png'));
  }
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));fs.writeFileSync(path.join(out,'mouth-verification.json'),JSON.stringify({newLayerIndex:candidate.layers.length-1,mouthPixels:3,keys:Object.keys(mouth.frameData),placements:Object.values(mouth.frameData).map(f=>f.placement),allExistingLayersUnchanged:true,sideBackUnchanged:true,mainRenderAndPngChecked:true,studioAnimationAndThumbnailRendered:true,browserProjectNotTouched:true},null,2));
  console.log('PREPARED: independent small-v mouth, three source pixels, four front idle cels only; all existing data exact.');
}
async function commit(){
  const meta=JSON.parse(fs.readFileSync(path.join(backup,'mouth-metadata.json'))),candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'))),r=await fetch(url);assert(r.ok);assert.equal(r.headers.get('etag'),meta.etag,'User saved meanwhile; merge instead of overwriting');assert.deepEqual(await r.json(),JSON.parse(fs.readFileSync(path.join(backup,'mouth-original.json'))));
  const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(candidate)}),reply=await put.text();fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:put.status,etag:put.headers.get('etag'),body:reply},null,2));assert.equal(put.status,200,reply);
  const back=await fetch(url);assert(back.ok);const bytes=await back.text();assert.deepEqual(JSON.parse(bytes),candidate);fs.writeFileSync(path.join(out,'api-readback.json'),bytes);console.log('SAVED mouth HTTP 200; exact API readback verified.');
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
