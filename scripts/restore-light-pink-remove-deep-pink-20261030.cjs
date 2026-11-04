const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','pixel-import'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/'+f+'.js'),'utf8'),{filename:f});
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/浅蓝保留浅粉仅去深粉-20261030'),assets=path.join(root,'五官素材/浅蓝保留浅粉仅去深粉-20261030'),backup=path.join(root,'备份/20261030-浅蓝保留浅粉仅去深粉');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function mainBounds(d){
  const seen=new Set();let biggest=[];
  for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){
    const n=y*d.width+x;if(seen.has(n)||!d.data[n*4+3])continue;const points=[],queue=[n];seen.add(n);
    for(let i=0;i<queue.length;i++){const k=queue[i];points.push([k%d.width,Math.floor(k/d.width)]);for(const next of [k-1,k+1,k-d.width,k+d.width]){const nx=next%d.width,ny=Math.floor(next/d.width);if(next<0||nx<0||ny>=d.height||Math.abs(nx-k%d.width)+Math.abs(ny-Math.floor(k/d.width))!==1||seen.has(next)||!d.data[next*4+3])continue;seen.add(next);queue.push(next);}}
    if(points.length>biggest.length)biggest=points;
  }
  assert(biggest.length>100,'must locate the real head, not stray pixels');return {left:Math.min(...biggest.map(p=>p[0])),right:Math.max(...biggest.map(p=>p[0])),top:Math.min(...biggest.map(p=>p[1]))};
}
async function decoded(raw){return (await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;}
async function contacts(raw,file,hideHair=false){
  const p=await decoded(raw),si=p.spriteSheets.findIndex(s=>s.name==='original32_idle'),cm=new PE.CanvasManager(Object.assign(createCanvas(360,360),{style:{}}),p);
  if(hideHair)for(const l of p.layers)if(l.name.startsWith('头发 /')||l.name.startsWith('发饰 /'))l.visible=false;
  const c=createCanvas(4*316,3*334),ctx=c.getContext('2d');ctx.fillStyle='#e9e0d7';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const image=cm.getCompositeImageData(si,ai,fi,false,8);assert(image.data.some((v,i)=>i%4===3&&v));const tile=createCanvas(image.width,image.height);tile.getContext('2d').putImageData(image,0,0);ctx.fillStyle='#253e39';ctx.font='16px sans-serif';ctx.fillText(p.spriteSheets[si].actions[ai].direction+' #'+(fi+1),fi*316+12,ai*334+25);ctx.drawImage(tile,fi*316+14,ai*334+38);}
  fs.writeFileSync(path.join(out,file),c.toBuffer('image/png'));return p;
}




