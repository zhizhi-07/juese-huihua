const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(root+'/自检记录/duck-pose-adapt-path.txt','utf8')),before=JSON.parse(fs.readFileSync(out+'/original.json')),meta=JSON.parse(fs.readFileSync(out+'/source.json'));
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(root+'/js/'+n+'.js','utf8'));
const load=async p=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]))).project;
const bounds=im=>{let x=im.width,y=im.height,r=-1,b=-1;for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++)if(im.data[(yy*im.width+xx)*4+3]){x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy);}return r<0?null:{x,y,r,b,w:r-x+1,h:b-y+1};};
const get=(im,x,y)=>x>=0&&y>=0&&x<im.width&&y<im.height?Array.from(im.data.subarray((y*im.width+x)*4,(y*im.width+x)*4+4)):[0,0,0,0];
function image(model,name,si,ai,fi){const key=`${si}_${ai}_${fi}`,l=model.layers.find(l=>l.sheetIndex===si&&l.name===name&&l.getFrameData(key));const f=model.spriteSheets[si].actions[ai].frames[fi],c=createCanvas(f.width,f.height);if(l)PE.utils.drawImageData(c.getContext('2d'),l.getFrameData(key),0,0,1);return c.getContext('2d').getImageData(0,0,f.width,f.height);}
const edge=[70,70,94,255],yellow=[251,207,78,255],gold=[187,146,21,255],cream=[236,236,236,255],white=[255,255,255,255];
const isEdge=c=>c[3]&&c[0]<100,isShadow=c=>c[3]&&c[0]>=100&&c[0]<245;
async function verify(data,label){
 const model=await load(data),cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
 const studio=fs.readFileSync(root+'/js/studio.js','utf8'),a=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),b=studio.indexOf('  const originalSetTool=',a),app={project:model,canvasManager:cm,animationPlayer:new PE.AnimationPlayer()};app.animationPlayer.canvas=createCanvas(144,144);new Function('app','bounds',studio.slice(a,b))(app,bounds);
 let checked=0;
 for(const si of [7,8,9,10,11]){
  const s=model.spriteSheets[si],cols=Math.max(...s.actions.map(a=>a.frames.length)),sheet=createCanvas(cols*160,s.actions.length*160),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
  for(let ai=0;ai<s.actions.length;ai++)for(let fi=0;fi<s.actions[ai].frames.length;fi++){
   const im=cm.getCompositeImageData(si,ai,fi,true,1),tile=createCanvas(im.width,im.height);assert(bounds(im));tile.getContext('2d').putImageData(im,0,0);
   model.currentSheetIndex=si;model.currentActionIndex=ai;model.currentFrameIndex=fi;cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,im.width,im.height).data,im.data,'主画布');
   const exported=png.decode(Buffer.from(await(await ex.exportFrameAsBlob(si,ai,fi)).arrayBuffer()));assert.deepEqual(Array.from(exported.data),Array.from(im.data),'PNG导出');Object.assign(app.animationPlayer,{sheetIndex:si,actionIndex:ai,currentFrame:fi});app.animationPlayer._renderPreviewFrame(false);assert(bounds(app.animationPlayer.canvas.getContext('2d').getImageData(0,0,144,144)));
   ctx.fillStyle=ai%2?'#302d39':'#e3dfe8';ctx.fillRect(fi*160,ai*160,160,160);ctx.drawImage(tile,fi*160,ai*160,128,128);ctx.drawImage(tile,fi*160+120,ai*160+120,im.width,im.height);ctx.fillStyle=ai%2?'#eee':'#222';ctx.font='12px sans-serif';ctx.fillText(`${si}/${ai}/${fi}`,fi*160+3,ai*160+146);
   fs.writeFileSync(out+`/${label}-${si}-${ai}-${fi}.png`,tile.toBuffer('image/png'));checked++;
  }
  fs.writeFileSync(out+`/${label}-action-${si}.png`,sheet.toBuffer('image/png'));
 }
 return checked;
}
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id='+meta.id;
 if(process.argv[2]==='publish'){
  const p=JSON.parse(fs.readFileSync(out+'/candidate.json')),latest=await fetch(url);assert(latest.ok);assert.deepEqual(await latest.json(),before,'用户工程有新修改，停止覆盖');
  const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(p)}),raw=await r.text();fs.writeFileSync(out+'/save-response.txt',r.status+'\n'+raw);assert(r.ok,raw);
  const back=await fetch(url);assert(back.ok);const text=await back.text();assert.deepEqual(JSON.parse(text),p);fs.writeFileSync(out+'/api-readback.json',text);assert.equal(await verify(JSON.parse(text),'readback'),70);console.log('PASS PUT '+r.status+'; API readback exact; all 70 main-canvas/export/studio-preview paths checked.');return;
 }
 const p=structuredClone(before),base=await load(before),source=before.layers.find(l=>l.name==='服装 / 衣服-小黄鸭'&&l.sheetIndex===8),records=[],changed=[];assert(source);assert.equal(await verify(before,'before'),70);
 for(const si of [7,9,10,11]){
  const li=p.layers.findIndex(l=>l.name===source.name&&l.sheetIndex===si);assert(li>=0);changed.push(li);
  for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++)for(let fi=0;fi<p.spriteSheets[si].actions[ai].frames.length;fi++){
   const key=`${si}_${ai}_${fi}`,dir=p.spriteSheets[si].actions[ai].direction,sa=before.spriteSheets[8].actions.findIndex(a=>a.direction===dir),body=image(base,'body',si,ai,fi),bb=bounds(body),head=bounds(image(base,'head',si,ai,fi)),f=p.spriteSheets[si].actions[ai].frames[fi],dst={width:f.width,height:f.height,data:new Uint8Array(f.width*f.height*4)};
   const put=(x,y,c)=>{if(x>=0&&y>=0&&x<f.width&&y<f.height)dst.data.set(c,(y*f.width+x)*4);};
   if(si===10&&ai===0){
    const top=head.b,dy=top-24,src=image(base,source.name,8,sa,fi%2);
    // The current side body is erased: draw only seated fabric, without restoring or inventing body pixels.
    for(let y=top;y<=31;y++){
     const rel=y-top,left=rel<3?10:rel<5?11:12,right=rel<3?21:rel===3?23:rel===4?25:24;
     for(let x=left;x<=right;x++){
      let c;
      if(rel<3){const sx=11+Math.round((x-10)*13/11),sy=24+Math.round(rel*7/2);c=get(src,sx,sy);if(!c[3])c=yellow;if(x===left||x===right)c=edge;}
      else {c=cream;if(x===left||x===right||y===31)c=edge;else if(rel===3)c=gold;else if(x>=20&&x<=23&&y===30)c=[210,210,210,255];else if(x<19&&y===29)c=white;}
      put(x,y,c);
     }
    }
    records.push({key,type:'seated-side-folded-skirt',top,bodyNotRestored:true});
   }else{
    assert(bb);const rows=[];for(let y=bb.y;y<=bb.b;y++){let xs=[];for(let x=0;x<f.width;x++)if(get(body,x,y)[3])xs.push(x);if(xs.length>=10)rows.push({y,l:Math.min(...xs),r:Math.max(...xs)});}assert(rows.length);const top=rows[0].y,shoulder=rows.slice(0,2),cx=shoulder.reduce((s,r)=>s+(r.l+r.r)/2,0)/shoulder.length,sf=(bb.b-top+1<=8?2:0)+fi%2,src=image(base,source.name,8,sa,sf),sb=bounds(image(base,'body',8,sa,sf)),scx=(sb.x+sb.r)/2;
    let footL=-1,footR=-1;for(let y=Math.max(top,bb.b-5);y<=bb.b;y++)for(let x=0;x<f.width;x++){const c=get(body,x,y);if(!c[3]||isEdge(c))continue;if(x<cx)footL=Math.max(footL,y);else footR=Math.max(footR,y);}assert(footL>=0&&footR>=0);
    for(let y=top;y<=bb.b;y++)for(let x=0;x<f.width;x++){
     const raw=get(body,x,y);if(!raw[3])continue;const foot=x<cx?footL:footR,hem=foot-2,rr=rows.filter(r=>r.y<=y).at(-1),rowCx=y<top+3?(rr.l+rr.r)/2:cx,sx=Math.round(x-rowCx+scx);let c;
     if(si===10&&ai===1){
      if(y>=27){const outer=x===bb.x||x===bb.r||!get(body,x-1,y)[3]||!get(body,x+1,y)[3]||!get(body,x,y+1)[3];c=isEdge(raw)||outer?edge:isShadow(raw)?cream:white;}
      else {const sy=sb.y+y-top;c=get(src,sx,Math.min(31,sy));if(!c[3])c=yellow;if(y===26&&y-top>=2&&!isEdge(raw))c=gold;if(isEdge(raw)&&(x<cx-5||x>cx+5))c=edge;}
     }else if(si===10&&ai===2){
      const hemY=28;
      if(y>=hemY){const outer=!get(body,x-1,y)[3]||!get(body,x+1,y)[3]||!get(body,x,y+1)[3];c=outer?edge:y===hemY?gold:cream;}
      else {const sy=sb.y+Math.round((y-top)*(31-sb.y)/Math.max(1,hemY-1-top));c=get(src,sx,sy);if(!c[3])c=yellow;if(isEdge(raw)&&(x<cx-5||x>cx+5))c=edge;}
     }else if(isEdge(raw))c=raw;
     else if(y>=foot)c=isShadow(raw)?cream:white;
     else if(y===foot-1)c=isShadow(raw)?cream:white;
     else {
      const sy=y<=top+1?sb.y+y-top:sb.y+2+Math.round((y-top-2)*(31-sb.y-2)/Math.max(1,hem-top-2));c=get(src,sx,Math.min(31,sy));if(!c[3])c=yellow;
      if(y===hem)c=gold;
      if(y>=top+3&&isShadow(raw)&&c[0]===251)c=gold;
     }
     put(x,y,c);
    }
    records.push({key,type:si===10?(ai===1?'seated-two-soles':'seated-hip-not-shoes'):si===7?'walking-separated-leg-hems':si===9?'pickup-torso-shear-and-feet':'sleep-fixed-feet-breath',top,cx,footL,footR,source:`8_${sa}_${sf}`});
    if(si!==10)for(let y=top;y<f.height;y++)for(let x=0;x<f.width;x++)if(get(dst,x,y)[3])assert(get(body,x,y)[3],'衣服不得超出当前姿势身体轮廓');
   }
   assert(bounds(dst));for(let i=3;i<dst.data.length;i+=4)assert(dst.data[i]===0||dst.data[i]===255);
   const encoded={width:f.width,height:f.height,dataURL:'data:image/png;base64,'+png.encode(f.width,f.height,dst.data).toString('base64')};assert.notDeepEqual(encoded,before.layers[li].frameData[key],key+' 必须改变旧平移稿');p.layers[li].frameData[key]=encoded;
  }
 }
 const restored=structuredClone(p);for(const li of changed)restored.layers[li]=structuredClone(before.layers[li]);assert.deepEqual(restored,before,'除四个动作衣服层外全部不变');fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);assert.equal(records.length,58);assert(records.filter(r=>r.type==='walking-separated-leg-hems'&&r.footL!==r.footR).length>=8);
 assert.equal(await verify(p,'after'),70);
 const bare=structuredClone(p);for(const l of bare.layers)if(/前发|后发/.test(l.name))l.visible=false;assert.equal(await verify(bare,'without-hair'),70);
 const garment=structuredClone(p);for(const l of garment.layers)if(l.name!==source.name)l.visible=false;assert.equal(await verify(garment,'garment'),70);
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/changes.json',JSON.stringify({changedLayers:changed,records},null,2));fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:meta.sha256,changedLayers:changed,changedCels:58,idleAll12CelsExact:true,allOtherLayersAndMetadataExact:true,originalDimensionsAndDurationsExact:true,mainCanvasExportAndStudioPreviewChecks:70,restorationExtraCopyExact:true,sideSitBodyNotRestored:true,browserChecked:false},null,2));
 fs.writeFileSync(out+'/恢复说明.txt','只撤销本次动作适配：读取 changes.json 的 changedLayers，用 original.json 中相应衣服层恢复；restore-extra-copy.json 已在额外副本上验证与 original.json 完全一致。在线恢复仍须先 GET、比较后续用户修改并带当前 ETag 条件 PUT，不可盲目覆盖。');
 console.log('PASS: all 58 old pasted cels replaced with pose-dependent silhouettes, hems, shading and soles.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
