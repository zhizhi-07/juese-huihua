const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'备份/20261101-待机头发参考光影-56620e79');
const url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before),changed=[];
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const colors={outline:'332d2b',base:'796060',shadow:'644647',light:'eedbc1'};
const rgb=Object.fromEntries(Object.entries(colors).map(([k,c])=>[k,Buffer.from(c,'hex')]));
const mode=process.argv[2]||'build';
(async()=>{
 if(mode==='publish'||mode==='restore'){
   const candidate=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8'));
   const r=await fetch(url);assert(r.ok);const current=await r.json();
   assert.deepEqual(current,mode==='publish'?before:candidate,'工程已有新的保存，停止覆盖');
   const target=mode==='publish'?candidate:before;
   const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':mode==='publish'?fs.readFileSync(out+'/etag.txt','utf8').trim():r.headers.get('etag')},body:JSON.stringify(target)});
   const result=await saved.text();assert(saved.ok,`${saved.status} ${result}`);
   const check=await fetch(url);assert(check.ok);const readback=await check.text();assert.deepEqual(JSON.parse(readback),target);
   fs.writeFileSync(out+'/'+mode+'-readback.json',readback);
   fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({status:saved.status,result,etag:check.headers.get('etag'),sha256:sha(readback),apiReadback:true},null,2));
   console.log('PASS '+mode+': ETag-checked PUT and exact API readback');return;
 }
 assert.equal(mode,'build');assert.equal(p.spriteSheets[8].name,'original32_idle');assert.equal(p.layers[10].name,'头发 / 用户 / 后发');assert.equal(p.layers[191].name,'前发');
 for(const li of [10,191])for(const [key,f] of Object.entries(p.layers[li].frameData)){
   if(!key.startsWith('8_'))continue;
   const [,ai,fi]=key.split('_').map(Number),im=decode(f),old=Uint8Array.from(im.data),place=f.placement||{x:0,y:0,w:im.width,h:im.height};
   assert.equal(im.width,place.w);assert.equal(im.height,place.h);
   const headDrop=fi>=2?2:0;
   // Shade in head coordinates; preserve every source pixel, placement and existing animated silhouette.
   for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
     const i=(y*im.width+x)*4;if(!old[i+3])continue;assert.equal(old[i+3],255);
     const c=Buffer.from(old.subarray(i,i+3)).toString('hex'),wx=x+place.x,wy=y+place.y-headDrop;
     let tone='base';
     if(c==='2f3b3d'||c==='46465e')tone='outline';
     else if(li===191){
       const frontEdge=[17,17,17,17,17,17,17,17,17,16,15,13,15,15,14,16,15,13,14,15,16,15,14,13,15,15,14,17,17,17,17,17,17,17,17,17];
       const sideEdge=[17,17,17,17,17,17,17,17,17,17,16,16,15,13,15,16,15,14,13,15,16,15,14,13,15,16,15,15,17,17,17,17,17,17,17,17];
       if(wy>=(ai===1?frontEdge:sideEdge)[wx]||c==='777777')tone='shadow';
       const highlights=ai===1?[[9,10],[10,11],[11,11],[13,12],[16,12],[20,12],[23,11],[24,11],[25,10]]:[[10,10],[11,11],[12,11],[14,12],[18,12],[22,11],[23,11],[24,10]];
       if(highlights.some(([hx,hy])=>wx===hx&&wy===hy))tone='light';
     }else if(ai===2){
       const boundary=22+([0,1,2,2,1,0,2,3,3,2,1,0][Math.max(0,wx-6)%12]);
       if(wy>=boundary)tone='shadow';
       if([[10,11],[11,12],[12,12],[14,13],[17,13],[21,13],[24,12],[25,11]].some(([hx,hy])=>wx===hx&&wy===hy))tone='light';
     }else{
       const shifted=wx-(ai===0?1:0);
       if(wy>=19+(shifted%4===0?1:0)||c==='777777')tone='shadow';
     }
     im.data.set(rgb[tone],i);
   }
   assert.deepEqual(Array.from(im.data).filter((_,i)=>i%4===3),Array.from(old).filter((_,i)=>i%4===3),'透明度和轮廓不变');
   let count=0;for(let i=0;i<old.length;i+=4)if(!Buffer.from(old.subarray(i,i+4)).equals(Buffer.from(im.data.subarray(i,i+4))))count++;
   if(count){f.dataURL='data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');changed.push({layer:li,name:p.layers[li].name,key,changedPixels:count});}
 }
 assert.equal(changed.length,20);
 const restored=structuredClone(p);for(const {layer,key} of changed)restored.layers[layer].frameData[key]=before.layers[layer].frameData[key];
 assert.deepEqual(restored,before,'非待机头发数据逐字节保持原样');
 fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json')),before);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.ImageData=ImageData;global.Image=Image;
 global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
 global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 const contact=createCanvas(1440,864),cx=contact.getContext('2d');cx.imageSmoothingEnabled=false;
 for(let state=0;state<2;state++){
   const model=models[state],cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
   const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
   for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
     model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=fi;
     const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v),'非空人物');
     cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);
     player.sheetIndex=8;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data);
     const blob=await ex.exportFrameAsBlob(8,ai,fi),encoded=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(encoded).data),Array.from(im.data));
     const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
     for(let bg=0;bg<2;bg++){const x=(state*4+fi)*180,y=(bg*3+ai)*144;cx.fillStyle=bg?'#302d39':'#ede7df';cx.fillRect(x,y,180,144);cx.drawImage(tile,x,y,144,144);cx.drawImage(tile,x+144,y+54);}
     if(state===1)fs.writeFileSync(out+`/idle-${ai}-${fi}.png`,encoded);
     if(state===1&&ai===2){model.layers[191].visible=false;assert.deepEqual(cm.getCompositeImageData(8,ai,fi).data,im.data);model.layers[191].visible=true;}
   }
 }
 fs.writeFileSync(out+'/comparison.png',contact.toBuffer('image/png'));
 const model=models[1],lc=createCanvas(576,432),ctx=lc.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let ai=0;ai<3;ai++)for(let test=0;test<4;test++){
   model.layers[10].visible=test!==0;model.layers[191].visible=test!==1;
   const im=new PE.CanvasManager(document.createElement('canvas'),model).getCompositeImageData(8,ai,0),tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
   ctx.fillStyle=test%2?'#302d39':'#ede7df';ctx.fillRect(test*144,ai*144,144,144);ctx.drawImage(tile,test*144,ai*144,144,144);
 }
 fs.writeFileSync(out+'/layer-checks.png',lc.toBuffer('image/png'));
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:sha(raw),colors,changed,alphaAndSilhouetteUnchanged:true,allOtherDataUnchanged:true,placementsAndTimingUnchanged:true,all12IdleFramesMainPreviewPNGMatch:true,rearFrontHairTransparent:true,restoreExtraCopyVerified:true,browserChecked:false},null,2));
 console.log('PASS build: 20 idle hair cels, colors only; all other data unchanged; 12 frames main/preview/PNG match; restore-copy tested.');
 console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
