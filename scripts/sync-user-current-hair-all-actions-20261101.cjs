const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'备份/20261101-当前头发同步全部工作动作-56620e79'),url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before),changed=[];
const trial=JSON.parse(fs.readFileSync(path.join(root,'备份/20261101-待机跟随节奏正面试播-56620e79/candidate-front-only-040.json'),'utf8'));
const dec=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64')),hex=(d,i)=>Buffer.from(d.subarray(i,i+3)).toString('hex');
const outlines=new Set(['2f3b3d','46465e']);
function box(im){let x0=im.width,y0=im.height,x1=-1,y1=-1;for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}return x1<0?null:{x0,y0,x1,y1,w:x1-x0+1,h:y1-y0+1};}
function fillColor(im,x,y){
 const xx=Math.max(0,Math.min(im.width-1,x)),yy=Math.max(0,Math.min(im.height-1,y)),i=(yy*im.width+xx)*4;
 if(im.data[i+3]&&!outlines.has(hex(im.data,i)))return im.data.subarray(i,i+3);
 let best=null,dist=Infinity;
 for(let y0=0;y0<im.height;y0++)for(let x0=0;x0<im.width;x0++){const j=(y0*im.width+x0)*4;if(!im.data[j+3]||outlines.has(hex(im.data,j)))continue;const d=(x0-xx)**2+(y0-yy)**2;if(d<dist){dist=d;best=im.data.subarray(j,j+3);}}
 assert(best,'源发型必须有填色');return best;
}
(async()=>{
 const mode=process.argv[2]||'build';
 if(mode==='publish'||mode==='restore'){
   const candidate=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8')),r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),mode==='publish'?before:candidate,'已有新保存，停止覆盖');
   const target=mode==='publish'?candidate:before,put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':mode==='publish'?fs.readFileSync(out+'/etag.txt','utf8').trim():r.headers.get('etag')},body:JSON.stringify(target)}),result=await put.text();assert(put.ok,`${put.status} ${result}`);
   const check=await fetch(url);assert(check.ok);const text=await check.text();assert.deepEqual(JSON.parse(text),target);fs.writeFileSync(out+'/'+mode+'-readback.json',text);fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({status:put.status,result,etag:check.headers.get('etag'),sha256:crypto.createHash('sha256').update(text).digest('hex'),apiReadback:true},null,2));console.log('PASS '+mode+': ETag checked save and exact API readback');return;
 }
 assert.equal(mode,'build');assert.equal(p.layers[10].name,'头发 / 用户 / 后发');assert.equal(p.layers[191].name,'前发');
 // Merge only the approved front trial cels, never its whole-project snapshot.
 for(let fi=1;fi<4;fi++){const key=`8_1_${fi}`;p.layers[10].frameData[key]=structuredClone(trial.layers[10].frameData[key]);changed.push({layer:10,key,type:'approved front follow-through'});}
 assert.equal(p.spriteSheets[8].actions[1].frames.reduce((n,f)=>n+f.duration,0),400);
 let transferred=0;
 for(const si of [7,9,10,11]){
   const rear=p.layers.findIndex(l=>l.sheetIndex===si&&l.name.endsWith('后发')),front=p.layers.findIndex(l=>l.sheetIndex===si&&l.name==='前发');assert(rear>=0&&front>=0);
   for(let ai=0;ai<p.spriteSheets[si].actions.length;ai++){
     const direction=p.spriteSheets[si].actions[ai].direction,sourceAi=p.spriteSheets[8].actions.findIndex(a=>a.direction===direction);assert(sourceAi>=0);
     for(let fi=0;fi<p.spriteSheets[si].actions[ai].frames.length;fi++)for(const [li,sourceLi]of [[rear,10],[front,191]]){
       const key=`${si}_${ai}_${fi}`,f=p.layers[li].frameData[key];assert(f,'已有对应头发槽');
       const im=dec(f),targetBox=box(im);if(!targetBox){assert(li===front&&direction==='up');continue;}
       // Copy the shading layout onto each existing fitted cel; do not replace its pose, silhouette or placement.
       const sourceFi=Math.min(3,fi%4),source=p.layers[sourceLi].frameData[`8_${sourceAi}_${sourceFi}`]||p.layers[sourceLi].frameData[`8_${sourceAi}_0`],src=dec(source),sourceBox=box(src);assert(sourceBox);
       const old=Uint8Array.from(im.data);
       for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
         const i=(y*im.width+x)*4;if(!old[i+3])continue;const c=hex(old,i);
         if(outlines.has(c)||c==='777777')continue;
         const sx=sourceBox.x0+Math.round((x-targetBox.x0)*(sourceBox.w-1)/Math.max(1,targetBox.w-1)),sy=sourceBox.y0+Math.round((y-targetBox.y0)*(sourceBox.h-1)/Math.max(1,targetBox.h-1));
         im.data.set(fillColor(src,sx,sy),i);
       }
       for(let i=3;i<im.data.length;i+=4)assert.equal(im.data[i],old[i],'目标动作透明度/轮廓不变');
       if(!Buffer.from(im.data).equals(Buffer.from(old))){f.dataURL='data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');changed.push({layer:li,key,type:'copy idle shading onto existing pose',source:`8_${sourceAi}_${sourceFi}`});transferred++;}
     }
   }
 }
 assert(transferred>0);
 const restored=structuredClone(p);for(const {layer,key}of changed)restored.layers[layer].frameData[key]=before.layers[layer].frameData[key];assert.deepEqual(restored,before,'只修改头发帧，不改其他数据或时间');
 assert.deepEqual(p.spriteSheets,before.spriteSheets);assert.deepEqual(p.layers[191],before.layers[191]);
 for(let si=0;si<7;si++)assert.deepEqual(p.layers.filter(l=>l.sheetIndex===si),before.layers.filter(l=>l.sheetIndex===si));
 fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json')),before);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 let checked=0;
 const overview=createCanvas(720,600),oc=overview.getContext('2d');oc.imageSmoothingEnabled=false;oc.fillStyle='#ede7df';oc.fillRect(0,0,720,600);
 for(const si of [7,8,9,10,11]){
   const s=p.spriteSheets[si],cols=Math.max(...s.actions.map(a=>a.frames.length)),c=createCanvas(cols*144,s.actions.length*576),cx=c.getContext('2d');cx.imageSmoothingEnabled=false;
   for(let state=0;state<2;state++){
     const model=models[state],cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
     const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
     for(let ai=0;ai<s.actions.length;ai++)for(let fi=0;fi<s.actions[ai].frames.length;fi++){
       model.currentSheetIndex=si;model.currentActionIndex=ai;model.currentFrameIndex=fi;
       const im=cm.getCompositeImageData(si,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v),'非空主体');
       cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,im.width,im.height).data,im.data);
       player.sheetIndex=si;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,im.width,im.height).data,im.data);
       const blob=await ex.exportFrameAsBlob(si,ai,fi),buf=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(buf).data),Array.from(im.data));
       const tile=createCanvas(im.width,im.height);tile.getContext('2d').putImageData(im,0,0);
       for(let bg=0;bg<2;bg++){const x=fi*144,y=(ai*4+bg*2+state)*144;cx.fillStyle=bg?'#302d39':'#ede7df';cx.fillRect(x,y,144,144);cx.drawImage(tile,x,y,108,108);cx.drawImage(tile,x+108,y+54);}
       if(state===1){fs.writeFileSync(out+`/frame-${si}-${ai}-${fi}.png`,buf);checked++;
         if(fi<2){const col=ai*2+fi,row=si-7;oc.drawImage(tile,col*120,row*120,120,120);}
       }
       if(state===1&&s.actions[ai].direction==='up'){
         const li=model.layers.findIndex(l=>l.sheetIndex===si&&l.name==='前发');const f=model.layers[li].getFrameData(`${si}_${ai}_${fi}`);assert(!f||f.data.every((v,i)=>i%4!==3||!v));model.layers[li].visible=false;assert.deepEqual(cm.getCompositeImageData(si,ai,fi).data,im.data);model.layers[li].visible=true;
       }
     }
   }
   fs.writeFileSync(out+`/comparison-${si}.png`,c.toBuffer('image/png'));
 }
 assert.equal(checked,70);
 fs.writeFileSync(out+'/overview.png',overview.toBuffer('image/png'));fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:crypto.createHash('sha256').update(raw).digest('hex'),changed,changedCels:changed.length,all70WorkingFramesMainPreviewPNGMatch:true,allOtherLayersAndMetadataUnchanged:true,allOriginalArchiveSheetsUnchanged:true,idleLoopMs:400,allTimingsUnchanged:true,existingOtherActionAlphaMasksAndPlacementsUnchanged:true,approvedFrontTrialMergedOnlyAsThreeHairCels:true,backFrontHairTransparent:true,restoreExtraCopyVerified:true,browserChecked:false},null,2));
 console.log('PASS build: '+changed.length+' hair cels updated; all 70 working frames main/preview/PNG match; other pixels, alpha masks, timing, original archives and layer metadata preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