async function prepare(){
  for(const dir of [out,assets,backup])fs.mkdirSync(dir,{recursive:true});
  const id='character-gold-mix-1793320553623',response=await fetch('http://127.0.0.1:8765/api/project?id='+id);assert(response.ok);const text=await response.text();
  if(fs.existsSync(path.join(backup,'before.json')))assert.equal(fs.readFileSync(path.join(backup,'before.json'),'utf8'),text,'Project changed; retain candidate.');
  else{fs.writeFileSync(path.join(backup,'before.json'),text);fs.writeFileSync(path.join(backup,'revision.json'),JSON.stringify({id,etag:response.headers.get('etag'),sha256:digest(text)},null,2));}
  const raw=JSON.parse(text),candidate=structuredClone(raw),p=await decoded(raw),si=p.spriteSheets.findIndex(s=>s.name==='original32_idle'),ai=p.spriteSheets[si].actions.findIndex(a=>a.direction==='down'),li=candidate.layers.findIndex(l=>l.name==='眼睛 / 浅蓝·仅眼睛可编辑画布'&&l.sheetIndex===si);assert(li>=0);
  const originalRaw=JSON.parse(fs.readFileSync(path.join(root,'备份/20261030-浅蓝仅眼睛去脸部/before.json'))),original=await decoded(originalRaw),sourceLayer=original.layers.find(l=>l.name==='眼睛 / 粉边浅蓝·可编辑画布'&&l.sheetIndex===si);assert(sourceLayer);
  const source=sourceLayer.getFrameData(si+'_'+ai+'_0'),sprite=PE.utils.cloneImageData(source);delete sprite.placement;let removed=0,kept=0,restored=0;
  const current=p.layers[li].getFrameData(si+'_'+ai+'_0');assert.equal(current.width,source.width);
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
    const i=(y*source.width+x)*4;if(!source.data[i+3])continue;const sx=x-43,r=source.data[i],g=source.data[i+1],b=source.data[i+2];
    const zones=[[8,59,12,85],[18,72,31,79],[11,78,17,85],[18,85,31,90],[154,59,158,85],[135,72,148,79],[149,78,155,85],[135,85,148,90]];
    const markedZone=zones.some(([x1,y1,x2,y2])=>sx>=x1&&sx<=x2&&y>=y1&&y<=y2);
    const deepFacePink=markedZone&&r>b+8&&r>g+20;
    if(deepFacePink){sprite.data.fill(0,i,i+4);removed++;}else{kept++;assert.deepEqual([...sprite.data.subarray(i,i+4)],[...source.data.subarray(i,i+4)]);if(!current.data[i+3])restored++;}
  }
  assert(removed>200&&removed<1800);assert(restored>1000,'Light pink trim must actually be restored');
  // The iris, highlight, white and upper lash region are exact, including the original pale pink edges.
  for(let y=0;y<59;y++)for(let x=0;x<source.width;x++){const i=(y*source.width+x)*4;assert.deepEqual([...sprite.data.subarray(i,i+4)],[...source.data.subarray(i,i+4)]);}
  const c=createCanvas(sprite.width,sprite.height),ctx=c.getContext('2d');ctx.putImageData(sprite,0,0);const png=c.toBuffer('image/png'),dataURL=c.toDataURL('image/png');fs.writeFileSync(path.join(assets,'浅蓝眼-保留浅粉眼缘.png'),png);
  const layer=candidate.layers[li],keys=Object.keys(layer.frameData);assert.equal(keys.length,4);assert(keys.every(k=>k.startsWith(si+'_'+ai+'_')));for(const key of keys)layer.frameData[key]={...layer.frameData[key],dataURL};
  const compare=structuredClone(candidate);compare.layers[li]=raw.layers[li];assert.deepEqual(compare,raw,'No changes outside the four eye cels');
  const zoom=createCanvas(900,528),zc=zoom.getContext('2d');zc.fillStyle='#feede1';zc.fillRect(0,0,900,528);zc.imageSmoothingEnabled=false;zc.drawImage(c,51,0,150,88,0,0,900,528);fs.writeFileSync(path.join(out,'浅粉保留-深粉去除.png'),zoom.toBuffer('image/png'));
  await contacts(raw,'修改前-全部待机.png');await contacts(candidate,'修改后-全部待机.png');await contacts(candidate,'修改后-无头发检查.png',true);
  const preview=await decoded(candidate),cm=new PE.CanvasManager(Object.assign(createCanvas(576,576),{style:{}}),preview),bcm=new PE.CanvasManager(Object.assign(createCanvas(576,576),{style:{}}),p),ex=new PE.ExportManager();ex.init(preview,cm);
  for(let fi=0;fi<4;fi++){preview.selectFrame(si,ai,fi);cm.zoom=16;cm.showGrid=false;cm.centerView();cm.render();const data=cm.getCompositeImageData(si,ai,fi,true,10);assert.deepEqual(cm.offscreenCtx.getImageData(0,0,360,360).data,data.data);const blob=await ex.exportFrameAsBlob(si,ai,fi);fs.writeFileSync(path.join(out,'正面待机-'+fi+'-透明导出.png'),Buffer.from(await blob.arrayBuffer()));}
  for(let direction=0;direction<3;direction++)if(direction!==ai)for(let fi=0;fi<4;fi++)assert.deepEqual(cm.getCompositeImageData(si,direction,fi,true,10).data,bcm.getCompositeImageData(si,direction,fi,true,10).data);
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({id,li,keys,removedMarkedDeepPinkPixels:removed,retainedExactSourcePixels:kept,restoredLightPinkAndBrowPixels:restored,allOtherLayersUnchanged:true,backupUnchanged:true,sourceDimensionsAndPlacementUnchanged:true,pngSHA256:digest(png)},null,2));console.log('PREPARED: '+removed+' marked deep pink pixels removed; '+restored+' light pink/brow pixels restored, all remaining RGBA exact reference.');
}
async function commit(){
  const rev=JSON.parse(fs.readFileSync(path.join(backup,'revision.json'))),url='http://127.0.0.1:8765/api/project?id='+rev.id,check=await fetch(url);assert(check.ok);assert.equal(check.headers.get('etag'),rev.etag,'Project changed; do not overwrite');
  const bytes=fs.readFileSync(path.join(out,'candidate.json')),r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':rev.etag},body:bytes});const reply=await r.text();fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:r.status,etag:r.headers.get('etag'),body:reply},null,2));assert.equal(r.status,200,reply);
  const back=await fetch(url);assert(back.ok);const actual=await back.text();assert.deepEqual(JSON.parse(actual),JSON.parse(bytes));fs.writeFileSync(path.join(out,'api-readback.json'),actual);console.log('SAVED and exact API readback verified: '+rev.id);
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
