const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const png=require('./png.cjs');
const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),backup=path.join(root,'备份/20261031-修复发顶露肤'),out=path.join(root,'自检记录/20261031-修复发顶露肤');
const bytes=fs.readFileSync(path.join(backup,'original.json')),meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json'))),raw=JSON.parse(bytes),candidate=structuredClone(raw);
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
fs.mkdirSync(out,{recursive:true});
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'));
const decode=async p=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]))).project;
const toCanvas=d=>{const c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);return c;};
async function prepare(){
  const changes=[],pixelChanges=[],auditedCrowns=[];
  const moved=JSON.parse(fs.readFileSync(path.join(root,'自检记录/20261031-上移并修补发顶/verification.json'))).changedCels;
  const raster=async(frame,w,h)=>{const c=createCanvas(w,h),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;const im=await require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas').loadImage(Buffer.from(frame.dataURL.split(',')[1],'base64'));const q=frame.placement||{x:0,y:0,w:frame.width,h:frame.height};ctx.drawImage(im,q.x,q.y,q.w,q.h);return ctx.getImageData(0,0,w,h);};
  for(const {key,sheet:si,direction} of moved){
    const li=raw.layers.findIndex(l=>l.sheetIndex===si&&l.name==='头发 / 80011 / 前发'),f=raw.layers[li].frameData[key];
    const head=raw.layers.find(l=>l.sheetIndex===si&&l.name==='head'&&l.frameData?.[key]);assert(head,'head '+key);
    const [_,ai,fi]=key.split('_').map(Number),frame=raw.spriteSheets[si].actions[ai].frames[fi],w=frame.width,h=frame.height;
    if(f.placement){assert.equal(f.width,f.placement.w);assert.equal(f.height,f.placement.h);}
    const d=await raster(f,w,h),hd=await raster(head.frameData[key],w,h),old=new Uint8ClampedArray(d.data);
    let top=h;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(d.data[(y*w+x)*4+3])top=Math.min(top,y);
    auditedCrowns.push({key,top});
    const opaque=(x,y)=>x>=0&&x<w&&y>=0&&y<h&&(old[(y*w+x)*4+3]||hd.data[(y*w+x)*4+3]);
    let count=0;
    for(let y=top;y<top+3;y++)for(let x=0;x<w;x++){
      const k=(y*w+x)*4;if(old[k+3]||!hd.data[k+3])continue;
      const border=!opaque(x,y-1)||!opaque(x-1,y)||!opaque(x+1,y);
      d.data.set(border?[119,119,119,255]:[209,209,209,255],k);count++;
    }
    for(let y=top;y<top+3;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4;if(hd.data[k+3])assert(d.data[k+3]===255,'Front crown covers head '+key);}
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=(y*w+x)*4;if(y<top||y>=top+3||old[k+3])assert.deepEqual(d.data.subarray(k,k+4),old.subarray(k,k+4),'Outside hole unchanged');}
    if(count){candidate.layers[li].frameData[key]={width:w,height:h,dataURL:'data:image/png;base64,'+png.encode(w,h,d.data).toString('base64')};changes.push({li,key,sheet:si,direction});pixelChanges.push({li,key,count,top});}
  }
  assert(changes.length>0);
  const reverted=structuredClone(candidate);for(const {li,key}of changes)reverted.layers[li].frameData[key]=raw.layers[li].frameData[key];assert.deepEqual(reverted,raw,'Only crown holes in front hair may change');
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));
  const before=await decode(raw),after=await decode(candidate),oldCM=new PE.CanvasManager(document.createElement('canvas'),before),cm=new PE.CanvasManager(document.createElement('canvas'),after);
  cm.canvas.width=480;cm.canvas.height=480;cm.zoom=6;cm.showGrid=false;
  const exporter=new PE.ExportManager();exporter.init(after,null);
  const player=new PE.AnimationPlayer();player.project=after;player.canvasManager=cm;player.canvas=document.createElement('canvas');player.ctx=player.canvas.getContext('2d');player.previewScale=1;
  let checked=0;
  for(const si of [7,8,9,10,11]){
    const s=after.spriteSheets[si],cell=168,cols=Math.max(...s.actions.map(a=>a.frames.length));
    const sheet=createCanvas(cols*cell,s.actions.length*cell*2),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
    for(const [ai,a]of s.actions.entries())for(let fi=0;fi<a.frames.length;fi++){
      const old=oldCM.getCompositeImageData(si,ai,fi,true,3),now=cm.getCompositeImageData(si,ai,fi,true,3);
      if(a.direction!=='up'){
        const ch=auditedCrowns.find(c=>c.key===si+'_'+ai+'_'+fi);
        if(ch){const native=cm.getCompositeImageData(si,ai,fi);for(let y=ch.top;y<ch.top+3;y++)for(let x=0;x<native.width;x++){const k=(y*native.width+x)*4;if(native.data[k+3])assert(Math.max(native.data[k],native.data[k+1],native.data[k+2])-Math.min(native.data[k],native.data[k+1],native.data[k+2])<=1,'No skin or black body outline in crown '+si+'/'+ai+'/'+fi);}}
      }
      assert(now.data.some((v,i)=>i%4===3&&v),'Composite must contain character');
      if(a.direction==='up')assert.deepEqual(now.data,old.data,'Back view unchanged');
      after.selectFrame(si,ai,fi);cm.render();
      const scale=cm.offscreenCanvas.width/s.frameWidth;
      assert.deepEqual(cm.offscreenCtx.getImageData(0,0,cm.offscreenCanvas.width,cm.offscreenCanvas.height).data,cm.getCompositeImageData(si,ai,fi,true,scale).data,'Main canvas');
      assert.deepEqual(exporter._getCompositeImageData(si,ai,fi,3).data,now.data,'PNG export composition');
      player.sheetIndex=si;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();
      const preview=cm.getCompositeImageData(si,ai,fi);
      assert.deepEqual(player.ctx.getImageData(0,0,preview.width,preview.height).data,preview.data,'Animation preview');
      for(const [row,d,label]of [[0,old,'BEFORE'],[1,now,'AFTER FIX']]){
        const x=fi*cell,y=(ai*2+row)*cell;ctx.fillStyle=row?'#303342':'#e9e2dc';ctx.fillRect(x,y,cell,cell);
        ctx.drawImage(toCanvas(d),x+12,y+22,144,144);ctx.fillStyle=row?'white':'#222';ctx.font='12px sans-serif';ctx.fillText(`${a.direction} ${fi+1} ${label}`,x+4,y+14);
      }
      checked++;
    }
    fs.writeFileSync(path.join(out,s.name+'-before-after.png'),sheet.toBuffer('image/png'));
  }
  const preview=createCanvas(720,400),pc=preview.getContext('2d');pc.imageSmoothingEnabled=false;
  for(const [i,c] of [oldCM,cm].entries()){pc.fillStyle=i?'#303342':'#e9e2dc';pc.fillRect(i*360,0,360,400);const d=c.getCompositeImageData(8,0,0),cc=toCanvas(d);pc.drawImage(cc,i*360+18,36,324,324);pc.fillStyle=i?'white':'#222';pc.font='16px sans-serif';pc.fillText(i?'AFTER':'BEFORE',i*360+14,24);pc.drawImage(cc,i*360+160,362,36,36);}
  fs.writeFileSync(path.join(out,'发顶修复对比.png'),preview.toBuffer('image/png'));
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({changedCels:changes,pixelChanges,auditedCrownFrames:auditedCrowns.length,headCoverageInTopThreeRows:true,checkedCompositeFrames:checked,unrelatedDataExact:true,backViewsExact:true,outsideCrownHolesExact:true,crownRepaired:true,mainCanvasAndAnimationAndExport:true,browserTested:false,backup},null,2));
  console.log(JSON.stringify({prepared:true,changed:changes.length,pixelChanges,checked,out}));
}
async function commit(){
  const prepared=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'))),current=await fetch(meta.url);assert(current.ok);
  assert.equal(current.headers.get('etag'),meta.etag,'Concurrent edit: stop, do not overwrite');assert.deepEqual(await current.json(),raw);
  const r=await fetch(meta.url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(prepared)}),reply=await r.text();
  fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:r.status,body:reply,etag:r.headers.get('etag')},null,2));assert.equal(r.status,200,reply);
  const read=await fetch(meta.url);assert(read.ok);const text=await read.text();assert.deepEqual(JSON.parse(text),prepared);fs.writeFileSync(path.join(out,'api-readback.json'),text);
  const result=JSON.parse(fs.readFileSync(path.join(out,'verification.json')));result.saved=true;result.etag=read.headers.get('etag');fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2));
  fs.writeFileSync(path.join(out,'恢复说明.txt'),`原稿：${path.join(backup,'original.json')}\n只撤销本次时，应从原稿恢复 verification.json 所列 changedCels，保留其他当前数据，再用最新读取的ETag提交；出现版本冲突停止，不得整稿强制覆盖。\n`);
  console.log('SAVED HTTP 200; complete API readback exact; '+out);
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});

