const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/duck-single-outfit-path.txt'),'utf8')),meta=JSON.parse(fs.readFileSync(out+'/source.json')),before=JSON.parse(fs.readFileSync(out+'/original.json')),S=4,N=144;
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

 const base=await load(before),p=structuredClone(before),original=p.layers.slice(),selected=original[p.currentLayerIndex],parents=new Map(original.map(l=>[l,l.parent==null?null:original[l.parent]]));
 const clothes=original.filter(l=>l.sheetIndex===8&&l.name.startsWith('服装 / 衣服-小黄鸭')),single=clothes.find(l=>l.frameData['8_1_0']),near=original.filter(l=>l.sheetIndex===8&&l.name==='hand'),anchor=original.find(l=>l.sheetIndex===8&&l.name.startsWith('眼睛 /'));
 assert.equal(clothes.length,3);assert.equal(near.length,3);assert(anchor&&single);const sourceIndex=original.indexOf(single),allFrames={};
 for(const l of clothes)for(const [key,data]of Object.entries(l.frameData)){assert(!allFrames[key]);allFrames[key]=structuredClone(data);}
 assert.equal(Object.keys(allFrames).length,12);single.frameData=allFrames;single.parent=null;single.depth=0;parents.set(single,null);
 // One complete outfit sits after all heads but before the original near hands; far hands stay behind the body.
 for(const l of near){l.parent=null;l.depth=0;parents.set(l,null);}
 p.layers=[];for(const l of original){if(l===anchor)p.layers.push(single,...near);if(clothes.includes(l)||near.includes(l))continue;p.layers.push(l);}
 for(const l of p.layers)l.parent=parents.get(l)==null?null:p.layers.indexOf(parents.get(l));p.currentLayerIndex=p.layers.indexOf(selected);if(p.currentLayerIndex<0)p.currentLayerIndex=p.layers.indexOf(single);
 const mapping=before.layers.map((_,i)=>p.layers.indexOf(original[i])),changed=new Set([sourceIndex,...near.map(l=>original.indexOf(l))]),removed=clothes.filter(l=>l!==single).map(l=>original.indexOf(l));
 assert.equal(p.layers.length,before.layers.length-2);assert.equal(p.layers.filter(l=>l.sheetIndex===8&&l.name.startsWith('服装 /')).length,1);
 for(let i=0;i<before.layers.length;i++)if(!changed.has(i)&&!removed.includes(i)){const e=structuredClone(before.layers[i]);if(e.parent!=null)e.parent=mapping[e.parent];assert.deepEqual(p.layers[mapping[i]],e);}
 for(const h of near)assert.deepEqual(h.frameData,before.layers[original.indexOf(h)].frameData,'手部所有原始像素不变');assert.deepEqual(p.spriteSheets,before.spriteSheets);
 const recovery=structuredClone(p);recovery.layers=before.layers.map((l,i)=>changed.has(i)||removed.includes(i)?structuredClone(l):{...structuredClone(p.layers[mapping[i]]),parent:l.parent});recovery.currentLayerIndex=before.currentLayerIndex;assert.deepEqual(recovery,before);fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
 const model=await load(p),oc=new PE.CanvasManager(document.createElement('canvas'),base),nc=new PE.CanvasManager(document.createElement('canvas'),model);
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++)for(const hands of [false,true])assert.deepEqual(nc.getCompositeImageData(8,ai,fi,hands,4).data,oc.getCompositeImageData(8,ai,fi,hands,4).data,`合并前后完全一致 ai=${ai} fi=${fi} hands=${hands}`);
 await verify(before);fs.copyFileSync(out+'/idle-outfit.png',out+'/before-idle.png');await verify(p);
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/changes.json',JSON.stringify({singleOutfitOldIndex:sourceIndex,singleOutfitNewIndex:p.layers.indexOf(single),removedMergedOldIndices:removed,nearHandOldIndices:near.map(l=>original.indexOf(l)),oldToNewLayerIndex:mapping,frameKeys:Object.keys(allFrames)},null,2));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({sourceSHA256:meta.sha256,oneActualOutfitLayerAcrossAllDirections:true,twelveRawCelsPreserved:true,all12CompositesExactHandsOnAndOff:true,nearHandPixelsUnchanged:true,farHandOrderUnchanged:true,headHairEyesBodyAndOtherActionsPixelsExact:true,parentsRemappedByIdentity:true,frameCountSizeTimingExact:true,mainCanvasPNGAndPreview12FramesChecked:true,extraCopyRecoveryExact:true,browserChecked:false},null,2));console.log('PASS: ONE actual outfit layer containing all 12 cels; all 12 composites exact with hands on/off; original hands only reordered, pixels unchanged.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
