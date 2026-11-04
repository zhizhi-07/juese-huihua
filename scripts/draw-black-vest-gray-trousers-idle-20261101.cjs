const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/black-vest-outfit-path.txt'),'utf8')),meta=JSON.parse(fs.readFileSync(out+'/source.json')),before=JSON.parse(fs.readFileSync(out+'/original.json')),S=4,N=144;
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const load=async data=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
function bounds(im){let x0=im.width,y0=im.height,x1=-1,y1=-1;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
function layerImage(model,li,ai,fi,scale=1){const c=createCanvas(36*scale,36*scale);PE.utils.drawImageData(c.getContext('2d'),model.layers[li].getFrameData(`8_${ai}_${fi}`),0,0,scale);return c.getContext('2d').getImageData(0,0,c.width,c.height);}
const C={edge:'#293438',black:'#22292a',light:'#303939',shade:'#151c1e',fold:'#1b2325',white:'#e7ede8',whiteShade:'#b7c8c2',zip:'#cbd7d0',pants:'#657b76',pantsLight:'#788e85',pantsDark:'#4c6561',pantsDeep:'#354d4d',shoe:'#eef2ed',shoeShade:'#bacbd0',blue:'#3f788a',blueDark:'#30596c'};
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
 rect(C.black,11.25,24,13.5,5.1);
 if(ai===0){
  polygon(C.shade,[[11.25,24],[14,24.4],[14.25,28.7],[12,29],[11.25,28.4]]);
  polygon(C.light,[[15,24.4],[22.8,24.4],[23.7,27.8],[21.5,28.8],[15,28.65]]);
  polygon(C.fold,[[13.4,26.2],[14.2,25.8],[14.5,27.6],[13.7,28.4],[13.1,28.2]]);
 }else{
  polygon(C.light,[[12.4,24.7],[22.9,24.6],[23.5,27.8],[20.5,28.5],[12.8,28.25]]);
  polygon(C.shade,[[11.25,25],[12.5,25.2],[13.3,27.9],[12.75,29],[11.25,29]]);
  polygon(C.fold,[[21.5,26],[22.1,25.8],[21.7,27.4],[21.1,27.6]]);
  polygon(C.fold,[[14,27.7],[16.3,27.3],[17.6,27.6],[15.4,28.25],[13.7,28.5]]);
 }
 // White armhole piping, collar and curved hem; back has no front zipper or badges.
 polygon(C.whiteShade,[[11.9,24.3],[12.25,24.35],[12.7,26.1],[12.3,27.4],[12.05,27.2],[12.4,26.05]]);
 polygon(C.whiteShade,[[23.6,24.4],[23.9,24.4],[23.55,26.1],[23.9,27.5],[23.55,27.55],[23.2,26.15]]);
 if(ai===2){
  rect(C.shade,14.75,24,6,1.1);rect(C.whiteShade,14.75,24,6,.25);
  polygon(C.whiteShade,[[12.3,24.7],[15,25.2],[20.7,25.2],[23.5,24.7],[23.5,25],[20.7,25.5],[15,25.5],[12.3,25]]);
 }else{
  const z=ai===0?20.25:18;
  polygon(C.edge,[[z-2.8,24],[z+2,24],[z+2.25,24.8],[z+.5,25.3],[z-2.75,24.9]]);
  polygon(C.shade,[[z-2.5,24.15],[z+1.7,24.15],[z+1.9,24.65],[z+.4,25.05],[z-2.45,24.75]]);
  rect(C.whiteShade,z-2.6,24,4.5,.25);
  polygon(C.zip,[[z,24.3],[z+.25,24.3],[z+.5,26.8],[z+.25,28.8],[z+.0,29.1],[z-.2,28.8],[z+.2,26.8]]);
  rect(C.white,z+.1,25.4,.3,.65);
  const lx=ai===0?22.3:21.7;
  polygon(C.white,[[lx-.7,25.1],[lx-.25,25.35],[lx,25.95],[lx-.45,25.8]]);
  polygon(C.white,[[lx+.0,24.95],[lx+.3,25.45],[lx+.2,26.05],[lx-.1,25.6]]);
  polygon(C.white,[[lx+.8,25.1],[lx+.65,25.7],[lx+.15,25.95],[lx+.35,25.45]]);
  rect(C.white,lx-.35,26.1,1,.25);
  const bx=ai===0?16.6:14.45;
  // Small white patches substitute for unreadable text at this chibi body size.
  polygon(C.white,[[bx-1,25.15],[bx-.5,25.5],[bx+.6,25.3],[bx+1,26.1],[bx-.8,26.3],[bx-1.1,25.6]]);
  rect(C.shade,bx-.45,25.6,.25,.25);rect(C.shade,bx+.25,25.55,.25,.25);
  polygon(C.white,[[bx+.15,26.5],[bx+.45,27.0],[bx+1,27.1],[bx+.5,27.45],[bx+.6,28],[bx+.1,27.7],[bx-.4,28],[bx-.35,27.4],[bx-.9,27.05],[bx-.2,27.0]]);
  polygon(C.white,[[bx-.25,28.15],[bx+.2,28.35],[bx+.7,28.1],[bx+.85,28.65],[bx+.3,28.9],[bx-.3,28.65]]);
 }
 polygon(C.white,[[11.6,28.5],[15.5,28.9],[20.7,28.85],[24.4,28.4],[24.4,28.9],[20.8,29.35],[15.5,29.4],[11.6,29.0]]);
 // Trousers: short broad chibi legs, with per-view folds instead of a long fixed center line.
 rect(C.pants,11.25,29.25,13.5,3.5);
 if(ai===0){
  polygon(C.pantsDark,[[18.7,29.25],[24.75,29.25],[24.75,32.7],[18.2,32.7],[19,31]]);
  polygon(C.pantsLight,[[12.1,29.6],[15.5,29.5],[14.5,30.4],[15.1,31.35],[13.3,32.7],[11.4,32.7],[12.75,31.1]]);
  polygon(C.pantsDeep,[[18.5,29.4],[19.25,29.5],[18.8,30.6],[19.5,31.5],[18.1,32.5],[17.5,32.5],[18.5,31.3]]);
 }else{
  polygon(C.pantsDark,[[11.25,29.4],[13.7,29.4],[13.15,30.4],[14.1,31.35],[12.5,32.7],[11.25,32.7]]);
  polygon(C.pantsDark,[[21.5,29.35],[24.75,29.35],[24.75,32.75],[22.9,32.75],[23.5,31.7],[22.1,30.8]]);
  polygon(C.pantsLight,[[14.4,29.6],[16.4,29.5],[15.5,30.5],[16,31.25],[14.3,32.7],[13,32.7],[14.6,31.1]]);
  polygon(C.pantsLight,[[19.7,29.6],[21.6,29.5],[20.8,30.5],[22.25,31.2],[21.5,32.65],[19.6,32.65],[20.4,31.25]]);
 }
 const seam=ai===0?18.5:18;
 polygon(C.pantsDeep,[[seam-.25,29.45],[seam+.3,29.45],[seam+.4,30.25],[seam-.15,30.6],[seam-.35,30.35]]);
 polygon(C.edge,[[17.3,31.5],[18.6,31.5],[18.9,34],[17.1,34]]);
 function shoe(x0,x1,dark){
  polygon(C.edge,[[x0+.45,32.25],[x1-.5,32.25],[x1,32.75],[x1,33.8],[x0,33.8],[x0,32.85]]);
  polygon(dark?C.blueDark:C.blue,[[x0+.6,32.35],[x1-.6,32.35],[x1-.05,33],[x0+.2,33.1]]);
  polygon(dark?C.shoeShade:C.shoe,[[x0+.2,33],[x0+1.4,32.8],[x1-.25,33.0],[x1-.05,33.55],[x0+.1,33.55]]);
  rect(C.shoe,x0+.1,33.5,x1-x0-.2,.25);rect(C.shoeShade,x0+.3,33.75,x1-x0-.6,.25);
  rect(C.shoe,x0+1.15,32.4,1.5,.25);rect(C.shoeShade,x0+1.05,32.7,1.55,.25);
 }
 shoe(11.1,17.05,ai===2);shoe(18.95,24.9,ai!==1);
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
 const base=await load(before),p=structuredClone(before),original=p.layers.slice(),parents=new Map(original.map(l=>[l,l.parent==null?null:original[l.parent]])),additions=[],records=[];
 for(let ai=0;ai<3;ai++){
  const bodyLI=base.layers.findIndex(l=>l.sheetIndex===8&&l.name==='body'&&l.getFrameData(`8_${ai}_0`)),headLI=base.layers.findIndex(l=>l.sheetIndex===8&&l.name==='head'&&l.getFrameData(`8_${ai}_0`));assert(bodyLI>=0&&headLI===bodyLI+1);
  const layer={sheetIndex:8,isGroup:false,parent:null,depth:before.layers[bodyLI].depth,name:'服装 / 黑立领背心灰绿裤 / 套装',visible:true,locked:false,opacity:1,frameData:{}};parents.set(layer,parents.get(original[bodyLI]));
  for(let fi=0;fi<4;fi++){
   const body=layerImage(base,bodyLI,ai,fi),g=garment(body,ai,fi),key=`8_${ai}_${fi}`,dataURL='data:image/png;base64,'+png.encode(N,N,g.data).toString('base64');layer.frameData[key]={width:N,height:N,dataURL,placement:{x:0,y:0,w:36,h:36}};fs.writeFileSync(out+`/outfit-only-${ai}-${fi}.png`,png.encode(N,N,g.data));records.push({key,shoulder:g.shoulder,waist:g.waist,shoeBottom:g.shoeBottom,commands:g.commands});
  }
  additions.push({layer,beforeLayer:original[headLI],ai});
 }
 const selected=original[before.currentLayerIndex];p.layers=[];for(const old of original){for(const a of additions)if(a.beforeLayer===old)p.layers.push(a.layer);p.layers.push(old);}for(const l of p.layers)l.parent=parents.get(l)==null?null:p.layers.indexOf(parents.get(l));p.currentLayerIndex=p.layers.indexOf(selected);
 for(let i=0;i<original.length;i++){const expected=structuredClone(before.layers[i]);if(expected.parent!=null)expected.parent=p.layers.indexOf(original[expected.parent]);assert.deepEqual(original[i],expected,'已有图层除必要parent重映射外完全不变');}
 const recovery=structuredClone(p);recovery.layers=original.map((l,i)=>({...structuredClone(l),parent:before.layers[i].parent}));recovery.currentLayerIndex=before.currentLayerIndex;assert.deepEqual(recovery,before);fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
 assert.deepEqual(p.spriteSheets,before.spriteSheets);await verify(p);fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/pixel-drawing-records.json',JSON.stringify(records,null,2));fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:meta.sha256,onlyIdle12Cels:true,threeDirectionalOutfitLayers:true,sourceResolution:[N,N],logicalResolution:[36,36],scale:S,oldPixelsAndVisibilityUnchanged:true,parentsRemappedByIdentity:true,hairEyesBodyHandsUnchanged:true,allTimingsSizesAndOtherActionsUnchanged:true,shoesInSameOutfitLayers:true,frontHandsProtected:true,HDMainAndPNG12FramesMatch:true,actualStudioPreviewFunctionTested:true,restoreExtraCopyVerified:true,imageGenerationUsed:false,browserChecked:false},null,2));console.log('PASS build: 3 directional outfit layers × 4 idle cels; 4x hard pixels; actual HD render/PNG and studio preview paths checked; all original pixels preserved.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
