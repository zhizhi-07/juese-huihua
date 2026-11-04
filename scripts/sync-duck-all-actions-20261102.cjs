const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(root+'/自检记录/duck-all-actions-path.txt','utf8')),before=JSON.parse(fs.readFileSync(out+'/original.json')),meta=JSON.parse(fs.readFileSync(out+'/source.json'));
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(root+'/js/'+n+'.js','utf8'));
const load=async data=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
function bounds(im){const pts=[];for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3])pts.push([x,y]);if(!pts.length)return null;return {x:Math.min(...pts.map(p=>p[0])),y:Math.min(...pts.map(p=>p[1])),r:Math.max(...pts.map(p=>p[0])),b:Math.max(...pts.map(p=>p[1]))};}
function image(model,name,si,ai,fi){const key=`${si}_${ai}_${fi}`,l=model.layers.find(l=>l.sheetIndex===si&&l.name===name&&l.getFrameData(key));if(!l)return null;const f=model.spriteSheets[si].actions[ai].frames[fi],c=createCanvas(f.width,f.height);PE.utils.drawImageData(c.getContext('2d'),l.getFrameData(key),0,0,1);return c.getContext('2d').getImageData(0,0,f.width,f.height);}
async function contact(data,label){const model=await load(data),cm=new PE.CanvasManager(document.createElement('canvas'),model),c=createCanvas(8*128,13*154),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;let row=0;const metrics=[];
for(const si of [8,7,9,10,11])for(let ai=0;ai<model.spriteSheets[si].actions.length;ai++,row++){
 for(let fi=0;fi<model.spriteSheets[si].actions[ai].frames.length;fi++){
 const im=cm.getCompositeImageData(si,ai,fi,true,1),t=createCanvas(im.width,im.height);assert(bounds(im));t.getContext('2d').putImageData(im,0,0);ctx.fillStyle='#e3dfe8';ctx.fillRect(fi*128,row*154,128,154);ctx.drawImage(t,fi*128,row*154,128,128);ctx.fillStyle='#222';ctx.font='12px sans-serif';ctx.fillText(`${si}/${ai}/${fi}`,fi*128+4,row*154+143);metrics.push({si,ai,fi,body:bounds(image(model,'body',si,ai,fi)||image(model,'body',si,ai,0)),head:bounds(image(model,'head',si,ai,fi))});
 }
}
fs.writeFileSync(out+'/'+label+'.png',c.toBuffer('image/png'));fs.writeFileSync(out+'/pose-metrics.json',JSON.stringify(metrics,null,2));console.log(metrics.filter(m=>m.fi===0));return model;}
async function verify(data){
 const model=await load(data),cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
 const studio=fs.readFileSync(root+'/js/studio.js','utf8'),a=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),b=studio.indexOf('  const originalSetTool=',a);
 const app={project:model,canvasManager:cm,animationPlayer:new PE.AnimationPlayer()};app.animationPlayer.canvas=createCanvas(144,144);
 new Function('app','bounds',studio.slice(a,b))(app,im=>{const v=bounds(im);return v&&{...v,w:v.r-v.x+1,h:v.b-v.y+1};});
 let checked=0;
 for(const si of [7,8,9,10,11])for(let ai=0;ai<model.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<model.spriteSheets[si].actions[ai].frames.length;fi++){
  model.currentSheetIndex=si;model.currentActionIndex=ai;model.currentFrameIndex=fi;const im=cm.getCompositeImageData(si,ai,fi,true,1);assert(bounds(im));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,im.width,im.height).data,im.data,'主画布');
  const exported=png.decode(Buffer.from(await(await ex.exportFrameAsBlob(si,ai,fi)).arrayBuffer()));assert.deepEqual(Array.from(exported.data),Array.from(im.data),'PNG导出');
  Object.assign(app.animationPlayer,{sheetIndex:si,actionIndex:ai,currentFrame:fi});app.animationPlayer._renderPreviewFrame(false);assert(bounds(app.animationPlayer.canvas.getContext('2d').getImageData(0,0,144,144)),'动画预览');checked++;
 }
 return checked;
}
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id='+meta.id;
 if(process.argv[2]==='publish'){
  const p=JSON.parse(fs.readFileSync(out+'/candidate.json')),current=await fetch(url);assert(current.ok);assert.deepEqual(await current.json(),before,'工程有新保存，停止覆盖');
  const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(p)}),raw=await r.text();fs.writeFileSync(out+'/save-response.txt',r.status+'\n'+raw);assert(r.ok,raw);
  const back=await fetch(url);assert(back.ok);const text=await back.text();assert.deepEqual(JSON.parse(text),p);fs.writeFileSync(out+'/api-readback.json',text);assert.equal(await verify(JSON.parse(text)),70);console.log('PASS: saved with ETag, API readback and all 70 render/export/preview checks.');return;
 }
 const base=await load(before),p=structuredClone(before),source=before.layers.find(l=>l.name==='服装 / 衣服-小黄鸭'),added=[],records=[];
 assert(source&&Object.keys(source.frameData).length===12);await contact(before,'before');assert.equal(await verify(before),70);
 for(const si of [7,9,10,11]){
  const l={...structuredClone(source),sheetIndex:si,parent:null,depth:0,frameData:{}};added.push(l);
  const sheet=p.spriteSheets[si];
  for(let ai=0;ai<sheet.actions.length;ai++)for(let fi=0;fi<sheet.actions[ai].frames.length;fi++){
   const dir=sheet.actions[ai].direction,sa=before.spriteSheets[8].actions.findIndex(a=>a.direction===dir),head=bounds(image(base,'head',si,ai,fi)),body=image(base,'body',si,ai,fi),bb=body&&bounds(body),first=body&&bounds(image(base,'body',si,ai,0));
   const sf=(bb&&first&&bb.y-first.y>=2?2:0)+fi%2,src=decode(source.frameData[`8_${sa}_${sf}`]),sb=bounds(image(base,'body',8,sa,sf)),sh=bounds(image(base,'head',8,sa,sf)),dx=Math.round((head.x+head.r-sh.x-sh.r)/2),top=bb?.y??head.b,floor=bb?.b??31,frame=sheet.actions[ai].frames[fi],dst=new Uint8Array(frame.width*frame.height*4);
   const put=(x,y,c)=>{if(x>=0&&x<frame.width&&y>=0&&y<frame.height)dst.set(c,(y*frame.width+x)*4);};
   const pixel=(x,y)=>src.data.subarray((y*src.width+x)*4,(y*src.width+x)*4+4);
   // Keep the approved collar pixels, resizing only the lower garment to each pose's floor.
   for(let y=Math.max(0,top-2);y<=floor;y++)for(let x=0;x<frame.width;x++){
    const sx=x-dx;if(sx<0||sx>=src.width)continue;
    let sy;
    if(y<top+2)sy=sb.y+y-top;
    else sy=sb.y+2+Math.round((y-top-2)*(33-sb.y-2)/Math.max(1,floor-top-2));
    sy=Math.min(33,sy);if(sy<0)continue;
    if(si===7&&y>=top+4&&!body.data[(y*frame.width+x)*4+3])continue;
    if(si===10&&ai===1&&y>=28){
     const i=(y*frame.width+x)*4,c=body.data.subarray(i,i+4);if(!c[3])continue;
     const edge=c[0]===70&&c[1]===70;put(x,y,edge?c:[236,236,236,255]);continue;
    }
    put(x,y,pixel(sx,sy));
   }
   assert(bounds({width:frame.width,height:frame.height,data:dst}),`衣服空白 ${si}/${ai}/${fi}`);
   for(let i=3;i<dst.length;i+=4)assert(dst[i]===0||dst[i]===255);
   const key=`${si}_${ai}_${fi}`;l.frameData[key]={width:frame.width,height:frame.height,dataURL:'data:image/png;base64,'+png.encode(frame.width,frame.height,dst).toString('base64')};
   records.push({key,source:`8_${sa}_${sf}`,dx,top,floor,existingBodyBlank:!bb});
  }
 }
 const original=p.layers.slice(),near=original.filter((l,i)=>[7,9,10,11].includes(l.sheetIndex)&&l.name==='hand'&&i!==4&&Object.keys(l.frameData).length),anchor=original.find(l=>l.name==='服装 / 衣服-小黄鸭');
 p.layers=[];for(const l of original){if(l===anchor)p.layers.push(...added,...near);if(!near.includes(l))p.layers.push(l);}
 const mapping=original.map(l=>p.layers.indexOf(l));for(const l of original)if(l.parent!=null)l.parent=mapping[l.parent];p.currentLayerIndex=mapping[before.currentLayerIndex];
 for(let i=0;i<original.length;i++){const e=structuredClone(before.layers[i]);if(e.parent!=null)e.parent=mapping[e.parent];assert.deepEqual(p.layers[mapping[i]],e,'原图层所有像素及元数据不变');}
 assert.deepEqual(p.spriteSheets,before.spriteSheets);assert.equal(records.length,58);
 const restored=structuredClone(p);restored.layers=original.map((_,i)=>({...structuredClone(p.layers[mapping[i]]),parent:before.layers[i].parent}));restored.currentLayerIndex=before.currentLayerIndex;assert.deepEqual(restored,before);fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
 await contact(p,'after');assert.equal(await verify(p),70);
 for(const [variant,bg]of [['light','#e3dfe8'],['dark','#302d39']]){
  const model=await load(p),cm=new PE.CanvasManager(document.createElement('canvas'),model),c=createCanvas(8*160,13*160),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;let row=0;
  for(const si of [8,7,9,10,11])for(let ai=0;ai<model.spriteSheets[si].actions.length;ai++,row++)for(let fi=0;fi<model.spriteSheets[si].actions[ai].frames.length;fi++){
   const im=cm.getCompositeImageData(si,ai,fi,true,1),tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);ctx.fillStyle=bg;ctx.fillRect(fi*160,row*160,160,160);ctx.drawImage(tile,fi*160,row*160,128,128);ctx.drawImage(tile,fi*160+120,row*160+120,im.width,im.height);
  }
  fs.writeFileSync(out+'/'+variant+'.png',c.toBuffer('image/png'));
 }
 const unclothed=structuredClone(p);for(const l of unclothed.layers)if(/前发|后发/.test(l.name))l.visible=false;await contact(unclothed,'without-hair');
 const garment=structuredClone(p);for(const l of garment.layers)if(l.name!=='服装 / 衣服-小黄鸭')l.visible=false;await contact(garment,'garment-only');
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/changes.json',JSON.stringify({addedLayers:added.map(l=>({si:l.sheetIndex,frames:Object.keys(l.frameData).length})),movedNearHands:near.map(l=>original.indexOf(l)),oldToNewLayerIndex:mapping,records},null,2));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({sourceSHA256:meta.sha256,originalLayerCount:before.layers.length,addedOutfitLayers:4,newOutfitFrames:58,unchangedIdleFrames:12,allOriginalPixelsAndMetadataPreserved:true,unchangedFrameSizesCountsDurations:true,mainCanvasExportStudioPreviewChecked:70,restoreExtraCopyExact:true,existingSitSideBodyBlank:true,browserChecked:false},null,2));
 fs.writeFileSync(out+'/恢复说明.txt','原始完整工程：original.json。只撤销本次操作可依据 changes.json 的 oldToNewLayerIndex 取回所有原层、恢复原 parent 与 currentLayerIndex，并移除四个新衣服层；额外副本 restore-extra-copy.json 已验证与原稿完全一致。恢复到在线工程仍须先 GET 并比较后续修改，再以当前 ETag 条件 PUT，禁止直接覆盖用户后续修改。');
 console.log('PASS: 58 outfit cels added; 12 idle cels and every original pixel preserved.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});

