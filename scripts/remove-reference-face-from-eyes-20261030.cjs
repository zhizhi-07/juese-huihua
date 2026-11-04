const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','pixel-import'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/'+f+'.js'),'utf8'),{filename:f});
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/浅蓝仅眼睛去脸部-20261030'),assets=path.join(root,'五官素材/浅蓝仅眼睛去脸部-20261030'),backup=path.join(root,'备份/20261030-浅蓝仅眼睛去脸部');
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
  const raw=JSON.parse(text),candidate=structuredClone(raw),p=await decoded(raw),si=p.spriteSheets.findIndex(s=>s.name==='original32_idle'),ai=p.spriteSheets[si].actions.findIndex(a=>a.direction==='down'),li=candidate.layers.findIndex(l=>l.name==='眼睛 / 粉边浅蓝·可编辑画布'&&l.sheetIndex===si);assert(li>=0);
  const layer=candidate.layers[li],key=si+'_'+ai+'_0',source=p.layers[li].getFrameData(key);assert(source);const sprite=new ImageData(source.width,source.height);let retained=0,removed=0;
  function isEye(x,y,r,g,b){
    if(y<29||y>79||!(x>=10&&x<=60||x>=105&&x<=156))return false;
    const ink=y<=58&&Math.max(r,g,b)<=212;
    const blue=b>r+10&&b>g+8;
    const highlight=y>=44&&y<=51&&(x>=31&&x<=45||x>=113&&x<=127)&&r>=220&&g>=220&&b>=215&&r-g<=8&&r-b<=30;
    const white=y>=50&&y<=72&&(x>=18&&x<=26||x>=140&&x<=147)&&r>=220&&g>=220&&b>=215&&r-g<=7&&r-b<=7;
    return ink||blue||highlight||white;
  }
  for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
    const i=(y*source.width+x)*4;if(!source.data[i+3])continue;const r=source.data[i],g=source.data[i+1],b=source.data[i+2];
    if(isEye(x-43,y,r,g,b)){sprite.data.set(source.data.subarray(i,i+4),i);retained++;assert.deepEqual([...sprite.data.subarray(i,i+4)],[...source.data.subarray(i,i+4)]);}else removed++;
  }
  assert(retained>2000&&removed>1000);const c=createCanvas(sprite.width,sprite.height),ctx=c.getContext('2d');ctx.putImageData(sprite,0,0);const png=c.toBuffer('image/png'),dataURL=c.toDataURL('image/png');fs.writeFileSync(path.join(assets,'浅蓝眼-不含脸部.png'),png);
  const keys=Object.keys(layer.frameData);assert.equal(keys.length,4);assert(keys.every(k=>k.startsWith(si+'_'+ai+'_')));
  for(const key of keys){const d=layer.frameData[key];assert.deepEqual([d.width,d.height],[240,160]);layer.frameData[key]={...d,dataURL};}
  layer.name='眼睛 / 浅蓝·仅眼睛可编辑画布';
  const compare=structuredClone(candidate);compare.layers[li]=raw.layers[li];assert.deepEqual(compare,raw,'Nothing except selected eye layer changes.');
  for(let y=80;y<sprite.height;y++)for(let x=0;x<sprite.width;x++)assert.equal(sprite.data[(y*sprite.width+x)*4+3],0,'No lower cheek pixels');
  for(let y=0;y<29;y++)for(let x=0;x<sprite.width;x++)assert.equal(sprite.data[(y*sprite.width+x)*4+3],0,'No eyebrows or skin above eye');
  const zoom=createCanvas(900,384),zc=zoom.getContext('2d');zc.fillStyle='#feede1';zc.fillRect(0,0,900,384);zc.imageSmoothingEnabled=false;zc.drawImage(c,51,20,150,64,0,0,900,384);fs.writeFileSync(path.join(out,'仅眼睛-放大检查.png'),zoom.toBuffer('image/png'));
  await contacts(raw,'修改前-全部待机.png');await contacts(candidate,'修改后-全部待机.png');await contacts(candidate,'修改后-无头发检查.png',true);
  const preview=await decoded(candidate),cm=new PE.CanvasManager(Object.assign(createCanvas(576,576),{style:{}}),preview),beforeCM=new PE.CanvasManager(Object.assign(createCanvas(576,576),{style:{}}),p),ex=new PE.ExportManager();ex.init(preview,cm);
  for(let fi=0;fi<4;fi++){preview.selectFrame(si,ai,fi);cm.zoom=16;cm.showGrid=false;cm.centerView();cm.render();const data=cm.getCompositeImageData(si,ai,fi,true,10);assert.deepEqual(cm.offscreenCtx.getImageData(0,0,360,360).data,data.data);const blob=await ex.exportFrameAsBlob(si,ai,fi);fs.writeFileSync(path.join(out,'正面待机-'+fi+'-透明导出.png'),Buffer.from(await blob.arrayBuffer()));}
  for(let direction=0;direction<3;direction++)if(direction!==ai)for(let fi=0;fi<4;fi++)assert.deepEqual(cm.getCompositeImageData(si,direction,fi,true,10).data,beforeCM.getCompositeImageData(si,direction,fi,true,10).data);
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({id,li,keys,retainedExactSourcePixels:retained,removedFaceOrBrowPixels:removed,allOtherLayersUnchanged:true,oldBackupUnchanged:true,positionsUnchanged:true,mainRenderMatchesComposite:true,sideBack8FramesUnchanged:true,pngSHA256:digest(png)},null,2));console.log('PREPARED: '+retained+' exact eye pixels retained; '+removed+' skin/brow pixels removed; four front idle cels only, backup and other layers unchanged.');
}
async function commit(){
  const rev=JSON.parse(fs.readFileSync(path.join(backup,'revision.json'))),url='http://127.0.0.1:8765/api/project?id='+rev.id,check=await fetch(url);assert(check.ok);assert.equal(check.headers.get('etag'),rev.etag,'Project changed; do not overwrite');
  const bytes=fs.readFileSync(path.join(out,'candidate.json')),r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':rev.etag},body:bytes});const reply=await r.text();fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:r.status,etag:r.headers.get('etag'),body:reply},null,2));assert.equal(r.status,200,reply);
  const back=await fetch(url);assert(back.ok);const actual=await back.text();assert.deepEqual(JSON.parse(actual),JSON.parse(bytes));fs.writeFileSync(path.join(out,'api-readback.json'),actual);console.log('SAVED and exact API readback verified: '+rev.id);
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
