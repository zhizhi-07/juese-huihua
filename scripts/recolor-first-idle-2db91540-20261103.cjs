const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),dir=path.join(root,fs.readFileSync(path.join(root,'自检记录/latest-recolor-2db91540.txt'),'utf8').trim());
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),write=(n,v)=>fs.writeFileSync(path.join(dir,n),JSON.stringify(v,null,2));
const before=read('before.json'),reference=read('reference.json'),meta=read('before.meta.json'),refMeta=read('reference.meta.json'),p=structuredClone(before),changes=[];
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const si=before.spriteSheets.findIndex(s=>s.name==='original32_idle');assert.equal(si,8);
// Match each piece's base/shadow roles: the old fringe base is lighter than the old rear base.
const maps={130:{'46465e':'46465e','b4b4fe':'d1d1d1','6060d2':'aaaaaa','030372':'777777'},190:{'46465e':'46465e','65658b':'777777','e5e5ff':'d1d1d1','b4b4fe':'aaaaaa','6060d2':'777777','fafaff':'ececec','ffffff':'ececec'}};
for(const [li,map]of Object.entries(maps)){
  const layer=p.layers[li];assert.equal(layer.sheetIndex,si);assert(/发/.test(layer.name));
  for(let ai=0;ai<3;ai++){
    const key=`${si}_${ai}_0`,f=layer.frameData[key];if(!f)continue;
    const im=decode(f),old=Uint8Array.from(im.data);let count=0;
    for(let i=0;i<im.data.length;i+=4){if(!old[i+3])continue;const color=Buffer.from(old.slice(i,i+3)).toString('hex');assert(map[color],`unknown hair color ${color}`);im.data.set(Buffer.from(map[color],'hex'),i);assert.equal(im.data[i+3],old[i+3]);if(color!==map[color])count++;}
    if(count){f.dataURL='data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');changes.push({layer:Number(li),name:layer.name,key,pixels:count});}
  }
}
assert.equal(changes.length,5);const restored=structuredClone(p);
for(const c of changes){const a=decode(p.layers[c.layer].frameData[c.key]),b=decode(before.layers[c.layer].frameData[c.key]);assert.deepEqual([a.width,a.height],[b.width,b.height]);for(let i=3;i<a.data.length;i+=4)assert.equal(a.data[i],b.data[i]);restored.layers[c.layer].frameData[c.key].dataURL=before.layers[c.layer].frameData[c.key].dataURL;}
assert.deepEqual(restored,before,'only five first-idle hair PNG payloads may change');write('restore-extra-copy.json',restored);assert.deepEqual(read('restore-extra-copy.json'),before);write('candidate.json',p);write('pixel-diff.json',{scope:'original32_idle, side/down/up, frame 0; colors only',maps,changes});
async function qa(){
 const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8'),start=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),end=studio.indexOf('  const originalSetTool=',start);assert(start>=0&&end>start);
 function bounds(im){let x=im.width,y=im.height,r=-1,b=-1;for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++)if(im.data[(yy*im.width+xx)*4+3]){x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy);}return r<0?null:{x,y,w:r-x+1,h:b-y+1};}
 const cv=createCanvas(900,600),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;let checked=0;
 for(const [state,data]of [before,p,reference].entries()){
  const model=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project,msi=model.spriteSheets.findIndex(s=>s.name==='original32_idle'),cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
  const app={project:model,canvasManager:cm,animationPlayer:new PE.AnimationPlayer()};app.animationPlayer.canvas=document.createElement('canvas');new Function('app','bounds',studio.slice(start,end))(app,bounds);
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<model.spriteSheets[msi].actions[ai].frames.length;fi++){
   Object.assign(model,{currentSheetIndex:msi,currentActionIndex:ai,currentFrameIndex:fi});const im=cm.getCompositeImageData(msi,ai,fi,true,1);assert(bounds(im),'nonempty character');cm.render();const scale=cm.offscreenCanvas.width/model.spriteSheets[msi].actions[ai].frames[fi].width;assert.deepEqual(cm.offscreenCtx.getImageData(0,0,cm.offscreenCanvas.width,cm.offscreenCanvas.height).data,cm.getCompositeImageData(msi,ai,fi,true,scale).data);
   Object.assign(app.animationPlayer,{sheetIndex:msi,actionIndex:ai,currentFrame:fi});app.animationPlayer._renderPreviewFrame(false);assert(bounds(app.animationPlayer.canvas.getContext('2d').getImageData(0,0,144,144)));
   const out=png.decode(Buffer.from(await(await ex.exportFrameAsBlob(msi,ai,fi)).arrayBuffer()));assert.deepEqual([...out.data],[...im.data]);checked++;
   if(fi)continue;const c=createCanvas(im.width,im.height);c.getContext('2d').putImageData(im,0,0);for(let bg=0;bg<2;bg++){const x=ai*300+bg*150,y=state*200;ctx.fillStyle=bg?'#282733':'#e1dce5';ctx.fillRect(x,y,150,200);ctx.drawImage(c,x+18,y+8,im.width*3,im.height*3);ctx.drawImage(c,x+100,y+135);ctx.fillStyle=bg?'white':'black';ctx.font='12px sans-serif';ctx.fillText(['before','after','reference'][state]+' '+model.spriteSheets[msi].actions[ai].direction,x+4,y+190);}
  }
 }
 fs.writeFileSync(path.join(dir,'comparison.png'),cv.toBuffer('image/png'));write('verification.json',{checked,changedCels:changes.length,changedPixels:changes.reduce((n,c)=>n+c.pixels,0),alphaShapeAndAllOtherDataUnchanged:true,mainRenderStudioPreviewAndPngChecked:true,restoreExtraCopyExact:true,browserChecked:false});console.log('PASS QA',checked,'renders; only first-idle hair colors changed');
}
async function publish(){
 for(const [m,file]of [[meta,'before.json'],[refMeta,'reference.json']]){const r=await fetch('http://127.0.0.1:8765/api/project?id='+m.id);assert(r.ok);assert.equal(hash(await r.text()),m.sha256,file+' changed: stop rather than overwrite');}
 const url='http://127.0.0.1:8765/api/project?id='+meta.id,put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(p)}),message=await put.text();fs.writeFileSync(path.join(dir,'save-response.txt'),put.status+'\n'+message);assert(put.ok,message);
 const r=await fetch(url),raw=await r.text();assert(r.ok);assert.deepEqual(JSON.parse(raw),p);fs.writeFileSync(path.join(dir,'api-readback.json'),raw);const ref=await fetch('http://127.0.0.1:8765/api/project?id='+refMeta.id);assert(ref.ok);assert.equal(hash(await ref.text()),refMeta.sha256);write('delivery.json',{status:put.status,etag:r.headers.get('etag'),sha256:hash(raw),originalSHA256:meta.sha256,apiReadbackExact:true,referenceUnchanged:true});
 fs.writeFileSync(path.join(dir,'恢复说明.txt'),'只改中性工程 original32_idle 的侧、正、背第一帧头发颜色，共5个非空PNG。其他动作、其他帧、轮廓透明度、图层元数据及参考工程不变。\n恢复：GET目标工程取得最新ETag；对pixel-diff.json列出的5帧逐一与api-readback.json比较，若仍未被后续修改，仅恢复before.json中的对应dataURL，保留其他最新数据，再以If-Match PUT。冲突时停止并合并，不可整稿强盖。restore-extra-copy.json已在额外副本上验证恢复结果。\n验证为本地真实编辑器渲染/预览/导出及API回读，未刷新或操作用户网页。');console.log('PASS PUT',put.status,'API readback exact; reference untouched');
}
(process.argv[2]==='publish'?publish():qa()).then(()=>console.log(dir)).catch(e=>{console.error(e);process.exitCode=1});
