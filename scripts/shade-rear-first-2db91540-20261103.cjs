const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),dir=path.join(root,fs.readFileSync(path.join(root,'自检记录/latest-rear-shadow-2db91540.txt'),'utf8').trim());
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),write=(n,v)=>fs.writeFileSync(path.join(dir,n),JSON.stringify(v,null,2)),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const before=read('before.json'),meta=read('meta.json'),p=structuredClone(before),li=130,key='8_2_0',f=p.layers[li].frameData[key],decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64')),im=decode(f),old=Uint8Array.from(im.data),diff=[];
assert.equal(p.layers[li].name,'后发');assert.equal(p.layers[li].sheetIndex,8);assert.deepEqual([im.width,im.height],[32,36]);
// The shadow follows the lower bob volume, with short staggered locks instead of full-height stripes.
const boundary=[16,16,17,18,17,18,19,20,19,19,20,19,18,17,18,17,16,16];
for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
 const i=(y*im.width+x)*4,color=Buffer.from(old.slice(i,i+3)).toString('hex');
 if(!old[i+3]||color!=='d1d1d1')continue;
 const start=x<7||x>24?19:boundary[x-7];if(y<start)continue;
 const deep=(y===20&&(x===5||x===6||x===25||x===26))||(y===21&&(x===6||x===25));
 const to=deep?'777777':'aaaaaa';im.data.set(Buffer.from(to,'hex'),i);diff.push({x,y,from:color,to});
}
assert(diff.length>50&&diff.length<150);for(let i=0;i<old.length;i+=4){assert.equal(im.data[i+3],old[i+3],'unchanged silhouette');if(Buffer.from(old.slice(i,i+3)).toString('hex')!=='d1d1d1')assert.deepEqual(im.data.slice(i,i+4),old.slice(i,i+4),'outline and existing shades preserved');}
for(const c of diff){const i=(c.y*32+(31-c.x))*4;assert.deepEqual(im.data.slice(i,i+3),im.data.slice((c.y*32+c.x)*4,(c.y*32+c.x)*4+3),'symmetric rear shading');}
f.dataURL='data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');const restored=structuredClone(p);restored.layers[li].frameData[key].dataURL=before.layers[li].frameData[key].dataURL;assert.deepEqual(restored,before,'only rear first-back PNG may change');write('restore-extra-copy.json',restored);assert.deepEqual(read('restore-extra-copy.json'),before);write('candidate.json',p);write('pixel-diff.json',{layer:li,key,pixels:diff});
async function qa(){
 const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8'),start=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),end=studio.indexOf('  const originalSetTool=',start);assert(start>=0&&end>start);
 function bounds(im){let x=im.width,y=im.height,r=-1,b=-1;for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++)if(im.data[(yy*im.width+xx)*4+3]){x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy);}return r<0?null:{x,y,w:r-x+1,h:b-y+1};}
 const cv=createCanvas(900,660),ctx=cv.getContext('2d');ctx.imageSmoothingEnabled=false;let checked=0;
 for(const [state,data]of [before,p].entries()){
  const model=(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project,cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
  const app={project:model,canvasManager:cm,animationPlayer:new PE.AnimationPlayer()};app.animationPlayer.canvas=document.createElement('canvas');new Function('app','bounds',studio.slice(start,end))(app,bounds);
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<model.spriteSheets[8].actions[ai].frames.length;fi++){
   Object.assign(model,{currentSheetIndex:8,currentActionIndex:ai,currentFrameIndex:fi});const im=cm.getCompositeImageData(8,ai,fi,true,1);assert(bounds(im));cm.render();const scale=cm.offscreenCanvas.width/model.spriteSheets[8].actions[ai].frames[fi].width;assert.deepEqual(cm.offscreenCtx.getImageData(0,0,cm.offscreenCanvas.width,cm.offscreenCanvas.height).data,cm.getCompositeImageData(8,ai,fi,true,scale).data);
   Object.assign(app.animationPlayer,{sheetIndex:8,actionIndex:ai,currentFrame:fi});app.animationPlayer._renderPreviewFrame(false);assert(bounds(app.animationPlayer.canvas.getContext('2d').getImageData(0,0,144,144)));const out=png.decode(Buffer.from(await(await ex.exportFrameAsBlob(8,ai,fi)).arrayBuffer()));assert.deepEqual([...out.data],[...im.data]);checked++;
   if(fi)continue;for(let mode=0;mode<2;mode++){
    const flags=model.layers.map(l=>l.visible);if(mode)model.layers.forEach((l,i)=>l.visible=i===li);const image=mode?cm.getCompositeImageData(8,ai,fi,true,1):im;assert(bounds(image),'nonempty rear/character');model.layers.forEach((l,i)=>l.visible=flags[i]);const c=createCanvas(image.width,image.height);c.getContext('2d').putImageData(image,0,0);
    for(let bg=0;bg<2;bg++){const x=ai*300+bg*150,y=state*330+mode*165;ctx.fillStyle=bg?'#282733':'#e1dce5';ctx.fillRect(x,y,150,165);ctx.drawImage(c,x+16,y+3,image.width*3,image.height*3);ctx.drawImage(c,x+105,y+120);ctx.fillStyle=bg?'white':'black';ctx.font='11px sans-serif';ctx.fillText(`${state?'after':'before'} ${mode?'rear':'full'} ${ai}`,x+4,y+158);}
   }
  }
 }
 fs.writeFileSync(path.join(dir,'comparison.png'),cv.toBuffer('image/png'));write('verification.json',{changedPixels:diff.length,changedLayer:li,changedFrame:key,otherDataExact:true,alphaAndOutlineUnchanged:true,symmetricShadow:true,checkedRenders:checked,mainStudioPreviewPngChecked:true,restoredExtraCopyExact:true,browserChecked:false});console.log('PASS QA',diff.length,'shadow pixels;',checked,'render checks');
}
async function publish(){
 const url='http://127.0.0.1:8765/api/project?id='+meta.id,r=await fetch(url);assert(r.ok);assert.equal(hash(await r.text()),meta.sha256,'project changed: compare and merge, never overwrite');const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(p)}),msg=await put.text();fs.writeFileSync(path.join(dir,'save-response.txt'),put.status+'\n'+msg);assert(put.ok,msg);const get=await fetch(url),raw=await get.text();assert(get.ok);assert.deepEqual(JSON.parse(raw),p);fs.writeFileSync(path.join(dir,'api-readback.json'),raw);write('delivery.json',{status:put.status,etag:get.headers.get('etag'),originalSHA256:meta.sha256,sha256:hash(raw),apiReadbackExact:true});
 fs.writeFileSync(path.join(dir,'恢复说明.txt'),'仅补中性工程待机背面第一帧后发阴影：图层130、8_2_0，仅底色改为现有灰色阴影，描边轮廓透明度及其余全部数据不动。\n恢复时GET最新工程及ETag，确认当前8_2_0与api-readback.json一致后，仅还原before.json的该帧dataURL，保留最新其他内容，If-Match PUT；遇冲突先合并。额外恢复副本已验证。未操作或刷新网页。');console.log('PASS PUT',put.status,'exact API readback');
}
(process.argv[2]==='publish'?publish():qa()).then(()=>console.log(dir)).catch(e=>{console.error(e);process.exitCode=1});
