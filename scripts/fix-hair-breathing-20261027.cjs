const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs'),draw=require('./new-long-fringe-20261027.cjs');
const out=path.resolve(__dirname,'../自检记录/待机发梢延迟弯动-20261027'),url='http://127.0.0.1:8765/api/project?id=character-green-flower-idle-20261027';
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};
global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.resolve(__dirname,'../js',n+'.js'),'utf8'));
function bounds(im){const ys=[];for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(im.data[(y*32+x)*4+3])ys.push(y);return {top:Math.min(...ys),bottom:Math.max(...ys)};}
(async()=>{
 const r=await fetch(url);assert(r.ok);const text=await r.text(),etag=r.headers.get('etag'),before=JSON.parse(text),p=JSON.parse(text);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),text);fs.writeFileSync(path.join(out,'etag.txt'),etag);
 const metrics=[];
 for(const l of p.layers)if(l.sheetIndex===8&&l.name.startsWith('头发 / 04 ')){
  const rear=l.name.endsWith('后发');for(const [key,f]of Object.entries(l.frameData)){const im=draw(p,key,rear);f.dataURL='data:image/png;base64,'+png.encode(32,32,im.data).toString('base64');}
  for(let ai=0;ai<3;ai++){if(!rear&&ai===2)continue;const ims=Array.from({length:4},(_,fi)=>png.decode(Buffer.from(l.frameData[`8_${ai}_${fi}`].dataURL.split(',')[1],'base64'))),b=ims.map(bounds);assert.equal(b[2].top-b[0].top,2);assert.equal(b[2].bottom-b[0].bottom,1);assert.deepEqual(ims[0].data.slice(0,19*128),ims[1].data.slice(0,19*128));assert.notDeepEqual(ims[0].data,ims[1].data);assert.deepEqual(ims[2].data.slice(0,20*128),ims[3].data.slice(0,20*128));assert.notDeepEqual(ims[2].data,ims[3].data);metrics.push({layer:l.name,direction:ai,bounds:b});}
 }
 for(let i=0;i<p.layers.length;i++)if(!(p.layers[i].sheetIndex===8&&p.layers[i].name.startsWith('头发 / 04 ')))assert.deepEqual(p.layers[i],before.layers[i]);assert.deepEqual(p.spriteSheets,before.spriteSheets);
 const ex=new PE.ExportManager(),{project}=await ex.importProject(new File([JSON.stringify(p)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project);ex.project=project;ex.canvasManager=cm;
 const sheet=createCanvas(512,384),cx=sheet.getContext('2d');cx.imageSmoothingEnabled=false;
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  project.currentSheetIndex=8;project.currentActionIndex=ai;project.currentFrameIndex=fi;const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some(v=>v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);
  const blob=await ex.exportFrameAsBlob(8,ai,fi);assert.deepEqual(Array.from(png.decode(Buffer.from(await blob.arrayBuffer())).data),Array.from(im.data));
  const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);cx.fillStyle=ai===1?'#ddd5ed':'#45434b';cx.fillRect(fi*128,ai*128,128,128);cx.drawImage(tile,fi*128,ai*128,128,128);
  fs.writeFileSync(path.join(out,`idle-${ai}-${fi}.png`),tile.toBuffer('image/png'));
 }
 fs.writeFileSync(path.join(out,'preview.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(metrics,null,2));fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));
 if(process.argv.includes('--publish')){const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,'Save failed '+saved.status);assert.deepEqual(await(await fetch(url)).json(),p);}
 console.log('PASS: upper hair anchored; lower locks bend 1px with a delayed four-frame cycle; body unchanged.'+(process.argv.includes('--publish')?' Saved and verified.':''));
})().catch(e=>{console.error(e);process.exitCode=1;});
