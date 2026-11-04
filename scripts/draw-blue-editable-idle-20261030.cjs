const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','pixel-import'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/'+f+'.js'),'utf8'),{filename:f});
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/蓝瞳可编辑画布-20261030'),assets=path.join(root,'五官素材/蓝瞳可编辑画布-20261030'),backup=path.join(root,'备份/20261030-蓝瞳可编辑待机');
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
  if(fs.existsSync(path.join(backup,'before.json')))assert.equal(fs.readFileSync(path.join(backup,'before.json'),'utf8'),text,'Saved project changed; retain old candidate and backup.');
  else{fs.writeFileSync(path.join(backup,'before.json'),text);fs.writeFileSync(path.join(backup,'revision.json'),JSON.stringify({id,etag:response.headers.get('etag'),sha256:digest(text)},null,2));}
  const raw=JSON.parse(text),p=await decoded(raw),si=p.spriteSheets.findIndex(s=>s.name==='original32_idle'),ai=p.spriteSheets[si].actions.findIndex(a=>a.direction==='down');assert.equal(ai,1);
  // Draw an editable source canvas from explicit pixel rectangles, not a screenshot import.
  const sourceCanvas=createCanvas(234,98),ctx=sourceCanvas.getContext('2d'),commands=[];
  function rect(color,x,y,w,h){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);commands.push({color,x,y,w,h});}
  const B='#b78779',P='#4e103e',K='#070208',W='#f7ffff',D='#29208d',C='#64e6fa',M='#3067d9',L='#1784d6';
  rect(B,76,12,18,9);rect(B,94,21,9,9);rect(B,159,12,19,9);rect(B,150,21,9,9);
  rect(P,57,30,9,10);rect(P,39,49,9,19);rect(P,48,68,9,9);rect(P,94,40,10,18);
  rect(K,66,31,28,9);rect(K,48,40,46,9);rect(K,48,49,9,19);
  rect(W,57,49,37,28);rect(D,66,49,19,9);rect(C,66,58,9,9);rect(M,75,58,10,19);rect(L,66,67,9,10);
  rect(P,149,40,10,18);rect(P,187,30,10,10);rect(P,206,49,9,19);rect(P,197,68,9,9);
  rect(K,159,31,28,9);rect(K,159,40,47,9);rect(K,197,49,9,19);
  rect(W,159,49,38,28);rect(D,168,49,19,9);rect(C,168,58,9,9);rect(M,177,58,10,19);rect(L,168,67,9,10);
  const sprite=ctx.getImageData(0,0,234,98);assert(sprite.data.some((v,i)=>i%4===3&&v));assert(sprite.data.every((v,i)=>i%4!==3||v===0||v===255));
  const png=sourceCanvas.toBuffer('image/png');fs.writeFileSync(path.join(assets,'蓝瞳-可编辑源画布.png'),png);fs.writeFileSync(path.join(assets,'像素绘制.json'),JSON.stringify({width:234,height:98,commands},null,2));
  const dataURL='data:image/png;base64,'+png.toString('base64'),candidate=structuredClone(raw),front=candidate.layers.findIndex(l=>l.sheetIndex===si&&l.name.startsWith('头发 /')&&l.name.endsWith('前发'));assert(front>0);
  const downGroup=candidate.layers.findIndex(l=>l.sheetIndex===si&&l.isGroup&&l.name==='down');assert(downGroup>=0&&downGroup<front);
  const layer={name:'眼睛 / 蓝瞳·可编辑高清画布',sheetIndex:si,parent:downGroup,depth:1,visible:true,locked:false,opacity:1,frameData:{}},positions=[];
  for(let fi=0;fi<4;fi++){
    const key=si+'_'+ai+'_'+fi,head=p.layers.find(l=>l.name==='head'&&l.sheetIndex===si&&l.getFrameData(key));assert(head);const b=mainBounds(head.getFrameData(key)),placement={x:8,y:b.top+9,w:18,h:8};PE.utils.validateImagePlacement(placement,p.spriteSheets[si].actions[ai].frames[fi]);
    layer.frameData[key]={width:sprite.width,height:sprite.height,dataURL,placement};positions.push({key,head:b,placement});
  }
  for(const l of candidate.layers)if(l.parent!=null&&l.parent>=front)l.parent++;
  candidate.layers.splice(front,0,layer);candidate.currentSheetIndex=si;candidate.currentActionIndex=ai;candidate.currentFrameIndex=0;candidate.currentLayerIndex=front;
  assert.deepEqual(candidate.spriteSheets,raw.spriteSheets);
  for(let i=0;i<raw.layers.length;i++){const actual=candidate.layers[i<front?i:i+1],expected=structuredClone(raw.layers[i]);if(expected.parent!=null&&expected.parent>=front)expected.parent++;assert.deepEqual(actual,expected,'unauthorized layer must be unchanged: '+i);}
  assert.equal(Object.keys(layer.frameData).length,4);assert(Object.keys(layer.frameData).every(k=>k.startsWith(si+'_'+ai+'_')));
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));
  await contacts(raw,'修改前-原稿.png');const preview=await contacts(candidate,'试装-全部待机.png');await contacts(candidate,'试装-无头发检查.png',true);
  const cm=new PE.CanvasManager(Object.assign(createCanvas(360,360),{style:{}}),preview);
  for(let side=0;side<3;side++)if(side!==ai)for(let fi=0;fi<4;fi++){const beforeP=await decoded(raw),beforeCM=new PE.CanvasManager(Object.assign(createCanvas(360,360),{style:{}}),beforeP);assert.deepEqual(cm.getCompositeImageData(si,side,fi,false).data,beforeCM.getCompositeImageData(si,side,fi,false).data,'side/back composite unchanged');}
  const exporter=new PE.ExportManager();exporter.init(preview,cm);const frame=await exporter.exportFrameAsBlob(si,ai,0);fs.writeFileSync(path.join(out,'正面待机-高清透明导出.png'),Buffer.from(await frame.arrayBuffer()));
  const report={projectId:'character-gold-mix-1793320553623',asset:'五官素材/蓝瞳可编辑画布-20261030/蓝瞳-可编辑源画布.png',assetSHA256:digest(png),method:'Explicit opaque pixel rectangles on native editable canvas; no screenshot/source bitmap imported. Reference-inspired trace, not bit-identical screenshot.',sourceDimensions:[sprite.width,sprite.height],layerIndex:front,positions,onlyFrontIdle4Frames:true,oldLayersUnchanged:true,sideBackUnchanged:true};fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}
async function commit(){
  const rev=JSON.parse(fs.readFileSync(path.join(backup,'revision.json'))),url='http://127.0.0.1:8765/api/project?id='+rev.id,check=await fetch(url);assert(check.ok);assert.equal(check.headers.get('etag'),rev.etag,'project changed; candidate retained, do not overwrite');
  const bytes=fs.readFileSync(path.join(out,'candidate.json')),r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':rev.etag},body:bytes});const reply=await r.text();fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:r.status,etag:r.headers.get('etag'),body:reply},null,2));assert.equal(r.status,200,reply);
  const back=await fetch(url);assert(back.ok);const actual=await back.text(),p=JSON.parse(actual),expected=JSON.parse(bytes);assert.deepEqual(p,expected,'API readback differs');fs.writeFileSync(path.join(out,'api-readback.json'),actual);console.log('SAVED and exact API readback verified: '+rev.id);
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
