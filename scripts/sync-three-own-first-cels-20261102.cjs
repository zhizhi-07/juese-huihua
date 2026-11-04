const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/duck-three-first-sync-path.txt'),'utf8')),meta=JSON.parse(fs.readFileSync(out+'/source.json')),before=JSON.parse(fs.readFileSync(out+'/original.json')),S=4,N=144;
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const load=async data=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
function bounds(im){let x0=im.width,y0=im.height,x1=-1,y1=-1;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
function layerImage(model,li,ai,fi,scale=1){const c=createCanvas(36*scale,36*scale);PE.utils.drawImageData(c.getContext('2d'),model.layers[li].getFrameData(`8_${ai}_${fi}`),0,0,scale);return c.getContext('2d').getImageData(0,0,c.width,c.height);}
async function verify(data){
 const model=await load(data),cm=new PE.CanvasManager(document.createElement('canvas'),model);cm.zoom=8;const ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
 const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8'),a=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),b=studio.indexOf('  const originalSetTool=',a);assert(a>=0&&b>a);
 const app={project:model,canvasManager:cm,animationPlayer:new PE.AnimationPlayer()};app.animationPlayer.canvas=document.createElement('canvas');new Function('app','bounds',studio.slice(a,b))(app,bounds);
 const contact=createCanvas(864,3*432),ctx=contact.getContext('2d');ctx.imageSmoothingEnabled=false;const native=createCanvas(864,432),nc=native.getContext('2d');nc.imageSmoothingEnabled=false;
 const oldModel=await load(before),oldCM=new PE.CanvasManager(document.createElement('canvas'),oldModel),clothes=model.layers.filter(l=>l.name.startsWith('服装 / 黑立领背心灰绿裤'));
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=fi;
  const im=cm.getCompositeImageData(8,ai,fi,true,S);assert(bounds(im));cm.render();const mw=cm.offscreenCanvas.width;assert.deepEqual(cm.offscreenCtx.getImageData(0,0,mw,mw).data,cm.getCompositeImageData(8,ai,fi,true,mw/36).data,'实际主画布路径');
  const blob=await ex.exportFrameAsBlob(8,ai,fi),buf=Buffer.from(await blob.arrayBuffer());const exported=png.decode(buf);assert.deepEqual(Array.from(exported.data),Array.from(cm.getCompositeImageData(8,ai,fi,true,exported.width/36).data),'实际PNG导出');fs.writeFileSync(out+`/frame-${ai}-${fi}.png`,png.encode(N,N,im.data));
  app.animationPlayer.sheetIndex=8;app.animationPlayer.actionIndex=ai;app.animationPlayer.currentFrame=fi;app.animationPlayer._renderPreviewFrame(false);assert(app.animationPlayer._previewCache.frames.length===4);assert(bounds(app.animationPlayer.canvas.getContext('2d').getImageData(0,0,144,144)));fs.writeFileSync(out+`/studio-preview-${ai}-${fi}.png`,app.animationPlayer.canvas.toBuffer('image/png'));
  const old=oldCM.getCompositeImageData(8,ai,fi,true,S),near=model.layers.findIndex(l=>l.sheetIndex===8&&l.name==='hand'&&l.getFrameData(`8_${ai}_${fi}`)),hand=layerImage(model,near,ai,fi,S);
  for(let i=0;i<hand.data.length;i+=4)if(hand.data[i+3]&&Buffer.from(old.data.subarray(i,i+4)).equals(Buffer.from(hand.data.subarray(i,i+4))))assert.deepEqual(im.data.subarray(i,i+4),hand.data.subarray(i,i+4),`手部遮挡 ai=${ai} fi=${fi} x=${i/4%144} y=${Math.floor(i/4/144)}`);
  const tile=createCanvas(N,N);tile.getContext('2d').putImageData(im,0,0);
  for(let bg=0;bg<2;bg++){ctx.fillStyle=bg?'#302d39':'#e3dfe8';ctx.fillRect(fi*216,(ai*3+bg)*144,216,144);ctx.drawImage(tile,fi*216,(ai*3+bg)*144,144,144);ctx.drawImage(tile,fi*216+165,(ai*3+bg)*144+50,36,36);}
  // Verify the full garment under hair without changing saved visibility or importing clothes from elsewhere.
  const hair=model.layers.filter(l=>l.sheetIndex===8&&/前发|后发/.test(l.name)),vis=hair.map(l=>l.visible);hair.forEach(l=>l.visible=false);const bare=cm.getCompositeImageData(8,ai,fi,true,S);hair.forEach((l,i)=>l.visible=vis[i]);const bt=createCanvas(N,N);bt.getContext('2d').putImageData(bare,0,0);ctx.fillStyle='#e3dfe8';ctx.fillRect(fi*216,(ai*3+2)*144,216,144);ctx.drawImage(bt,fi*216,(ai*3+2)*144,144,144);
  nc.fillStyle='#e3dfe8';nc.fillRect(fi*216,ai*144,216,144);nc.drawImage(tile,fi*216,ai*144,144,144);nc.drawImage(tile,fi*216+170,ai*144+54,36,36);
 }
 fs.writeFileSync(out+'/all-idle-checks.png',contact.toBuffer('image/png'));fs.writeFileSync(out+'/idle-outfit.png',native.toBuffer('image/png'));return model;
}
(async()=>{
 if(process.argv[2]==='publish'){
  const p=JSON.parse(fs.readFileSync(out+'/candidate.json')),url='http://127.0.0.1:8765/api/project?id='+meta.id,r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),before,'用户有新保存，不能覆盖');const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(p)});const text=await saved.text();assert(saved.ok,text);fs.writeFileSync(out+'/save-response.txt',saved.status+'\n'+text);const back=await fetch(url);assert(back.ok);const raw=await back.text();assert.deepEqual(JSON.parse(raw),p);fs.writeFileSync(out+'/api-readback.json',raw);console.log('PASS publish: ETag checked; live API exactly matches outfit candidate.');return;
 }

 const base=await load(before),p=structuredClone(before),records=[],changed=[];
 for(let li=0;li<p.layers.length;li++){
  const layer=p.layers[li];if(layer.sheetIndex!==8||!layer.name.startsWith('服装 / 衣服-小黄鸭'))continue;
  changed.push(li);
  for(let ai=0;ai<3;ai++){
   const firstKey=`8_${ai}_0`,first=before.layers[li].frameData[firstKey];if(!first)continue;
   const source=layerImage(base,li,ai,0),bodyLI=base.layers.findIndex(l=>l.sheetIndex===8&&l.name==='body'&&l.getFrameData(firstKey)),firstShoulder=bounds(layerImage(base,bodyLI,ai,0)).y;
   assert.equal(firstShoulder,24,'以当前方向真实首帧为起点');
   for(let fi=1;fi<4;fi++){
    const shoulder=bounds(layerImage(base,bodyLI,ai,fi)).y,key=`8_${ai}_${fi}`;assert([24,26].includes(shoulder));
    if(shoulder===firstShoulder)layer.frameData[key]=structuredClone(first);
    else{
     const pixels=new Uint8Array(36*36*4);
     // Shoulder follows 2px, waist follows 1px; the lower hem and soles stay planted.
     for(let y=0;y<36;y++){
      const t=y+.5,sy=Math.floor(t<26?t-2:t<30?24+(t-26)*5/4:t<32.5?29+(t-30)*3.5/2.5:t);
      if(sy>=0&&sy<36)pixels.set(source.data.subarray(sy*36*4,(sy+1)*36*4),y*36*4);
     }
     for(let y=33;y<36;y++)assert.deepEqual(Buffer.from(pixels.subarray(y*144,(y+1)*144)),Buffer.from(source.data.subarray(y*144,(y+1)*144)),'鞋底不漂移');
     layer.frameData[key]={width:36,height:36,dataURL:'data:image/png;base64,'+png.encode(36,36,pixels).toString('base64')};
    }
    records.push({li,key,source:firstKey,shoulder,feetFixed:true});
   }
   assert.deepEqual(layer.frameData[firstKey],before.layers[li].frameData[firstKey],'每个方向每个首帧逐字段保留');
  }
 }

 // Move overlapping cloth pixels into the existing under-hand outfit, never erase a hand or punch a garment hole.
 const overlayLI=p.layers.findIndex(l=>l.sheetIndex===8&&l.name==='服装 / 衣服-小黄鸭'&&l.frameData['8_1_0']);
 for(const ai of [0,2])for(let fi=1;fi<4;fi++){
  const key=`8_${ai}_${fi}`,underLI=p.layers.findIndex((l,i)=>i!==overlayLI&&l.sheetIndex===8&&l.name.startsWith('服装 / 衣服-小黄鸭')&&l.frameData[key]),handLI=base.layers.findIndex(l=>l.sheetIndex===8&&l.name==='hand'&&l.getFrameData(key));
  const front=png.decode(Buffer.from(p.layers[overlayLI].frameData[key].dataURL.split(',')[1],'base64')),under=png.decode(Buffer.from(p.layers[underLI].frameData[key].dataURL.split(',')[1],'base64')),hand=layerImage(base,handLI,ai,fi);let moved=0;
  for(let i=0;i<front.data.length;i+=4)if(front.data[i+3]&&hand.data[i+3]){under.data.set(front.data.subarray(i,i+4),i);front.data.fill(0,i,i+4);moved++;}
  for(const [li,im] of [[overlayLI,front],[underLI,under]])p.layers[li].frameData[key].dataURL='data:image/png;base64,'+png.encode(36,36,im.data).toString('base64');
  records.find(r=>r.li===overlayLI&&r.key===key).pixelsRoutedUnderHand=moved;
 }
 const restored=structuredClone(p);for(const li of changed)restored.layers[li].frameData=structuredClone(before.layers[li].frameData);assert.deepEqual(restored,before,'只同步服装后3帧，其他数据完全不变');
 fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
 await verify(before);fs.copyFileSync(out+'/idle-outfit.png',out+'/before-idle.png');await verify(p);
 const m=await load(p),cm=new PE.CanvasManager(document.createElement('canvas'),m),oldcm=new PE.CanvasManager(document.createElement('canvas'),base);
 for(let ai=0;ai<3;ai++)assert.deepEqual(cm.getCompositeImageData(8,ai,0,true,4).data,oldcm.getCompositeImageData(8,ai,0,true,4).data,'三个方向首帧整体效果不变');
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/changes.json',JSON.stringify(records,null,2));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({sourceSHA256:meta.sha256,changedLayers:changed,threeDirectionalFirstCelsExact:true,firstCompositePixelsExact:true,onlyOtherNineIdleCelsSynced:true,perLayerWrites:records.length,allOtherDataExact:true,sourceByOwnDirection:true,noMetadataChanges:true,frameCountsAndTimingExact:true,solesFixed:true,mainCanvasPNGAndStudioPreview12FramesChecked:true,restoreExtraCopyVerified:true,browserChecked:false},null,2));
 console.log('PASS: all 3 user first frames and their composite pixels preserved; each direction propagated only to its own next 3 frames.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
