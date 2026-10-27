const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/用户正面第二帧同步-20261027'),url='http://127.0.0.1:8765/api/project?id=character-green-flower-idle-20261027';
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
(async()=>{
 const r=await fetch(url);assert(r.ok);const text=await r.text(),etag=r.headers.get('etag'),before=JSON.parse(text),p=JSON.parse(text),baseline=JSON.parse(fs.readFileSync(path.join(root,'自检记录/待机发梢延迟弯动-20261027/candidate.json'),'utf8'));
 fs.writeFileSync(path.join(out,'user-saved.json'),text);fs.writeFileSync(path.join(out,'user-saved-etag.txt'),etag);
 const li=p.layers.findIndex(l=>l.sheetIndex===8&&l.name==='头发 / 04 长披发 / 后发');assert(li>=0);
 const l=p.layers[li],old=baseline.layers.find(l=>l.name===p.layers[li].name&&l.sheetIndex===8),anchor=decode(l.frameData['8_1_1']),oldAnchor=decode(old.frameData['8_1_1']);
 const edits=[];for(let i=0;i<4096;i+=4)if(!Buffer.from(anchor.data.slice(i,i+4)).equals(Buffer.from(oldAnchor.data.slice(i,i+4))))edits.push({x:i/4%32,y:Math.floor(i/128),before:Array.from(oldAnchor.data.slice(i,i+4)),after:Array.from(anchor.data.slice(i,i+4))});
 assert.equal(edits.length,18,'Anchor changed since inspected; inspect before applying');
 for(const fi of [0,2,3]){
  const key=`8_1_${fi}`,im=decode(l.frameData[key]);
  for(const e of edits){
   assert(e.y>=23);const x=e.x+(fi===2?0:e.x<=10?1:e.x>=23?-1:0),y=e.y+(fi>=2?1:0),at=(y*32+x)*4;
   assert(x>=0&&x<32&&y<32);assert.deepEqual(Array.from(im.data.slice(at,at+4)),e.before,'Destination changed; do not overwrite another edit');im.data.set(e.after,at);
  }
  l.frameData[key].dataURL='data:image/png;base64,'+png.encode(32,32,im.data).toString('base64');
 }
 assert.deepEqual(l.frameData['8_1_1'],before.layers[li].frameData['8_1_1']);
 for(let i=0;i<p.layers.length;i++)if(i!==li)assert.deepEqual(p.layers[i],before.layers[i]);
 for(const key of Object.keys(l.frameData))if(!['8_1_0','8_1_2','8_1_3'].includes(key))assert.deepEqual(l.frameData[key],before.layers[li].frameData[key]);assert.deepEqual(p.spriteSheets,before.spriteSheets);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement(){const c=createCanvas(1,1);c.style={};return c;},body:{appendChild(){}}};global.File=class extends Blob{constructor(b,n){super(b);this.name=n;}};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
 for(const n of ['core','history','canvas','tools','spritesheet','export'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const ex=new PE.ExportManager(),{project}=await ex.importProject(new File([JSON.stringify(p)],'candidate.json')),cm=new PE.CanvasManager(document.createElement('canvas'),project);ex.project=project;ex.canvasManager=cm;
 const sheet=createCanvas(512,256),cx=sheet.getContext('2d');cx.imageSmoothingEnabled=false;
 for(let row=0;row<2;row++){
  if(row===1)project.layers.find(l=>l.sheetIndex===8&&l.name.endsWith('前发')).visible=true;
  for(let fi=0;fi<4;fi++){
   project.currentSheetIndex=8;project.currentActionIndex=1;project.currentFrameIndex=fi;const im=cm.getCompositeImageData(8,1,fi);assert(im.data.some(v=>v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);
   const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);cx.fillStyle='#ddd5ed';cx.fillRect(fi*128,row*128,128,128);cx.drawImage(tile,fi*128,row*128,128,128);
  }
 }
 fs.writeFileSync(path.join(out,'preview.png'),sheet.toBuffer('image/png'));fs.writeFileSync(path.join(out,'edits.json'),JSON.stringify(edits,null,2));fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(p));
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});assert(saved.ok,'Save failed '+saved.status);assert.deepEqual(await(await fetch(url)).json(),p);
 console.log('PASS: 18 user edits mapped to front frames 1,3,4; user frame2, layer visibility, body and other directions unchanged. Saved and read back.');
})().catch(e=>{console.error(e);process.exitCode=1;});
