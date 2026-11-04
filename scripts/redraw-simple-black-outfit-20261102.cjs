const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/simple-black-outfit-path.txt'),'utf8')),meta=JSON.parse(fs.readFileSync(out+'/source.json')),before=JSON.parse(fs.readFileSync(out+'/original.json')),S=4,N=144;
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const load=async data=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
function bounds(im){let x0=im.width,y0=im.height,x1=-1,y1=-1;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
function layerImage(model,li,ai,fi,scale=1){const c=createCanvas(36*scale,36*scale);PE.utils.drawImageData(c.getContext('2d'),model.layers[li].getFrameData(`8_${ai}_${fi}`),0,0,scale);return c.getContext('2d').getImageData(0,0,c.width,c.height);}
const C={edge:'#293438',black:'#252c2e',shade:'#192124',white:'#e4e9e2',pants:'#697f78',pantsDark:'#526962',shoe:'#e8ece6',shoeShade:'#b9c9c5'};
const rgba=hex=>[...hex.slice(1).match(/../g).map(v=>parseInt(v,16)),255];
function garment(body,ai,fi){
 const data=new Uint8Array(N*N*4),mask=body.data,commands=[],top=bounds(body).y,shoulder=top,waist=29+(shoulder-24)/2;
 function Y(y){return y<=29?shoulder+(y-24)*(waist-shoulder)/5:y<=32.5?waist+(y-29)*(32.5-waist)/3.5:y;}
 function polygon(color,points){
  const ps=points.map(([x,y])=>[x*S,Y(y)*S]),col=rgba(color);commands.push({color,points});
  const x0=Math.max(0,Math.floor(Math.min(...ps.map(v=>v[0])))),x1=Math.min(N-1,Math.ceil(Math.max(...ps.map(v=>v[0])))),y0=Math.max(0,Math.floor(Math.min(...ps.map(v=>v[1])))),y1=Math.min(N-1,Math.ceil(Math.max(...ps.map(v=>v[1]))));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
   const native=(Math.floor(y/S)*36+Math.floor(x/S))*4;if(!mask[native+3])continue;
   let inside=false;for(let i=0,j=ps.length-1;i<ps.length;j=i++){const [ax,ay]=ps[i],[bx,by]=ps[j];if((ay>y+.5)!==(by>y+.5)&&x+.5<(bx-ax)*(y+.5-ay)/(by-ay)+ax)inside=!inside;}
   if(inside)data.set(col,(y*N+x)*4);
  }
 }
 const rect=(c,x,y,w,h)=>polygon(c,[[x,y],[x+w,y],[x+w,y+h],[x,y+h]]);
 // A complete outfit under hands/hair, clipped only to the unmodified body silhouette.
 for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(mask[(Math.floor(y/S)*36+Math.floor(x/S))*4+3])data.set(rgba(C.edge),(y*N+x)*4);
 rect(C.black,11.25,24,13.5,5.25);
 // Broad planes only: no patches, tiny text, texture or decorative folds.
 if(ai===0)rect(C.shade,11.25,24,3,5.25);
 else rect(C.shade,11.25,24,1,5.25);
 if(ai===2){
  rect(C.shade,15,24,6,1);rect(C.white,15,24,6,.25);
 }else{
  const zip=ai===0?20.25:18;
  rect(C.shade,zip-2.5,24,4.75,1);
  rect(C.white,zip-2.5,24,4.75,.25);
  rect(C.white,zip,24.25,.25,4.75);
 }
 rect(C.white,11.25,28.9,13.5,.45);
 rect(C.pants,11.25,29.35,13.5,3.25);
 // The side view keeps the original far leg darker, with no zig-zag folds.
 if(ai===0)rect(C.pantsDark,18.5,29.35,6.25,3.25);
 else {rect(C.pantsDark,11.25,29.35,1,3.25);rect(C.pantsDark,23.25,29.35,1.5,3.25);}
 rect(C.edge,17.25,31.75,1.5,2.25);
 for(const [x0,x1,dark] of [[11.25,17,ai===2],[19,24.75,ai!==1]]){
  rect(dark?C.shoeShade:C.shoe,x0,32.6,x1-x0,1.15);
  rect(C.shoeShade,x0,33.5,x1-x0,.25);
 }
 assert(data.some((v,i)=>i%4===3&&v));for(let i=3;i<data.length;i+=4)assert(data[i]===0||data[i]===255);
 return {data,commands,shoulder,waist,shoeBottom:34};
}
async function verify(data){
 const model=await load(data),cm=new PE.CanvasManager(document.createElement('canvas'),model);cm.zoom=8;const ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
 const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8'),a=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),b=studio.indexOf('  const originalSetTool=',a);assert(a>=0&&b>a);
 const app={project:model,canvasManager:cm,animationPlayer:new PE.AnimationPlayer()};app.animationPlayer.canvas=document.createElement('canvas');new Function('app','bounds',studio.slice(a,b))(app,bounds);
 const contact=createCanvas(864,3*432),ctx=contact.getContext('2d');ctx.imageSmoothingEnabled=false;const native=createCanvas(864,432),nc=native.getContext('2d');nc.imageSmoothingEnabled=false;
 const oldModel=await load(before),oldCM=new PE.CanvasManager(document.createElement('canvas'),oldModel),clothes=model.layers.filter(l=>l.name.startsWith('服装 / 黑立领背心灰绿裤'));
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=fi;
  const im=cm.getCompositeImageData(8,ai,fi,true,S);assert(bounds(im));cm.render();assert.equal(cm.offscreenCanvas.width,N);assert.deepEqual(cm.offscreenCtx.getImageData(0,0,N,N).data,im.data,'高清主画布路径');
  const blob=await ex.exportFrameAsBlob(8,ai,fi),buf=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(buf).data),Array.from(im.data),'高清PNG导出');fs.writeFileSync(out+`/frame-${ai}-${fi}.png`,buf);
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
 const base=await load(before),p=structuredClone(before),records=[],changed=[];
 for(let ai=0;ai<3;ai++){
  const bodyLI=base.layers.findIndex(l=>l.sheetIndex===8&&l.name==='body'&&l.getFrameData(`8_${ai}_0`));
  const li=p.layers.findIndex(l=>l.sheetIndex===8&&l.name==='服装 / 黑立领背心灰绿裤 / 套装'&&l.frameData[`8_${ai}_0`]);
  assert(bodyLI>=0&&li>=0);changed.push(li);
  for(let fi=0;fi<4;fi++){
   const g=garment(layerImage(base,bodyLI,ai,fi),ai,fi),key=`8_${ai}_${fi}`,bytes=png.encode(N,N,g.data);
   p.layers[li].frameData[key]={...p.layers[li].frameData[key],width:N,height:N,dataURL:'data:image/png;base64,'+bytes.toString('base64')};
   fs.writeFileSync(out+`/outfit-only-${ai}-${fi}.png`,bytes);records.push({li,key,shoulder:g.shoulder,waist:g.waist,commands:g.commands});
  }
 }
 const recovery=structuredClone(p);
 for(const li of changed)recovery.layers[li].frameData=structuredClone(before.layers[li].frameData);
 assert.deepEqual(recovery,before,'只允许修改三个服装层的12个待机帧');
 fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
 assert.deepEqual(p.spriteSheets,before.spriteSheets);
 await verify(p);fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/pixel-drawing-records.json',JSON.stringify(records,null,2));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:meta.sha256,changedLayers:changed,changedCels:records.map(r=>r.key),sourceResolution:[N,N],logicalResolution:[36,36],paletteColors:8,noNewLayers:true,allOtherLayersMetadataAndActionsUnchanged:true,hairEyesBodyHandsUnchanged:true,HDMainAndPNG12FramesMatch:true,actualStudioPreviewFunctionTested:true,restoreExtraCopyVerified:true,imageGenerationUsed:false,browserChecked:false},null,2));
 console.log('PASS: only 12 existing idle outfit cels redrawn; 8 colors; HD render/export/preview and extra-copy restore verified.');console.log(out);

})().catch(e=>{console.error(e);process.exitCode=1});
