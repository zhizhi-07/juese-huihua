const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','pixel-import'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/'+f+'.js'),'utf8'),{filename:f});
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/粉边浅蓝原像素还原-20261030'),assets=path.join(root,'五官素材/粉边浅蓝原像素还原-20261030'),backup=path.join(root,'备份/20261030-粉边浅蓝原像素还原');
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
  if(fs.existsSync(path.join(backup,'before.json')))assert.equal(fs.readFileSync(path.join(backup,'before.json'),'utf8'),text,'Project changed; keep previous candidate.');
  else{fs.writeFileSync(path.join(backup,'before.json'),text);fs.writeFileSync(path.join(backup,'revision.json'),JSON.stringify({id,etag:response.headers.get('etag'),sha256:digest(text)},null,2));}
  const raw=JSON.parse(text),candidate=structuredClone(raw),p=await decoded(raw),si=p.spriteSheets.findIndex(s=>s.name==='original32_idle'),ai=p.spriteSheets[si].actions.findIndex(a=>a.direction==='down');
  const oldIndex=candidate.layers.findIndex(l=>l.name==='眼睛 / 蓝瞳·可编辑高清画布'&&l.sheetIndex===si);assert(oldIndex>=0,'Only move this task eye layer to backup.');
  const old=candidate.layers[oldIndex];assert(!old.locked);assert.equal(Object.keys(old.frameData).length,4);
  // Preserve the supplied eye pixels exactly instead of redesigning their shape or palette.
  const reference=await loadImage('C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-05fe60ce-ae81-4b1a-b46c-72c603d338c1.png'),src=createCanvas(reference.width,reference.height),sc=src.getContext('2d');sc.drawImage(reference,0,0);
  const original=sc.getImageData(0,0,reference.width,reference.height),c=createCanvas(240,160),ctx=c.getContext('2d'),sprite=ctx.createImageData(240,160),regions=[{x:8,y:0,w:55,h:93},{x:103,y:0,w:55,h:93}],kept=[];
  for(const r of regions){
    const bg=new Uint8Array(r.w*r.h),queue=[];
    function visit(x,y){if(x<0||y<0||x>=r.w||y>=r.h)return;const n=y*r.w+x;if(bg[n])return;const i=((r.y+y)*reference.width+r.x+x)*4;const skin=[254,243,240].every((v,j)=>Math.abs(original.data[i+j]-v)<=8),white=[0,1,2].every(j=>original.data[i+j]>=248);if(!skin&&!white)return;bg[n]=1;queue.push(n);}
    for(let x=0;x<r.w;x++){visit(x,0);visit(x,r.h-1);}for(let y=0;y<r.h;y++){visit(0,y);visit(r.w-1,y);}
    for(let n=0;n<queue.length;n++){const x=queue[n]%r.w,y=Math.floor(queue[n]/r.w);visit(x-1,y);visit(x+1,y);visit(x,y-1);visit(x,y+1);}
    for(let y=0;y<r.h;y++)for(let x=0;x<r.w;x++)if(!bg[y*r.w+x]){
      const sx=r.x+x,sy=r.y+y,i=(sy*reference.width+sx)*4,j=(sy*240+sx+43)*4;sprite.data.set(original.data.subarray(i,i+4),j);kept.push({sx,sy,destination:[sx+43,sy]});assert.deepEqual([...sprite.data.subarray(j,j+4)],[...original.data.subarray(i,i+4)]);
    }
  }
  assert(kept.length>3000&&kept.length<8000,'Eye extraction must contain real reference pixels.');ctx.putImageData(sprite,0,0);
  const png=c.toBuffer('image/png'),dataURL=c.toDataURL('image/png');
  fs.copyFileSync('C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-05fe60ce-ae81-4b1a-b46c-72c603d338c1.png',path.join(assets,'用户参考.png'));
  fs.writeFileSync(path.join(assets,'粉边浅蓝眼-可编辑源画布.png'),png);fs.writeFileSync(path.join(assets,'可编辑像素格.json'),JSON.stringify({width:240,height:160,placementWidth:24,placementHeight:16,method:'Exact source RGBA, two eye+brow regions, flood background only; no redraw, recolor or resampling',regions,offset:[43,0],retainedPixels:kept.length},null,2));
  fs.writeFileSync(path.join(assets,'备用-原蓝瞳图层.json'),JSON.stringify(raw.layers[oldIndex],null,2));
  const layer={...structuredClone(old),name:'眼睛 / 粉边浅蓝·可编辑画布',visible:true,frameData:{}},positions=[];
  for(let fi=0;fi<4;fi++){
    const key=si+'_'+ai+'_'+fi;assert(old.frameData[key]);const head=p.layers.find(l=>l.name==='head'&&l.sheetIndex===si&&l.getFrameData(key));assert(head);const bounds=mainBounds(head.getFrameData(key)),placement={x:5,y:bounds.top+8,w:24,h:16};PE.utils.validateImagePlacement(placement,p.spriteSheets[si].actions[ai].frames[fi]);
    layer.frameData[key]={width:240,height:160,dataURL,placement};assert.equal(240/placement.w,160/placement.h);positions.push({key,headTop:bounds.top,placement});
  }
  old.visible=false;old.name='眼睛 / 备用·蓝瞳统一细网格';
  const at=oldIndex+1;for(const l of candidate.layers)if(l.parent!=null&&l.parent>=at)l.parent++;if(layer.parent!=null&&layer.parent>=at)layer.parent++;
  candidate.layers.splice(at,0,layer);candidate.currentSheetIndex=si;candidate.currentActionIndex=ai;candidate.currentFrameIndex=0;candidate.currentLayerIndex=at;
  assert.deepEqual(candidate.spriteSheets,raw.spriteSheets);
  for(let i=0;i<raw.layers.length;i++){const expected=structuredClone(raw.layers[i]);if(expected.parent!=null&&expected.parent>=at)expected.parent++;if(i===oldIndex){expected.name=old.name;expected.visible=false;}assert.deepEqual(candidate.layers[i<at?i:i+1],expected,'Unrelated layer changed '+i);}
  assert.deepEqual(old.frameData,raw.layers[oldIndex].frameData,'Backup eye source and placement must remain exact.');
  const zoomed=createCanvas(960,640),zc=zoomed.getContext('2d');zc.fillStyle='#feede1';zc.fillRect(0,0,960,640);zc.imageSmoothingEnabled=false;zc.drawImage(c,0,0,960,640);fs.writeFileSync(path.join(out,'统一细网格-新眼源画布.png'),zoomed.toBuffer('image/png'));
  await contacts(raw,'修改前-全部待机.png');await contacts(candidate,'修改后-全部待机.png');await contacts(candidate,'修改后-无头发检查.png',true);
  const preview=await decoded(candidate),cm=new PE.CanvasManager(Object.assign(createCanvas(576,576),{style:{}}),preview);preview.selectFrame(si,ai,0);cm.showGrid=false;cm.zoom=16;cm.centerView();cm.render();fs.writeFileSync(path.join(out,'主画布-render.png'),cm.canvas.toBuffer('image/png'));
  const ex=new PE.ExportManager();ex.init(preview,cm);const blob=await ex.exportFrameAsBlob(si,ai,0);fs.writeFileSync(path.join(out,'正面待机-透明导出.png'),Buffer.from(await blob.arrayBuffer()));
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({id,backupLayerIndex:oldIndex,newLayerIndex:at,source:[240,160],placement:[24,16],nativePixelSize:[.1,.1],retainedPixels:kept.length,exactReferenceRGBA:true,positions,allOtherLayersUnchanged:true,backupEyePixelsUnchanged:true,referenceRetainedPixelsBitIdentical:true,sourceSHA256:digest(png)},null,2));
  console.log('PREPARED: exact reference eye pixels, no redraw/recolor/resampling in four front idle cels; old blue eye hidden as editable backup; original other layers and actions exact.');
}
async function commit(){
  const rev=JSON.parse(fs.readFileSync(path.join(backup,'revision.json'))),url='http://127.0.0.1:8765/api/project?id='+rev.id,check=await fetch(url);assert(check.ok);assert.equal(check.headers.get('etag'),rev.etag,'Project changed; do not overwrite');
  const bytes=fs.readFileSync(path.join(out,'candidate.json')),r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':rev.etag},body:bytes});const reply=await r.text();fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:r.status,etag:r.headers.get('etag'),body:reply},null,2));assert.equal(r.status,200,reply);
  const back=await fetch(url);assert(back.ok);const actual=await back.text();assert.deepEqual(JSON.parse(actual),JSON.parse(bytes));fs.writeFileSync(path.join(out,'api-readback.json'),actual);console.log('SAVED and exact API readback verified: '+rev.id);
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
