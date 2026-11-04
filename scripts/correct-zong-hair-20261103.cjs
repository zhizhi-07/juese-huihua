const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm');
const dir=fs.readFileSync('latest-zong-hair-correction-path.txt','utf8'),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),write=(n,p)=>fs.writeFileSync(path.join(dir,n),JSON.stringify(p,null,2));
const source=read('source.json'),before=read('before.json'),sm=read('source.meta.json'),tm=read('before.meta.json'),p=structuredClone(before),changes=[];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
for(let si=0;si<p.spriteSheets.length;si++){
  const t=p.spriteSheets[si],ssi=source.spriteSheets.findIndex(s=>s.name===t.name),s=source.spriteSheets[ssi];assert(s);
  assert.deepEqual(t.canvasLayout,s.canvasLayout,'different canvas origins');
  for(const slot of ['前发','后发']){
    const targets=p.layers.map((l,i)=>({l,i})).filter(({l})=>l.sheetIndex===si&&(slot==='前发'?l.name==='前发':l.name.endsWith(' / 后发')));assert.equal(targets.length,1);
    const candidates=source.layers.map((l,i)=>({l,i})).filter(({l})=>l.sheetIndex===ssi&&(slot==='前发'?l.name==='前发':l.name==='头发 / 灰色短卷发 / 后发')&&s.actions.every((a,ai)=>a.frames.every((f,fi)=>l.frameData?.[`${ssi}_${ai}_${fi}`])));
    assert.equal(candidates.length,1,'use the complete rear hair, not the partial duplicate');
    const {l:target,i:ti}=targets[0],{l:src,i:li}=candidates[0],afterData={};
    t.actions.forEach((a,ai)=>{const sai=s.actions.findIndex(x=>x.name===a.name&&x.direction===a.direction);assert(sai>=0);assert.equal(a.frames.length,s.actions[sai].frames.length);a.frames.forEach((f,fi)=>{const sf=s.actions[sai].frames[fi];assert.deepEqual([f.width,f.height],[sf.width,sf.height]);const c=src.frameData[`${ssi}_${sai}_${fi}`];assert(c);afterData[`${si}_${ai}_${fi}`]=structuredClone(c);});});
    changes.push({layer:ti,sourceLayer:li,slot,sheet:t.name,beforeName:target.name,afterName:src.name,changedCels:Object.keys(afterData).filter(k=>JSON.stringify(afterData[k])!==JSON.stringify(target.frameData[k]))});
    target.name=src.name;target.frameData=afterData;
  }
}
const restored=structuredClone(p);for(const c of changes)restored.layers[c.layer]=structuredClone(before.layers[c.layer]);assert.deepEqual(restored,before,'only hair may change');write('restore-extra-copy.json',restored);assert.deepEqual(read('restore-extra-copy.json'),before);
write('candidate.json',p);write('diff.json',changes);
async function qa(data,label){
  const rt='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/',{createCanvas,Image,ImageData}=require(rt+'@napi-rs/canvas');
  global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
  for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync('js/'+n+'.js','utf8'));
  const decode=async raw=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project,model=await decode(data),old=await decode(before),src=await decode(source);
  const cm=new PE.CanvasManager(document.createElement('canvas'),model),oldcm=new PE.CanvasManager(document.createElement('canvas'),old),sourcecm=new PE.CanvasManager(document.createElement('canvas'),src),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
  const studio=fs.readFileSync('js/studio.js','utf8'),start=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),end=studio.indexOf('  const originalSetTool=',start);assert(start>=0&&end>start);
  function bounds(im){let x=im.width,y=im.height,r=-1,b=-1;for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++)if(im.data[(yy*im.width+xx)*4+3]){x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy);}return r<0?null:{x,y,w:r-x+1,h:b-y+1};}
  const app={project:model,canvasManager:cm,animationPlayer:new PE.AnimationPlayer()};app.animationPlayer.canvas=document.createElement('canvas');new Function('app','bounds',studio.slice(start,end))(app,bounds);
  const tile=146,rows=model.spriteSheets.reduce((n,s)=>n+s.actions.length,0),canvases={};for(const mode of ['before','after','front','rear'])canvases[mode]=createCanvas(8*tile,rows*tile);
  let checked=0,row=0;
  for(let si=0;si<model.spriteSheets.length;si++){
    const s=model.spriteSheets[si],ssi=source.spriteSheets.findIndex(x=>x.name===s.name),ids=changes.filter(c=>c.sheet===s.name).map(c=>c.layer),sourceIds=changes.filter(c=>c.sheet===s.name).map(c=>c.sourceLayer);
    const srcFlags=src.layers.map(l=>l.visible);src.layers.forEach((l,i)=>l.visible=sourceIds.includes(i));
    for(let ai=0;ai<s.actions.length;ai++,row++)for(let fi=0;fi<s.actions[ai].frames.length;fi++){
      const f=s.actions[ai].frames[fi];Object.assign(model,{currentSheetIndex:si,currentActionIndex:ai,currentFrameIndex:fi});
      const im=cm.getCompositeImageData(si,ai,fi,true,1);assert(bounds(im));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,cm.offscreenCanvas.width,cm.offscreenCanvas.height).data,cm.getCompositeImageData(si,ai,fi,true,cm.offscreenCanvas.width/f.width).data);
      Object.assign(app.animationPlayer,{sheetIndex:si,actionIndex:ai,currentFrame:fi});app.animationPlayer._renderPreviewFrame(false);assert.equal(app.animationPlayer._previewCache.frames.length,s.actions[ai].frames.length);assert(bounds(app.animationPlayer.canvas.getContext('2d').getImageData(0,0,144,144)));
      const out=require('./png.cjs').decode(Buffer.from(await(await ex.exportFrameAsBlob(si,ai,fi)).arrayBuffer()));assert.deepEqual([...out.data],[...im.data]);
      const flags=model.layers.map(l=>l.visible);model.layers.forEach((l,i)=>l.visible=ids.includes(i));assert.deepEqual(cm.getCompositeImageData(si,ai,fi,true,1).data,sourcecm.getCompositeImageData(ssi,ai,fi,true,1).data,'hair must match the supplied project');model.layers.forEach((l,i)=>l.visible=flags[i]);
      for(const mode of ['before','after','front','rear']){
        if(mode==='front'||mode==='rear')ids.forEach(i=>model.layers[i].visible=model.layers[i].name.endsWith('后发')?(mode==='rear'):(mode==='front'));
        const image=mode==='before'?oldcm.getCompositeImageData(si,ai,fi,true,1):mode==='after'?im:cm.getCompositeImageData(si,ai,fi,true,1);assert(bounds(image));
        const ctx=canvases[mode].getContext('2d'),c=createCanvas(image.width,image.height);c.getContext('2d').putImageData(image,0,0);ctx.imageSmoothingEnabled=false;ctx.fillStyle=fi%2?'#252833':'#e5e0ee';ctx.fillRect(fi*tile,row*tile,tile,tile);ctx.drawImage(c,fi*tile+4,row*tile+2,image.width*3,image.height*3);ctx.fillStyle=fi%2?'white':'black';ctx.font='11px sans-serif';ctx.fillText(`${s.name.replace('original32_','')} ${s.actions[ai].direction} ${fi+1}`,fi*tile+4,row*tile+140);
        model.layers.forEach((l,i)=>l.visible=flags[i]);
      }
      checked++;
    }
    src.layers.forEach((l,i)=>l.visible=srcFlags[i]);
  }
  assert.equal(checked,70);for(const [mode,c]of Object.entries(canvases))fs.writeFileSync(path.join(dir,`${label}-${mode}.png`),c.toBuffer('image/png'));
  write(label+'-qa.json',{frames:checked,sourceHairExact:true,nonHairAndMetadataUnchanged:true,mainRenderStudioPreviewPngChecked:true,restorationExtraCopyVerified:true,changedCels:changes.reduce((n,c)=>n+c.changedCels.length,0),browserChecked:false});console.log('PASS',label,checked,'frames; exact supplied-source hair; main render, studio preview, PNG; non-hair unchanged');
}
(async()=>{
  if(process.argv[2]==='publish'){
    const sr=await fetch('http://127.0.0.1:8765/api/project?id='+sm.id);assert(sr.ok);assert.equal(hash(await sr.text()),sm.sha256,'source changed, stop and rebuild');
    const url='http://127.0.0.1:8765/api/project?id='+tm.id,r=await fetch(url);assert(r.ok);assert.equal(hash(await r.text()),tm.sha256,'target changed, compare and merge first');
    const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':tm.etag},body:JSON.stringify(p)}),message=await put.text();console.log('PUT',put.status,message);assert(put.ok);
    const get=await fetch(url),raw=await get.text();assert(get.ok);assert.deepEqual(JSON.parse(raw),p);fs.writeFileSync(path.join(dir,'after.json'),raw);await qa(JSON.parse(raw),'readback');
    const check=await fetch('http://127.0.0.1:8765/api/project?id='+sm.id);assert.equal(hash(await check.text()),sm.sha256);
    write('delivery.json',{file:path.resolve('data/projects/'+tm.id+'.json'),etag:get.headers.get('etag'),sha256:hash(raw),source:sm.id,sourceUnchanged:true,changedLayers:changes.length});
    fs.writeFileSync(path.join(dir,'恢复说明.txt'),'本次仅替换总工程的10个前后发图层的name与frameData；源为用户指定的draft-user-canvas-merged-1793608789349-dbd059d3。待机后发取完整12帧层11，不取8帧层5；前发取当前前发层198，其他动作对应同名完整层。未更改衣服、眼睛、素体、图层关系、显隐、锁定、画布、帧数、时长。\n恢复时GET总工程和ETag，对照after.json确认本次头发层未有后续编辑，仅把diff.json对应层的name和frameData恢复为before.json。保留其余最新数据，If-Match PUT；冲突先合并，不强盖。restore-extra-copy.json已验证与before.json相等。未刷新或操作网页。');
    console.log('DELIVERED',tm.id,JSON.stringify(changes.map(c=>({sheet:c.sheet,slot:c.slot,sourceLayer:c.sourceLayer,changedCels:c.changedCels.length}))));
  }else await qa(p,'candidate');
})().catch(e=>{console.error(e);process.exit(1);});
