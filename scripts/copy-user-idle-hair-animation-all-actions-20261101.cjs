const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'备份/20261101-补同步全部动作头发动画-56620e79'),url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before),changed=[],records=[];
const dec=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
function box(d){let x0=d.width,y0=d.height,x1=-1,y1=-1;for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++)if(d.data[(y*d.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return x1<0?null:{x0,y0,x1,y1,cx:(x0+x1)/2};}
function world(f){const d=dec(f),r=f.placement||{x:0,y:0,w:d.width,h:d.height};assert.equal(r.w,d.width);assert.equal(r.h,d.height);const data=Buffer.alloc(36*36*4);for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){const i=(y*d.width+x)*4;if(!d.data[i+3])continue;const xx=x+r.x,yy=y+r.y;assert(xx>=0&&xx<36&&yy>=0&&yy<36);data.set(d.data.subarray(i,i+4),(yy*36+xx)*4);}return {width:36,height:36,data};}
function head(si,ai,fi){const key=`${si}_${ai}_${fi}`,l=p.layers.find(l=>l.sheetIndex===si&&l.name==='head'&&l.frameData[key]);assert(l);return box(dec(l.frameData[key]));}
(async()=>{
 const mode=process.argv[2]||'build';
 if(mode==='publish'||mode==='restore'){
   const candidate=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8')),r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),mode==='publish'?before:candidate,'已有新保存，禁止覆盖');
   const target=mode==='publish'?candidate:before,put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':mode==='publish'?fs.readFileSync(out+'/etag.txt','utf8').trim():r.headers.get('etag')},body:JSON.stringify(target)}),result=await put.text();assert(put.ok,`${put.status} ${result}`);
   const check=await fetch(url);assert(check.ok);const back=await check.text();assert.deepEqual(JSON.parse(back),target);fs.writeFileSync(out+'/'+mode+'-readback.json',back);fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({status:put.status,result,etag:check.headers.get('etag'),sha256:crypto.createHash('sha256').update(back).digest('hex'),apiReadback:true},null,2));console.log('PASS '+mode+': version checked save; exact API readback');return;
 }
 assert.equal(mode,'build');assert.equal(p.layers[10].name,'头发 / 用户 / 后发');assert.equal(p.layers[191].name,'前发');
 let geometryChanged=0;
 for(const si of [7,9,10,11])for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++){
   const action=p.spriteSheets[si].actions[ai],sai=p.spriteSheets[8].actions.findIndex(a=>a.direction===action.direction);assert(sai>=0);
   const targetHead0=head(si,ai,0),sourceHead0=head(8,sai,0);
   // Walk starts one pose later than idle (up/down/down/up). Keep the four-cel hair cycle in phase with it.
   const phases=si===7?[1,2,3,0]:[0,1,2,3];
   for(const slot of ['rear','front']){
     const sourceLi=slot==='rear'?10:191,li=p.layers.findIndex(l=>l.sheetIndex===si&&(slot==='rear'?l.name.endsWith('后发'):l.name==='前发'));assert(li>=0);
     const source0=world(p.layers[sourceLi].frameData[`8_${sai}_0`]),source0Box=box(source0),target0Box=box(dec(p.layers[li].frameData[`${si}_${ai}_0`]));
     const baseDx=source0Box&&target0Box?Math.round(target0Box.cx-source0Box.cx):0;
     for(let fi=0;fi<action.frames.length;fi++){
       const sf=phases[fi%4],key=`${si}_${ai}_${fi}`,f=p.layers[li].frameData[key],old=dec(f),frame=action.frames[fi],data=Buffer.alloc(frame.width*frame.height*4);
       assert(!f.placement);assert.equal(old.width,frame.width);assert.equal(old.height,frame.height);
       const sourceCell=p.layers[sourceLi].frameData[`8_${sai}_${sf}`]||p.layers[sourceLi].frameData[`8_${sai}_0`],source=world(sourceCell),sb=box(source),sh=head(8,sai,sf),th=head(si,ai,fi);
       const dx=baseDx+Math.round(th.cx-targetHead0.cx)-Math.round(sh.cx-sourceHead0.cx),dy=th.y0-sh.y0;
       let tail=null;
       if(sb){
         if(slot==='rear'){
           const baseTail=Math.min(frame.height-1,source0Box.y1+targetHead0.y0-sourceHead0.y0);
           tail=si===9?Math.min(frame.height-1,sb.y1+th.y0-sourceHead0.y0):baseTail+(sb.y1-source0Box.y1);
           const sj=sh.y0+12,tj=th.y0+12;assert(tail>tj&&tail<frame.height);
           for(let y=0;y<=tail;y++)for(let x=0;x<frame.width;x++){
             const sx=x-dx,sy=y<=tj?y-dy:sj+Math.round((y-tj)*(sb.y1-sj)/(tail-tj));
             if(sx<0||sx>=36||sy<0||sy>=36)continue;
             data.set(source.data.subarray((sy*36+sx)*4,(sy*36+sx)*4+4),(y*frame.width+x)*4);
           }
         }else{
           for(let y=0;y<36;y++)for(let x=0;x<36;x++){const i=(y*36+x)*4;if(!source.data[i+3])continue;const xx=x+dx,yy=y+dy;assert(xx>=0&&xx<frame.width&&yy>=0&&yy<frame.height,'前发不能裁切');data.set(source.data.subarray(i,i+4),(yy*frame.width+xx)*4);}
         }
         const b=box({width:frame.width,height:frame.height,data});assert(b);assert.equal(b.y0,th.y0,'发根跟随当前帧头顶');
       }else assert(slot==='front'&&action.direction==='up');
       let maskDiff=0,pixelDiff=0;for(let i=0;i<data.length;i+=4){if(data[i+3]!==old.data[i+3])maskDiff++;if(!data.subarray(i,i+4).equals(Buffer.from(old.data.subarray(i,i+4))))pixelDiff++;}
       if(pixelDiff){f.dataURL='data:image/png;base64,'+png.encode(frame.width,frame.height,data).toString('base64');changed.push({layer:li,key,pixelDiff,maskDiff});if(maskDiff)geometryChanged++;}
       records.push({slot,key,source:`8_${sai}_${sf}`,dx,dy,sourceTail:sb?.y1??null,targetTail:tail,maskDiff});
     }
   }
 }
 assert(geometryChanged>=20,'必须实际同步帧形状，而不只是修改色彩');
 for(const si of [7,9,10,11]){
   const rear=p.layers.find(l=>l.sheetIndex===si&&l.name.endsWith('后发'));
   for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++){
     const signatures=new Set(p.spriteSheets[si].actions[ai].frames.map((_,fi)=>{const d=dec(rear.frameData[`${si}_${ai}_${fi}`]);return crypto.createHash('sha256').update(d.data).digest('hex')}));assert(signatures.size>=2,'每个动作方向必须有实际头发动画');
   }
 }
 const restored=structuredClone(p);for(const {layer,key}of changed)restored.layers[layer].frameData[key]=before.layers[layer].frameData[key];assert.deepEqual(restored,before,'只允许同步头发帧');
 assert.deepEqual(p.spriteSheets,before.spriteSheets);assert.deepEqual(p.layers.filter(l=>l.sheetIndex===8),before.layers.filter(l=>l.sheetIndex===8),'获准待机源不得改动');
 fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json')),before);
 const {createCanvas,Image,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 let checked=0;
 for(const si of [7,8,9,10,11]){
   const s=p.spriteSheets[si],cols=Math.max(...s.actions.map(a=>a.frames.length)),cv=createCanvas(cols*144,s.actions.length*576),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;
   for(let state=0;state<2;state++){
     const model=models[state],cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
     for(let ai=0;ai<s.actions.length;ai++)for(let fi=0;fi<s.actions[ai].frames.length;fi++){
       model.currentSheetIndex=si;model.currentActionIndex=ai;model.currentFrameIndex=fi;
       const im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,im.width,im.height).data,im.data);
       player.sheetIndex=si;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,im.width,im.height).data,im.data);
       const blob=await ex.exportFrameAsBlob(si,ai,fi),buf=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(buf).data),Array.from(im.data));
       const tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);
       for(let bg=0;bg<2;bg++){const x=fi*144,y=(ai*4+bg*2+state)*144;cx.fillStyle=bg?'#302d39':'#ede7df';cx.fillRect(x,y,144,144);cx.drawImage(tile,x,y,108,108);cx.drawImage(tile,x+108,y+54);}
       fs.writeFileSync(out+`/${state?'new':'old'}-${si}-${ai}-${fi}.png`,buf);if(state===1)checked++;
       if(state===1&&s.actions[ai].direction==='up'){const l=model.layers.find(l=>l.sheetIndex===si&&l.name==='前发'),d=l.getFrameData(`${si}_${ai}_${fi}`);assert(!d||d.data.every((v,i)=>i%4!==3||!v));}
     }
   }
   fs.writeFileSync(out+`/comparison-${si}.png`,cv.toBuffer('image/png'));
 }
 assert.equal(checked,70);
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:crypto.createHash('sha256').update(raw).digest('hex'),changed,records,changedCels:changed.length,celsWithActualSilhouetteChanges:geometryChanged,all70FramesMainPreviewPNGMatch:true,bodyEyesHandsAndAllNonHairDataUnchanged:true,approvedIdleAllCelsUnchanged:true,idleLoopMs:400,allTimingsAndFrameCountsUnchanged:true,originalArchiveSheetsUnchanged:true,allHairRootsAlignedWithHeads:true,backFrontHairTransparent:true,restoreExtraCopyVerified:true,browserChecked:false},null,2));
 console.log(`PASS build: ${changed.length} hair cels copied from idle animation; ${geometryChanged} cels have actual silhouette changes, not just color. All 70 frame render/preview/PNG paths match; idle 400ms and all non-hair data preserved.`);
})().catch(e=>{console.error(e);process.exitCode=1});
