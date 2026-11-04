const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/hair-all-actions-path.txt'),'utf8')),meta=JSON.parse(fs.readFileSync(out+'/source.json')),before=JSON.parse(fs.readFileSync(out+'/original.json')),p=structuredClone(before),sheets=['original32_walk','original32_pickup','original32_sit','original32_sleep'];
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const load=async data=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
function box(im){const pts=[];for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3])pts.push([x,y]);return pts.length?{x0:Math.min(...pts.map(p=>p[0])),y0:Math.min(...pts.map(p=>p[1])),x1:Math.max(...pts.map(p=>p[0])),y1:Math.max(...pts.map(p=>p[1])),cx:(Math.min(...pts.map(p=>p[0]))+Math.max(...pts.map(p=>p[0])))/2}:null;}
function world(model,li,si,ai,fi){const f=model.spriteSheets[si].actions[ai].frames[fi],c=createCanvas(f.width,f.height),d=model.layers[li].getFrameData(`${si}_${ai}_${fi}`);if(d)PE.utils.drawImageData(c.getContext('2d'),d);return c.getContext('2d').getImageData(0,0,f.width,f.height);}
function find(model,si,ai,name){return model.layers.findIndex(l=>l.sheetIndex===si&&l.name===name&&l.getFrameData(`${si}_${ai}_0`));}
async function render(data,label){
 const model=await load(data),cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;let count=0;
 for(const si of [7,8,9,10,11]){
  const s=model.spriteSheets[si],cols=Math.max(...s.actions.map(a=>a.frames.length)),cv=createCanvas(cols*160,s.actions.length*2*160),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;
  for(let ai=0;ai<s.actions.length;ai++)for(let fi=0;fi<s.actions[ai].frames.length;fi++){
   model.currentSheetIndex=si;model.currentActionIndex=ai;model.currentFrameIndex=fi;const im=cm.getCompositeImageData(si,ai,fi);assert(box(im),'主体不能空白');cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,im.width,im.height).data,im.data);player.sheetIndex=si;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,im.width,im.height).data,im.data);const blob=await ex.exportFrameAsBlob(si,ai,fi),b=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(b).data),Array.from(im.data));fs.writeFileSync(out+`/${label}-${si}-${ai}-${fi}.png`,b);count++;
   const tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);for(let bg=0;bg<2;bg++){const x=fi*160,y=(ai*2+bg)*160;cx.fillStyle=bg?'#302d39':'#e3dfe8';cx.fillRect(x,y,160,160);cx.drawImage(tile,x,y,120,120);cx.drawImage(tile,x+120,y+110);}
   if(s.actions[ai].direction==='up'){const li=find(model,si,ai,'前发'),d=world(model,li,si,ai,fi);assert.equal(box(d),null);model.layers[li].visible=false;assert.deepEqual(cm.getCompositeImageData(si,ai,fi).data,im.data);model.layers[li].visible=true;}
  }
  fs.writeFileSync(out+`/${label}-contact-${si}.png`,cv.toBuffer('image/png'));
 }
 assert.equal(count,70);return model;
}
(async()=>{
 const mode=process.argv[2]||'build',url='http://127.0.0.1:8765/api/project?id='+meta.id;
 if(mode==='publish'){
  const candidate=JSON.parse(fs.readFileSync(out+'/candidate.json')),r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),before,'已有新保存，不能覆盖');const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(candidate)});const text=await put.text();fs.writeFileSync(out+'/save-response.txt',put.status+'\n'+text);assert(put.ok,text);const back=await fetch(url);assert(back.ok);const raw=await back.text();assert.deepEqual(JSON.parse(raw),candidate);fs.writeFileSync(out+'/api-readback.json',raw);fs.writeFileSync(out+'/publish-verification.json',JSON.stringify({apiReadback:true,etag:back.headers.get('etag'),sha256:crypto.createHash('sha256').update(raw).digest('hex')},null,2));console.log('PASS publish: ETag checked; exact real API readback.');return;
 }
 const base=await load(before),idle=before.spriteSheets.findIndex(s=>s.name==='original32_idle'),changes=[],records=[];assert.equal(before.spriteSheets[idle].actions[0].frames.length,4);
 for(const name of sheets){
  const si=before.spriteSheets.findIndex(s=>s.name===name),s=before.spriteSheets[si];assert(si>=0);
  for(let ai=0;ai<s.actions.length;ai++){
   const action=s.actions[ai],sai=before.spriteSheets[idle].actions.findIndex(a=>a.direction===action.direction);assert(sai>=0);const headLI=find(base,si,ai,'head'),sourceHeadLI=find(base,idle,sai,'head'),head0=box(world(base,headLI,si,ai,0)),sourceHead0=box(world(base,sourceHeadLI,idle,sai,0));assert(head0&&sourceHead0);
   const heads=action.frames.map((_,fi)=>box(world(base,headLI,si,ai,fi)));
   for(const slot of ['rear','front']){
    const sourceLI=find(base,idle,sai,slot==='rear'?'头发 / 用户 / 后发':'前发'),li=find(base,si,ai,slot==='rear'?'头发 / 用户 / 后发':'前发');assert(sourceLI>=0&&li>=0);
    const source0=world(base,sourceLI,idle,sai,0),sourceBox=box(source0),targetBox=box(world(base,li,si,ai,0)),baseDX=sourceBox&&targetBox?Math.round(targetBox.cx-sourceBox.cx):0;
    for(let fi=0;fi<action.frames.length;fi++){
     const th=heads[fi],prev=heads[Math.max(0,fi-1)],velocity=th.y0-prev.y0,prevV=fi>1?heads[fi-1].y0-heads[fi-2].y0:0;let phase;
     if(name==='original32_walk')phase=[1,2,3,0][fi%4];
     else if(name==='original32_pickup')phase=fi===0||action.frames[fi].duration>=300?0:velocity>0?2:velocity<0?3:prevV>0?3:0;
     else phase=fi;
     const sourcePhase=name==='original32_sleep'&&slot==='rear'?0:phase,key=`${si}_${ai}_${fi}`,src=world(base,sourceLI,idle,sai,sourcePhase),sb=box(src),sh=box(world(base,sourceHeadLI,idle,sai,sourcePhase)),f=action.frames[fi],data=new Uint8Array(f.width*f.height*4),old=world(base,li,si,ai,fi);
     const dx=baseDX+Math.round(th.cx-head0.cx)-Math.round(sh.cx-sourceHead0.cx),dy=th.y0-sh.y0;let tail=null,protectedEyes=0;
     if(sb){
      if(slot==='rear'){
       if(name==='original32_walk')tail=targetBox.y1+([0,0,1,1][fi%4]);
       else if(name==='original32_pickup')tail=targetBox.y1+(th.y0-head0.y0)+(velocity>0?-1:velocity<0?1:0);
       else if(name==='original32_sit')tail=targetBox.y1+(fi===2?-1:0);
       else tail=targetBox.y1+(fi===3?1:0);
       tail=Math.min(f.height-1,tail);const sj=sh.y0+12,tj=th.y0+12;assert(tail>tj,'后发连接段须留有长度');
       for(let y=0;y<=tail;y++)for(let x=0;x<f.width;x++){
        const sx=x-dx,sy=y<=tj?y-dy:sj+Math.round((y-tj)*(sb.y1-sj)/(tail-tj));if(sx<0||sx>=src.width||sy<0||sy>=src.height)continue;data.set(src.data.subarray((sy*src.width+sx)*4,(sy*src.width+sx)*4+4),(y*f.width+x)*4);
       }
      }else{
       for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){const i=(y*src.width+x)*4;if(!src.data[i+3])continue;const xx=x+dx,yy=y+dy;assert(xx>=0&&xx<f.width&&yy>=0&&yy<f.height,'前发不能裁切');data.set(src.data.subarray(i,i+4),(yy*f.width+xx)*4);}
       for(let eyeLI=0;eyeLI<base.layers.length;eyeLI++)if(base.layers[eyeLI].visible&&/眼睛/.test(base.layers[eyeLI].name)&&base.layers[eyeLI].getFrameData(key)){
        const eyes=world(base,eyeLI,si,ai,fi);for(let i=0;i<data.length;i+=4)if(eyes.data[i+3]&&!old.data[i+3]&&data[i+3]){data.fill(0,i,i+4);protectedEyes++;}
       }
      }
      const b=box({width:f.width,height:f.height,data});assert(b);assert.equal(b.y0,th.y0,'根部必须与当前头顶对齐');
     }else assert(slot==='front'&&action.direction==='up');
     let pixels=0,mask=0;for(let i=0;i<data.length;i+=4){assert(data[i+3]===0||data[i+3]===255);if(data[i+3]!==old.data[i+3])mask++;if(!Buffer.from(data.subarray(i,i+4)).equals(Buffer.from(old.data.subarray(i,i+4))))pixels++;}
     if(pixels){p.layers[li].frameData[key]={width:f.width,height:f.height,dataURL:'data:image/png;base64,'+png.encode(f.width,f.height,data).toString('base64')};changes.push({layer:li,key,pixels,mask});}
     records.push({sheet:name,si,direction:action.direction,fi,slot,phase:sourcePhase,head:th,dx,dy,tail,protectedEyePixels:protectedEyes});
    }
   }
  }
 }
 const recovery=structuredClone(p);for(const {layer,key}of changes)recovery.layers[layer].frameData[key]=structuredClone(before.layers[layer].frameData[key]);assert.deepEqual(recovery,before,'只能修改授权的四种动作前后发帧');assert.deepEqual(p.spriteSheets,before.spriteSheets,'帧数、时长、尺寸全部保留');assert.deepEqual(p.layers[10],before.layers[10]);assert.deepEqual(p.layers[191],before.layers[191]);
 fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
 await render(before,'old');await render(p,'new');fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/frame-diff.json',JSON.stringify(changes,null,2));fs.writeFileSync(out+'/action-placement-records.json',JSON.stringify(records,null,2));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({sourceSHA256:meta.sha256,changedCels:changes.length,celsWithShapeChanges:changes.filter(c=>c.mask).length,all140BeforeAfterMainPreviewPNGMatch:true,approvedIdleUnchanged:true,allNonHairAndArchiveDataUnchanged:true,allFrameCountsDurationsSizesUnchanged:true,backFrontHairTransparent:true,allHairRootsAligned:true,restoreExtraCopyVerified:true,browserChecked:false},null,2));console.log('PASS build: '+changes.length+' other-action hair cels updated, '+changes.filter(c=>c.mask).length+' actual silhouette changes; 140 before/after main/preview/PNG paths match; idle, non-hair, timing and archive data protected.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
