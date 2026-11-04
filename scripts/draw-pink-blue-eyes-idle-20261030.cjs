const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('@napi-rs/canvas');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','pixel-import'])vm.runInThisContext(fs.readFileSync(path.join(__dirname,'../js/'+f+'.js'),'utf8'),{filename:f});
const root=path.resolve(__dirname,'..'),out=path.join(root,'自检记录/粉边浅蓝眼-20261030'),assets=path.join(root,'五官素材/粉边浅蓝眼-20261030'),backup=path.join(root,'备份/20261030-粉边浅蓝眼');
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
  const c=createCanvas(36,20),ctx=c.getContext('2d'),palette={B:'#e3c6c7',p:'#f3cbd0',b:'#ad858b',k:'#66565e',W:'#fffdf5',H:'#fffdf5',S:'#657fb8',L:'#7bb9ee',m:'#d795a3',r:'#f3a4b3'};
  const left=['...pppp..','..pbbbbp.','.pbkkkkbp','pbkWiiikp','pbkWiiikp','pbkWiiikp','.bkWiiimp','.mWWiiimp','..miiimp.','...rrrp..'];
  const right=left.map(row=>[...row].reverse().join(''));
  function cell(code,x,y){if(!palette[code])return;ctx.fillStyle=palette[code];ctx.fillRect(x,y,1,1);}
  for(const [grid,x]of [[left,6],[right,24]])for(let y=0;y<grid.length;y++){
    assert.equal(grid[y].length,9);const iris=[];for(let dx=0;dx<9;dx++){const code=grid[y][dx];if(code==='i')iris.push(dx);else cell(code,x+dx,4+y);}
    for(let i=0;i<iris.length;i++)cell(y===3?(i<2?'H':'S'):y===4?'S':'L',x+iris[i],4+y);
  }
  for(const x of [11,12,13,14,24,25,26,27])cell('B',x,0);cell('B',10,1);cell('B',28,1);
  const sprite=ctx.getImageData(0,0,36,20),png=c.toBuffer('image/png'),dataURL=c.toDataURL('image/png');assert(sprite.data.some((v,i)=>i%4===3&&v));assert(sprite.data.every((v,i)=>i%4!==3||v===0||v===255));
  fs.copyFileSync('C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-05fe60ce-ae81-4b1a-b46c-72c603d338c1.png',path.join(assets,'用户参考.png'));
  fs.writeFileSync(path.join(assets,'粉边浅蓝眼-可编辑源画布.png'),png);fs.writeFileSync(path.join(assets,'可编辑像素格.json'),JSON.stringify({width:36,height:20,placementWidth:18,placementHeight:10,palette,left,right,leftOrigin:[6,4],rightOrigin:[24,4]},null,2));
  fs.writeFileSync(path.join(assets,'备用-原蓝瞳图层.json'),JSON.stringify(raw.layers[oldIndex],null,2));
  const layer={...structuredClone(old),name:'眼睛 / 粉边浅蓝·可编辑画布',visible:true,frameData:{}},positions=[];
  for(let fi=0;fi<4;fi++){
    const key=si+'_'+ai+'_'+fi;assert(old.frameData[key]);const head=p.layers.find(l=>l.name==='head'&&l.sheetIndex===si&&l.getFrameData(key));assert(head);const bounds=mainBounds(head.getFrameData(key)),placement={x:8,y:bounds.top+9,w:18,h:10};PE.utils.validateImagePlacement(placement,p.spriteSheets[si].actions[ai].frames[fi]);
    layer.frameData[key]={width:36,height:20,dataURL,placement};assert.equal(36/placement.w,20/placement.h);positions.push({key,headTop:bounds.top,placement});
  }
  old.visible=false;old.name='眼睛 / 备用·蓝瞳统一细网格';
  const at=oldIndex+1;for(const l of candidate.layers)if(l.parent!=null&&l.parent>=at)l.parent++;if(layer.parent!=null&&layer.parent>=at)layer.parent++;
  candidate.layers.splice(at,0,layer);candidate.currentSheetIndex=si;candidate.currentActionIndex=ai;candidate.currentFrameIndex=0;candidate.currentLayerIndex=at;
  assert.deepEqual(candidate.spriteSheets,raw.spriteSheets);
  for(let i=0;i<raw.layers.length;i++){const expected=structuredClone(raw.layers[i]);if(expected.parent!=null&&expected.parent>=at)expected.parent++;if(i===oldIndex){expected.name=old.name;expected.visible=false;}assert.deepEqual(candidate.layers[i<at?i:i+1],expected,'Unrelated layer changed '+i);}
  assert.deepEqual(old.frameData,raw.layers[oldIndex].frameData,'Backup eye source and placement must remain exact.');
  const zoomed=createCanvas(576,320),zc=zoomed.getContext('2d');zc.fillStyle='#feede1';zc.fillRect(0,0,576,320);zc.imageSmoothingEnabled=false;zc.drawImage(c,0,0,576,320);zc.strokeStyle='#cbbeb8';zc.lineWidth=1;zc.beginPath();for(let x=0;x<=36;x++){zc.moveTo(x*16+.5,0);zc.lineTo(x*16+.5,320);}for(let y=0;y<=20;y++){zc.moveTo(0,y*16+.5);zc.lineTo(576,y*16+.5);}zc.stroke();fs.writeFileSync(path.join(out,'统一细网格-新眼源画布.png'),zoomed.toBuffer('image/png'));
  await contacts(raw,'修改前-全部待机.png');await contacts(candidate,'修改后-全部待机.png');await contacts(candidate,'修改后-无头发检查.png',true);
  const preview=await decoded(candidate),cm=new PE.CanvasManager(Object.assign(createCanvas(576,576),{style:{}}),preview);preview.selectFrame(si,ai,0);cm.showGrid=false;cm.zoom=16;cm.centerView();cm.render();fs.writeFileSync(path.join(out,'主画布-render.png'),cm.canvas.toBuffer('image/png'));
  const ex=new PE.ExportManager();ex.init(preview,cm);const blob=await ex.exportFrameAsBlob(si,ai,0);fs.writeFileSync(path.join(out,'正面待机-透明导出.png'),Buffer.from(await blob.arrayBuffer()));
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({id,backupLayerIndex:oldIndex,newLayerIndex:at,source:[36,20],placement:[18,10],uniformCell:[.5,.5],positions,allOtherLayersUnchanged:true,backupEyePixelsUnchanged:true,referenceIsNotBitIdentical:true,sourceSHA256:digest(png)},null,2));
  console.log('PREPARED: pink-rim light blue eye in four front idle cels; old blue eye hidden as editable backup; original other layers and actions exact.');
}
async function commit(){
  const rev=JSON.parse(fs.readFileSync(path.join(backup,'revision.json'))),url='http://127.0.0.1:8765/api/project?id='+rev.id,check=await fetch(url);assert(check.ok);assert.equal(check.headers.get('etag'),rev.etag,'Project changed; do not overwrite');
  const bytes=fs.readFileSync(path.join(out,'candidate.json')),r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':rev.etag},body:bytes});const reply=await r.text();fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:r.status,etag:r.headers.get('etag'),body:reply},null,2));assert.equal(r.status,200,reply);
  const back=await fetch(url);assert(back.ok);const actual=await back.text();assert.deepEqual(JSON.parse(actual),JSON.parse(bytes));fs.writeFileSync(path.join(out,'api-readback.json'),actual);console.log('SAVED and exact API readback verified: '+rev.id);
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
