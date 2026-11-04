const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/duck-per-frame-sync-path.txt'),'utf8')),meta=JSON.parse(fs.readFileSync(out+'/source.json')),before=JSON.parse(fs.readFileSync(out+'/original.json')),S=4,N=144;
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
(async()=>{await verify(before);console.log('PASS current project rendered')})().catch(e=>{console.error(e);process.exitCode=1});