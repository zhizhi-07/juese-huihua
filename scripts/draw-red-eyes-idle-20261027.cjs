const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/深红眼睛侧面修正-20261027'),url='http://127.0.0.1:8765/api/project?id=character-green-flower-idle-20261027';
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const n of ['core','history','canvas','tools','spritesheet','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const colors={K:[29,22,25,255],R:[173,35,57,255],D:[116,24,43,255],r:[237,95,111,255],P:[246,158,173,255],W:[255,250,247,255]};
(async()=>{
 const r=await fetch(url);assert(r.ok);const text=await r.text(),etag=r.headers.get('etag'),source=JSON.parse(text),p=JSON.parse(text);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'before.json'),text);fs.writeFileSync(path.join(out,'etag.txt'),etag);
 const layer=p.layers.find(l=>l.sheetIndex===8&&l.name==='眼睛 / 01 深红·粉色下缘');assert(layer);
 const mask=['.KKKK','KKKWK','WRDRW','.rrr.','.PPP.'];
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  if(ai!==0)continue;
  const key=`8_${ai}_${fi}`,data=new Uint8Array(4096),head=p.layers.find(l=>l.sheetIndex===8&&l.name==='head'&&l.frameData[key]),hd=png.decode(Buffer.from(head.frameData[key].dataURL.split(',')[1],'base64'));
  let top=32;for(let y=0;y<24;y++)for(let x=0;x<32;x++)if(hd.data[(y*32+x)*4+3])top=Math.min(top,y);
  const eyes=[{x:12,rows:mask},{x:22,rows:mask.map(row=>[...row].reverse().join(''))}];
  for(const eye of eyes)for(let y=0;y<eye.rows.length;y++)for(let x=0;x<eye.rows[y].length;x++){const c=eye.rows[y][x];if(colors[c]){const xx=eye.x+x,yy=top+12+y;assert(hd.data[(yy*32+xx)*4+3],'Eye extends outside head');data.set(colors[c],(yy*32+xx)*4);}}
  assert.equal(data.some(v=>v),ai!==2);layer.frameData[key]={width:32,height:32,dataURL:'data:image/png;base64,'+png.encode(32,32,data).toString('base64')};
 }
 const oldLayer=source.layers.find(l=>l.name===layer.name&&l.sheetIndex===8);
 const accepted=JSON.parse(fs.readFileSync(path.join(root,'自检记录/深红眼睛待机-20261027/candidate.json'),'utf8')).layers.find(l=>l.name===layer.name&&l.sheetIndex===8);
 for(let fi=0;fi<4;fi++){const src=png.decode(Buffer.from(accepted.frameData[`8_0_${fi}`].dataURL.split(',')[1],'base64')),actual=png.decode(Buffer.from(layer.frameData[`8_0_${fi}`].dataURL.split(',')[1],'base64')),expected=new Uint8Array(4096);for(let y=0;y<31;y++)for(let x=0;x<32;x++){const at=(y*32+x)*4;if(src.data[at+3]){const xx=x>=20?x-1:x;expected.set(src.data.slice(at,at+4),((y+1)*32+xx)*4);}}assert.deepEqual(actual.data,expected,'Only eye position may change');}
 for(let i=0;i<source.layers.length;i++)if(p.layers[i]!==layer)assert.deepEqual(p.layers[i],source.layers[i]);
 for(const key of Object.keys(layer.frameData))if(!key.startsWith('8_0_'))assert.deepEqual(layer.frameData[key],oldLayer.frameData[key]);assert.deepEqual(p.spriteSheets,source.spriteSheets);
 const ex=new PE.ExportManager(),{project}=await ex.importProject(new File([JSON.stringify(p)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project);ex.project=project;ex.canvasManager=cm;
 const sheet=createCanvas(512,384),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
 project.layers.find(l=>l.sheetIndex===8&&l.name.startsWith('头发 / 04 ')&&l.name.endsWith('前发')).visible=true;
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  project.currentSheetIndex=8;project.currentActionIndex=ai;project.currentFrameIndex=fi;const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some(v=>v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);
  const blob=await ex.exportFrameAsBlob(8,ai,fi);assert.deepEqual(Array.from(png.decode(Buffer.from(await blob.arrayBuffer())).data),Array.from(im.data));const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);ctx.fillStyle=ai===1?'#ddd5ed':'#45434b';ctx.fillRect(fi*128,ai*128,128,128);ctx.drawImage(tile,fi*128,ai*128,128,128);
 }
 fs.writeFileSync(path.join(out,'preview.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));
 const comparison=createCanvas(576,192),cc=comparison.getContext('2d');cc.imageSmoothingEnabled=false;
 const historical=JSON.parse(fs.readFileSync(path.join(root,'自检记录/浅绿花饰待机-20261027/source.json'),'utf8')),oldEyes=historical.layers.find(l=>l.sheetIndex===8&&l.name==='眼睛 / 02 青蓝·粉下缘');
 for(let v=0;v<3;v++){const sample=JSON.parse(JSON.stringify(p));sample.layers.find(l=>l.name===layer.name).frameData=v===0?oldEyes.frameData:v===1?oldLayer.frameData:layer.frameData;sample.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('前发')).visible=true;const loaded=await new PE.ExportManager().importProject(new File([JSON.stringify(sample)],'sample.json')),manager=new PE.CanvasManager(document.createElement('canvas'),loaded.project),tile=createCanvas(32,32);tile.getContext('2d').putImageData(manager.getCompositeImageData(8,0,0),0,0);cc.fillStyle='#ddd5ed';cc.fillRect(v*192,0,192,192);cc.drawImage(tile,v*192,0,192,192);}
 fs.writeFileSync(path.join(out,'old-before-after.png'),comparison.toBuffer('image/png'));
 if(process.argv.includes('--publish')){const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,'Save failed '+saved.status);assert.deepEqual(await(await fetch(url)).json(),p);}
 console.log('PASS: 4 side eye frames corrected; front/rear, other layers and visibility unchanged; historical/before/after comparison rendered.'+(process.argv.includes('--publish')?' Saved and read back.':''));
})().catch(e=>{console.error(e);process.exitCode=1;});
