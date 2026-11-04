const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/duck-visible-sync-path.txt'),'utf8')),meta=JSON.parse(fs.readFileSync(out+'/source.json')),before=JSON.parse(fs.readFileSync(out+'/original.json')),S=4,N=144;
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
  for(let i=0;i<hand.data.length;i+=4)if(hand.data[i+3]&&Buffer.from(old.data.subarray(i,i+4)).equals(Buffer.from(hand.data.subarray(i,i+4))))assert.deepEqual(im.data.subarray(i,i+4),hand.data.subarray(i,i+4),'原来可见的前手不能被衣服盖住');
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

 const base=await load(before),p=structuredClone(before),sourceLI=p.layers.findIndex(l=>l.name==='服装 / 衣服-小黄鸭'&&l.frameData['8_1_0']),source=layerImage(base,sourceLI,1,0),records=[];
 assert(sourceLI>=0);
 const colors={gold:[187,146,21,255],yellow:[251,207,78,255],cream:[252,244,229,255]};
 function make(ai,fi){
  const bodyLI=base.layers.findIndex(l=>l.sheetIndex===8&&l.name==='body'&&l.getFrameData(`8_${ai}_${fi}`)),body=layerImage(base,bodyLI,ai,fi),shoulder=bounds(body).y;
  assert([24,26].includes(shoulder));const dst=new Uint8Array(36*36*4);
  // Keep feet fixed; map shoulder, waist and hem separately with nearest-neighbor samples.
  function sourceY(y){const t=y+.5;return shoulder===24?y:Math.floor(t<26?t-2:t<30?24+(t-26)*5/4:t<32.5?29+(t-30)*3.5/2.5:t);}
  for(let y=0;y<36;y++)for(let x=0;x<36;x++){
   const sy=sourceY(y);if(sy<0||sy>=36)continue;
   const q=(sy*36+x)*4;let c=Array.from(source.data.subarray(q,q+4));
   const cream=colors.cream,gold=colors.gold,yellow=colors.yellow,edge=[70,70,94,255],skirt=[236,236,236,255],bagEdge=[119,119,119,255],clasp=[71,66,44,255];
   if(ai!==1&&sy>=24&&sy<=32&&x>=12&&x<=23){
    c=sy===32?skirt:sy===31?gold:yellow;
    if(ai===0){
     if(x===12&&sy<31)c=gold;
     if(sy===24&&x>=15)c=cream;
     if(sy===25&&x>=17&&x<=22)c=cream;
     if(sy===25&&(x===16||x===23)||sy===26&&x>=17&&x<=22)c=gold;
     // A single turned collar, diagonal strap and hip bag; not a squeezed front image.
     if(sy>=25&&sy<=29&&x===17+(sy-25))c=cream;
     if(sy>=28&&sy<=31&&x>=21){c=(x===21||x===23||sy===28||sy===31)?bagEdge:skirt;if(x===22&&sy===29)c=clasp;}
    }else{
     if(sy===24&&x>=14&&x<=21||sy===25&&x>=15&&x<=20)c=cream;
     if(sy===26&&x>=15&&x<=20)c=gold;
     if(x===12&&sy>24&&sy<28)c=gold;
     if(sy>=25&&sy<=30&&x===19-(sy-25))c=cream;
     if(sy>=28&&sy<=31&&x<=14){c=(x===12||x===14||sy===28||sy===31)?bagEdge:skirt;if(x===13&&sy===29)c=clasp;}
    }
   }
   // Side/back use their actual body silhouette; front is the user's complete native drawing.
   if(ai!==1&&!body.data[(y*36+x)*4+3])continue;
   dst.set(c,(y*36+x)*4);
  }
  assert(dst.some((v,i)=>i%4===3&&v));for(let i=3;i<dst.length;i+=4)assert(dst[i]===0||dst[i]===255);
  return {data:dst,shoulder};
 }
 const changed=[sourceLI];
 for(let ai=0;ai<3;ai++){
  let li=sourceLI;
  if(ai!==1){li=p.layers.findIndex(l=>l.sheetIndex===8&&l.name.startsWith('服装 / 衣服-小黄鸭')&&l.frameData[`8_${ai}_0`]);assert(li>=0);p.layers[li].name=p.layers[sourceLI].name+(ai===0?'（侧面）':'（背面）');p.layers[li].visible=true;changed.push(li);}
  for(let fi=0;fi<4;fi++){
   if(ai===1&&fi===0)continue;
   const g=make(ai,fi),key=`8_${ai}_${fi}`,bytes=png.encode(36,36,g.data);
   p.layers[li].frameData[key]={width:36,height:36,dataURL:'data:image/png;base64,'+bytes.toString('base64')};
   fs.writeFileSync(out+`/synced-outfit-${ai}-${fi}.png`,bytes);records.push({li,key,shoulder:g.shoulder,source:'8_1_0',feetFixed:true});
  }
 }
 for(const fi of [0])assert.deepEqual(p.layers[sourceLI].frameData[`8_1_${fi}`],before.layers[sourceLI].frameData[`8_1_${fi}`],'用户前两帧原样保留');
 const recovery=structuredClone(p);for(const li of changed)recovery.layers[li]=structuredClone(before.layers[li]);assert.deepEqual(recovery,before,'范围外数据不变');
 fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);

 // Exercise the real picker: choosing any direction must leave all three visible.
 document.addEventListener=()=>{};vm.runInThisContext(fs.readFileSync(path.join(root,'js/visual-layers.js'),'utf8'));
 for(const li of changed){const test=await load(p),app={project:test,animationPlayer:{pause(){},_renderPreviewFrame(){}},history:{undoStack:[],redoStack:[],_notifyChange(){}},updateLayerList(){},updatePalette(){},updateStatusBar(){},canvasManager:{render(){}},persistence:{markDirty(){}}};PE.VisualLayers.choose(app,li);for(const j of changed)assert(test.layers[j].visible,'选用一个方向不能隐藏另外方向');}
 await verify(before);fs.copyFileSync(out+'/idle-outfit.png',out+'/before-idle.png');await verify(p);
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/changes.json',JSON.stringify(records,null,2));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({sourceSHA256:meta.sha256,sourceLayer:sourceLI,userFirstFrontCelExact:true,changedLayers:changed,elevenCelsSynced:true,noAddedLayers:true,otherLayersAndActionsExact:true,frameCountsDurationsExact:true,directionPickerKeepsAllThreeVisible:true,mainCanvasAndPNGActualScaleChecked:true,studioPreview12FramesChecked:true,restoreExtraCopyExact:true,browserChecked:false},null,2));
 console.log('PASS: latest user first cel preserved exactly; 11 remaining idle cels adapted; all unrelated data unchanged.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
