const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/四瓣白花发夹与遮挡修正-20261027'),url='http://127.0.0.1:8765/api/project?id=character-green-flower-idle-20261027';
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const colors={W:[247,245,241,255],s:[205,204,221,255],C:[161,207,219,255],b:[123,165,185,255]};
(async()=>{
 const r=await fetch(url);assert(r.ok);const text=await r.text(),etag=r.headers.get('etag'),source=JSON.parse(text),p=JSON.parse(text);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),text);fs.writeFileSync(path.join(out,'etag.txt'),etag);
 const layerIndex=p.layers.findIndex(l=>l.sheetIndex===8&&l.name==='发饰 / 01 白花浅蓝花芯发夹');assert(layerIndex>=0);const layer=p.layers[layerIndex];layer.frameData={};
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  const key=`8_${ai}_${fi}`,head=p.layers.find(l=>l.sheetIndex===8&&l.name==='head'&&l.frameData[key]),im=png.decode(Buffer.from(head.frameData[key].dataURL.split(',')[1],'base64'));
  let top=32;for(let y=0;y<24;y++)for(let x=0;x<32;x++)if(im.data[(y*32+x)*4+3])top=Math.min(top,y);
  const data=new Uint8Array(4096),dy=top-2;
  const flower=(cx,cy,slim)=>{const rows=slim?['W.W','WCW','.Cb','WCW','s.W']:['.W.W.','WWCWW','.CbC.','WWCWW','.s.s.'];for(let y=0;y<5;y++)for(let x=0;x<rows[y].length;x++){const c=colors[rows[y][x]];if(c){const xx=cx+x-(slim?1:2),yy=cy+y-2+dy;assert(xx>=0&&xx<32&&yy>=0&&yy<32);data.set(c,(yy*32+xx)*4);}}};
  if(ai===1){flower(6,10,false);flower(27,10,false);}else if(ai===0){flower(6,10,true);}
  assert.equal(data.some(v=>v),ai!==2);layer.frameData[key]={width:32,height:32,dataURL:'data:image/png;base64,'+png.encode(32,32,data).toString('base64')};
 }
 for(let i=0;i<p.layers.length;i++)if(i!==layerIndex)assert.deepEqual(p.layers[i],source.layers[i]);assert.deepEqual(p.spriteSheets,source.spriteSheets);
 const ex=new PE.ExportManager(),{project}=await ex.importProject(new File([JSON.stringify(p)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project);ex.project=project;ex.canvasManager=cm;
 const sheet=createCanvas(512,384),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
 // Preview the finished hair without changing the user's saved layer visibility.
 project.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('前发')).visible=true;
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  project.currentSheetIndex=8;project.currentActionIndex=ai;project.currentFrameIndex=fi;const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some(v=>v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);
  const blob=await ex.exportFrameAsBlob(8,ai,fi);assert.deepEqual(Array.from(png.decode(Buffer.from(await blob.arrayBuffer())).data),Array.from(im.data));const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ctx.fillStyle=ai===1?'#ddd5ed':'#45434b';ctx.fillRect(fi*128,ai*128,128,128);ctx.drawImage(tile,fi*128,ai*128,128,128);
 }
 fs.writeFileSync(path.join(out,'preview.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));
 if(process.argv.includes('--publish')){const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,'Save failed '+saved.status);assert.deepEqual(await(await fetch(url)).json(),p);}
 console.log('PASS: solid white petals; side shows near clip only; rear accessory frames transparent; other layers unchanged; canvas and PNG agree.'+(process.argv.includes('--publish')?' Saved and read back.':''));
})().catch(e=>{console.error(e);process.exitCode=1;});
