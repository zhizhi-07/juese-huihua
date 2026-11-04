const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const out=__dirname,root=path.resolve(out,'../..'),png=require(path.join(root,'scripts/png.cjs'));
const url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before);
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const idle=before.spriteSheets.findIndex(s=>s.name==='original32_idle');
const targets=['original32_walk','original32_pickup','original32_sit','original32_sleep'].map(n=>{const si=before.spriteSheets.findIndex(s=>s.name===n);assert(si>=0,n);return si;});
function bounds(im){
 let x0=im.width,y0=im.height,x1=-1,y1=-1;
 for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 return x1<0?null:{x0,y0,x1,y1};
}
function normalized(frame){
 const src=decode(frame),r=frame.placement||{x:0,y:0,w:36,h:36},im={width:36,height:36,data:new Uint8Array(36*36*4)};
 assert.equal(src.width,r.w);assert.equal(src.height,r.h);assert(Number.isInteger(r.x)&&Number.isInteger(r.y));
 for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){const i=(y*src.width+x)*4;if(!src.data[i+3])continue;const xx=x+r.x,yy=y+r.y;assert(xx>=0&&xx<36&&yy>=0&&yy<36);im.data.set(src.data.subarray(i,i+4),(yy*36+xx)*4);}return im;
}
function head(si,ai,fi){const key=`${si}_${ai}_${fi}`,l=before.layers.find(l=>l.sheetIndex===si&&l.name==='head'&&l.frameData[key]);assert(l,key+' head');const b=bounds(decode(l.frameData[key]));assert(b);return b;}
function copyPart(src,sh,th,w,h,rear){
 const data=new Uint8Array(w*h*4),b=bounds(src);if(!b)return {data,dx:0,dy:0,verticalFit:false,edgeRows:0};
 assert.equal(th.x1-th.x0,sh.x1-sh.x0,'头部宽度不同，不能直接复制');assert.equal(th.y1-th.y0,sh.y1-sh.y0,'头部高度不同，不能直接复制');
 const dx=th.x0-sh.x0,dy=th.y0-sh.y0,bottom=Math.min(h-1,b.y1+dy);let edgeRows=0;
 for(let y=0;y<h;y++){
   let sy=y-dy;
   // Keep the cap/face exact; fit only long hanging hair that would fall outside a smaller frame.
   if(rear&&y>th.y1){if(y>bottom)continue;sy=sh.y1+Math.round((y-th.y1)*(b.y1-sh.y1)/(bottom-th.y1));}
   if(sy<0||sy>=src.height)continue;
   const xs=[];for(let x=0;x<src.width;x++)if(src.data[(sy*src.width+x)*4+3])xs.push(x);if(!xs.length)continue;
   let shift=0;
   if(rear&&y>th.y1){
     assert(xs.at(-1)-xs[0]<w,'下摆比动作画布宽');
     shift=xs[0]+dx<0?-(xs[0]+dx):xs.at(-1)+dx>=w?w-1-xs.at(-1)-dx:0;if(shift)edgeRows++;
   }
   for(const x of xs){const xx=x+dx+shift;assert(xx>=0&&xx<w,'发根/五官超出画布');const i=(sy*src.width+x)*4;data.set(src.data.subarray(i,i+4),(y*w+xx)*4);}
 }
 if(!rear){let sourceCount=0,targetCount=0;for(let i=3;i<src.data.length;i+=4)if(src.data[i])sourceCount++;for(let i=3;i<data.length;i+=4)if(data[i])targetCount++;assert.equal(targetCount,sourceCount,'前发和眼睛不得丢像素');}
 return {data,dx,dy,verticalFit:rear&&b.y1+dy>=h,edgeRows};
}
(async()=>{
 const mode=process.argv[2]||'build';
 if(mode==='publish'||mode==='restore'){
   const c=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8')),r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),mode==='publish'?before:c,'工程已有新保存，停止覆盖');
   const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':mode==='publish'?fs.readFileSync(out+'/etag.txt','utf8').trim():r.headers.get('etag')},body:JSON.stringify(mode==='publish'?c:before)});
   assert(saved.ok,'PUT '+saved.status+' '+await saved.text());const read=await fetch(url);assert(read.ok);assert.deepEqual(await read.json(),mode==='publish'?c:before);
   fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({apiReadback:true,time:new Date().toISOString()},null,2));console.log('PASS '+mode+': If-Match PUT and API readback');return;
 }
 assert.equal(mode,'build');assert.equal(idle,8);
 const sourceLayers=[before.layers.find(l=>l.sheetIndex===idle&&l.name==='头发 / 用户 / 后发'),before.layers.find(l=>l.sheetIndex===idle&&l.name==='眼睛 / 眼睛'),before.layers.find(l=>l.sheetIndex===idle&&l.name==='前发')];assert(sourceLayers.every(l=>l?.visible));
 const rearLayers=[],upperLayers=[],records=[],hidden=[];
 for(const l of p.layers)if(targets.includes(l.sheetIndex)&&/眼/.test(l.name)&&l.visible){hidden.push(p.layers.indexOf(l));l.visible=false;}
 for(const si of targets){
   const sheet=p.spriteSheets[si],copies=sourceLayers.map(l=>({...structuredClone(l),sheetIndex:si,parent:null,depth:0,visible:true,frameData:{}}));
   for(let ai=0;ai<sheet.actions.length;ai++)for(let fi=0;fi<sheet.actions[ai].frames.length;fi++){
     const action=sheet.actions[ai],sourceAi=before.spriteSheets[idle].actions.findIndex(a=>a.direction===action.direction);assert(sourceAi>=0);
     const sourceFi=sheet.name==='original32_walk'?[0,2,3,1][fi%4]:fi%4,sh=head(idle,sourceAi,sourceFi),th=head(si,ai,fi),frame=action.frames[fi],key=`${si}_${ai}_${fi}`,sourceKey=`${idle}_${sourceAi}_${sourceFi}`;
     for(let part=0;part<3;part++){
       const f=sourceLayers[part].frameData[sourceKey],src=f?normalized(f):{width:36,height:36,data:new Uint8Array(36*36*4)};
       if(action.direction==='up'&&part!==0)assert(!bounds(src),'背面前发及眼睛必须透明');
       const result=copyPart(src,sh,th,frame.width,frame.height,part===0);
       copies[part].frameData[key]={width:frame.width,height:frame.height,dataURL:'data:image/png;base64,'+png.encode(frame.width,frame.height,result.data).toString('base64')};
       if(!(action.direction==='up'&&part!==0))assert(bounds({width:frame.width,height:frame.height,data:result.data}),'不能复制空部件');
       records.push({key,part:sourceLayers[part].name,sourceKey,dx:result.dx,dy:result.dy,verticalFit:result.verticalFit,edgeRows:result.edgeRows});
     }
   }
   rearLayers.push(copies[0]);upperLayers.push(copies[1],copies[2]);
 }
 p.layers=[...rearLayers,...p.layers,...upperLayers];
 for(let i=rearLayers.length;i<rearLayers.length+before.layers.length;i++)if(p.layers[i].parent!=null)p.layers[i].parent+=rearLayers.length;
 p.currentLayerIndex+=rearLayers.length;
 const restore=structuredClone(p);restore.layers=restore.layers.slice(rearLayers.length,rearLayers.length+before.layers.length);restore.currentLayerIndex-=rearLayers.length;
 for(const l of restore.layers)if(l.parent!=null)l.parent-=rearLayers.length;for(const i of hidden)restore.layers[i].visible=before.layers[i].visible;
 assert.deepEqual(restore,before,'只允许增加当前套装部件、隐藏目标旧眼层和修正索引');
 fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(restore));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json','utf8')),before);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 let checked=0;const layout=[];
 for(const si of [idle,...targets]){
   const sheet=p.spriteSheets[si],cols=Math.max(...sheet.actions.map(a=>a.frames.length)),cell=160,cv=createCanvas(cols*cell,sheet.actions.length*cell*2),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;
   const model=models[1],cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
   const anim=new PE.AnimationPlayer();anim.previewScale=1;anim.init(document.createElement('canvas'),model,cm);
   for(let ai=0;ai<sheet.actions.length;ai++)for(let fi=0;fi<sheet.actions[ai].frames.length;fi++){
     model.currentSheetIndex=si;model.currentActionIndex=ai;model.currentFrameIndex=fi;
     const frame=sheet.actions[ai].frames[fi],im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));
     cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,frame.width,frame.height).data,im.data);
     anim.sheetIndex=si;anim.actionIndex=ai;anim.currentFrame=fi;anim._renderPreviewFrame();assert.deepEqual(anim.ctx.getImageData(0,0,frame.width,frame.height).data,im.data);
     const encoded=Buffer.from(await(await ex.exportFrameAsBlob(si,ai,fi)).arrayBuffer());assert.deepEqual(Array.from(png.decode(encoded).data),Array.from(im.data));
     if(si===idle)assert.deepEqual(im.data,new PE.CanvasManager(document.createElement('canvas'),models[0]).getCompositeImageData(si,ai,fi).data,'已认可待机不能改变');
     else{
       const order=PE.getRenderLayers(model,si,ai),rear=model.layers.find(l=>l.sheetIndex===si&&l.name===sourceLayers[0].name),body=order.find(l=>l.sheetIndex===si&&l.name==='body'&&l.getFrameData(`${si}_${ai}_${fi}`));assert(body);
       assert(sheet.actions[ai].direction==='up'?order.indexOf(rear)>order.indexOf(body):order.indexOf(rear)<order.indexOf(body),'后发方向遮挡错误');
     }
     const tile=createCanvas(frame.width,frame.height);tile.getContext('2d').putImageData(im,0,0);
     for(let bg=0;bg<2;bg++){const y=(ai+bg*sheet.actions.length)*cell;cx.fillStyle=bg?'#302d39':'#e3dfe8';cx.fillRect(fi*cell,y,cell,cell);cx.drawImage(tile,fi*cell,y,cell,cell);}
     fs.writeFileSync(out+`/frame-${si}-${ai}-${fi}.png`,encoded);checked++;
   }
   fs.writeFileSync(out+`/action-${si}.png`,cv.toBuffer('image/png'));layout.push({si,name:sheet.name,cols,rows:sheet.actions.length});
 }
 const beforeCv=createCanvas(640,targets.length*160),bc=beforeCv.getContext('2d');bc.imageSmoothingEnabled=false;
 for(let row=0;row<targets.length;row++){const si=targets[row];for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++){const im=new PE.CanvasManager(document.createElement('canvas'),models[0]).getCompositeImageData(si,ai,0),tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);bc.fillStyle='#e3dfe8';bc.fillRect(ai*160,row*160,160,160);bc.drawImage(tile,ai*160,row*160,160,160);}}
 fs.writeFileSync(out+'/before-poses.png',beforeCv.toBuffer('image/png'));fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 fs.writeFileSync(out+'/copy-map.json',JSON.stringify(records,null,2));fs.writeFileSync(out+'/layout.json',JSON.stringify(layout,null,2));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:crypto.createHash('sha256').update(raw).digest('hex'),targetSheets:targets,newLayers:rearLayers.length+upperLayers.length,newPartCels:records.length,targetFrames:records.length/3,hiddenOldEyeLayers:hidden,bodyHeadHandPixelsUnchanged:true,allIdleDataUnchangedExceptIndexShift:true,originalBackupSheetsUnchanged:true,allSheetSizesAndDurationsUnchanged:true,checkedFrames:checked,mainPreviewPNGMatch:true,restoreExtraCopyVerified:true,verticalFitCels:records.filter(r=>r.verticalFit).length,horizontalFitRows:records.reduce((s,r)=>s+r.edgeRows,0),browserChecked:false},null,2));
 console.log('PASS build: '+records.length/3+' frames in walk/pickup/sit/sleep, '+records.length+' part cels; body/head/hand and original backups unchanged; '+checked+' frames main/preview/PNG match.');
})().catch(e=>{console.error(e);process.exitCode=1});
