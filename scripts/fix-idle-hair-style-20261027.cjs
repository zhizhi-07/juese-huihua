const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const png=require('./png.cjs'),root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/新分束长发重绘-20261027'),id='character-green-flower-idle-20261027',url='http://127.0.0.1:8765/api/project?id='+id;
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};
global.File=class extends Blob{constructor(p,n){super(p);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
(async()=>{
 const response=await fetch(url);assert(response.ok);const etag=response.headers.get('etag'),text=await response.text(),source=JSON.parse(text),candidate=JSON.parse(text);
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),text);fs.writeFileSync(path.join(out,'etag.txt'),etag);
 if(process.argv.includes('--references')){
  const ex=new PE.ExportManager(),{project:p}=await ex.importProject(new File([text],'source.json')),cm=new PE.CanvasManager(document.createElement('canvas'),p),sheet=createCanvas(768,512),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
  const pairs=[['头发 / 02 齐刘海 / 前发','头发 / 02 双马尾 / 后发'],['头发 / 03 双凹槽齐刘海 / 前发','头发 / 02 双马尾 / 后发'],['头发 / 02 齐刘海 / 前发','头发 / 01 披发 / 后发']];
  for(let c=0;c<3;c++)for(let ai=0;ai<2;ai++){for(const l of p.layers)if(l.sheetIndex===8&&/^(头发|发饰) \//.test(l.name))l.visible=pairs[c].includes(l.name);const tile=createCanvas(32,32);tile.getContext('2d').putImageData(cm.getCompositeImageData(8,ai,0),0,0);ctx.drawImage(tile,c*256,ai*256,256,256);}
  fs.writeFileSync(path.join(out,'previous-styles.png'),sheet.toBuffer('image/png'));return;
 }
 let changed=0;
 for(const l of candidate.layers){
  if(l.sheetIndex!==8)continue;
  if(l.name.startsWith('发饰 /')){l.visible=false;continue;}
  if(!l.name.startsWith('头发 / 04 '))continue;
  for(const [key,f]of Object.entries(l.frameData)){
   const isRear=l.name.endsWith('后发');
   const im=require('./new-long-fringe-20261027.cjs')(source,key,isRear),w=im.width,h=im.height;
   f.dataURL='data:image/png;base64,'+png.encode(w,h,im.data).toString('base64');changed++;
  }
 }
 assert.equal(changed,24);
 candidate.name='灰色长披发·待机分支';
 for(let i=0;i<source.layers.length;i++)if(!(source.layers[i].sheetIndex===8&&/^(头发 \/ 04 |发饰 \/)/.test(source.layers[i].name)))assert.deepEqual(candidate.layers[i],source.layers[i]);
 assert.deepEqual(candidate.spriteSheets,source.spriteSheets);
 const exporter=new PE.ExportManager(),{project}=await exporter.importProject(new File([JSON.stringify(candidate)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project);
 exporter.project=project;exporter.canvasManager=cm;
 const sheet=createCanvas(512,384),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  project.currentSheetIndex=8;project.currentActionIndex=ai;project.currentFrameIndex=fi;
  const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some(v=>v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);
  const blob=await exporter.exportFrameAsBlob(8,ai,fi);assert.deepEqual(Array.from(png.decode(Buffer.from(await blob.arrayBuffer())).data),Array.from(im.data));
  const player=Object.create(PE.AnimationPlayer.prototype);Object.assign(player,{canvas:createCanvas(32,32),project,canvasManager:cm,sheetIndex:8,actionIndex:ai,currentFrame:fi,previewScale:1});player.ctx=player.canvas.getContext('2d');player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,32,32).data,im.data);
  const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ctx.fillStyle=ai===1?'#eceee4':'#45434b';ctx.fillRect(fi*128,ai*128,128,128);ctx.drawImage(tile,fi*128,ai*128,128,128);
 }
 const variants=createCanvas(640,160),vc=variants.getContext('2d');vc.imageSmoothingEnabled=false;
 const front=project.layers.find(l=>l.sheetIndex===8&&l.name.startsWith('头发 / 04 ')&&l.name.endsWith('前发')),rear=project.layers.find(l=>l.sheetIndex===8&&l.name.startsWith('头发 / 04 ')&&l.name.endsWith('后发')),oldRear=project.layers.find(l=>l.sheetIndex===8&&l.name==='头发 / 01 披发 / 后发');
 for(let v=0;v<5;v++){
  rear.visible=v!==2&&v!==3;oldRear.visible=v===3;
  for(const l of project.layers)if(l.sheetIndex===8&&l.name.startsWith('服装 /'))l.visible=v===1;
  const im=cm.getCompositeImageData(8,1,0);assert(im.data.some(v=>v));const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);
  vc.fillStyle=v===4?'#45434b':'#eceee4';vc.fillRect(v*128,0,128,160);vc.drawImage(tile,v*128,0,128,128);vc.drawImage(tile,v*128+48,128);
 }
 fs.writeFileSync(path.join(out,'variants.png'),variants.toBuffer('image/png'));
 fs.writeFileSync(path.join(out,'preview.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));
 if(process.argv.includes('--publish')){const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(candidate)});assert(saved.ok,'Save failed '+saved.status);assert.deepEqual(await(await fetch(url)).json(),candidate);}
 const oldFront=source.layers.find(l=>l.sheetIndex===8&&l.name==='头发 / 02 齐刘海 / 前发'),newFront=candidate.layers.find(l=>l.sheetIndex===8&&l.name.startsWith('头发 / 04 ')&&l.name.endsWith('前发'));
 for(const key of Object.keys(newFront.frameData).filter(k=>!k.startsWith('8_2_')))assert.notDeepEqual(png.decode(Buffer.from(newFront.frameData[key].dataURL.split(',')[1],'base64')).data,png.decode(Buffer.from(oldFront.frameData[key].dataURL.split(',')[1],'base64')).data);
 console.log('PASS: newly drawn front and rear hair, existing palette only; other layers unchanged; render paths agree.'+(process.argv.includes('--publish')?' Saved and read back.':''));
})().catch(e=>{console.error(e);process.exitCode=1;});
