const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'备份/20261101-待机发梢柔和回摆-56620e79');
const url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before);
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const changed=[],motion=[];
(async()=>{
 const mode=process.argv[2]||'build';
 if(mode==='publish'||mode==='restore'){
   const candidate=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8')),r=await fetch(url);assert(r.ok);
   assert.deepEqual(await r.json(),mode==='publish'?before:candidate,'工程已有新保存，不覆盖');
   const target=mode==='publish'?candidate:before;
   const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':mode==='publish'?fs.readFileSync(out+'/etag.txt','utf8').trim():r.headers.get('etag')},body:JSON.stringify(target)});
   const result=await saved.text();assert(saved.ok,`${saved.status} ${result}`);
   const check=await fetch(url);assert(check.ok);const readback=await check.text();assert.deepEqual(JSON.parse(readback),target);
   fs.writeFileSync(out+'/'+mode+'-readback.json',readback);fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({status:saved.status,result,etag:check.headers.get('etag'),sha256:sha(readback),apiReadback:true},null,2));
   console.log('PASS '+mode+': version checked save and exact API readback');return;
 }
 assert.equal(mode,'build');assert.equal(p.layers[10].name,'头发 / 用户 / 后发');assert.equal(p.layers[191].name,'前发');
 // Distal locks bend row by row; the movement travels down the strand instead of translating its whole lower half.
 for(let ai=0;ai<3;ai++)for(let fi=1;fi<4;fi++){
   const key=`8_${ai}_${fi}`,f=p.layers[10].frameData[key];assert(!f.placement);
   const im=decode(f),old=Uint8Array.from(im.data),data=Uint8Array.from(im.data);
   let moved=0;
   for(let y=31;y<=33;y++){
     for(let x=0;x<36;x++){
       if(x>10&&x<26)continue;
       const near=ai!==0||x<=10;
       const active=near?(y===31?fi===1||fi===2:y===32?fi===2||fi===3:fi===3):(y===31?fi===2:fi===3);
       if(active)data.fill(0,(y*36+x)*4,(y*36+x)*4+4);
     }
     for(let x=0;x<36;x++){
       if(x>10&&x<26)continue;
       const i=(y*36+x)*4;if(!old[i+3])continue;
       const near=ai!==0||x<=10;
       const active=near?(y===31?fi===1||fi===2:y===32?fi===2||fi===3:fi===3):(y===31?fi===2:fi===3);
       if(!active)continue;
       const xx=x+(x<=10?1:-1);assert(xx>=0&&xx<36);
       data.set(old.subarray(i,i+4),(y*36+xx)*4);moved++;
     }
   }
   assert(moved>0);assert.deepEqual(data.subarray(0,31*36*4),old.subarray(0,31*36*4),'发根及上部轮廓保持不动');
   assert.equal(Array.from(data).filter((v,i)=>i%4===3&&v).length,Array.from(old).filter((v,i)=>i%4===3&&v).length,'不丢像素或添加新碎片');
   f.dataURL='data:image/png;base64,'+png.encode(im.width,im.height,data).toString('base64');
   changed.push({layer:10,key});motion.push({key,movedPixels:moved,rows:'31..33',maxDisplacement:1});
 }
 assert.equal(changed.length,9);
 const restored=structuredClone(p);for(const {layer,key}of changed)restored.layers[layer].frameData[key]=before.layers[layer].frameData[key];assert.deepEqual(restored,before,'只修改9个待机后发帧');
 fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json')),before);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 const contact=createCanvas(1440,864),cx=contact.getContext('2d');cx.imageSmoothingEnabled=false;
 const preview=createCanvas(576,432),px=preview.getContext('2d');px.imageSmoothingEnabled=false;px.fillStyle='#ede7df';px.fillRect(0,0,576,432);
 for(let state=0;state<2;state++){
   const model=models[state],cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
   const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
   for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
     model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=fi;
     const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);
     player.sheetIndex=8;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data);
     const blob=await ex.exportFrameAsBlob(8,ai,fi),encoded=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(encoded).data),Array.from(im.data));
     const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
     for(let bg=0;bg<2;bg++){const x=(state*4+fi)*180,y=(bg*3+ai)*144;cx.fillStyle=bg?'#302d39':'#ede7df';cx.fillRect(x,y,180,144);cx.drawImage(tile,x,y,144,144);cx.drawImage(tile,x+144,y+54);}
     if(state===1){fs.writeFileSync(out+`/idle-${ai}-${fi}.png`,encoded);px.drawImage(tile,fi*144,ai*144,144,144);}
   }
 }
 fs.writeFileSync(out+'/comparison.png',contact.toBuffer('image/png'));fs.writeFileSync(out+'/preview.png',preview.toBuffer('image/png'));
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:sha(raw),changed,motion,grayPaletteAndShadowUnchanged:true,frontHairAndUserPixelEditsUnchanged:true,allOtherDataUnchanged:true,breathingUpperHairUntouched:true,tipBendTravelsDownRows:true,maxTipMovement:1,mainPreviewPNG12FramesMatch:true,restoreExtraCopyVerified:true,browserChecked:false,frameDurations:p.spriteSheets[8].actions.map(a=>a.frames.map(f=>f.duration))},null,2));
 console.log('PASS build: 9 rear-hair cels, distal 3-row delayed curls only, max 1 pixel; first frame, front hair, gray shading, upper locks, body and other actions preserved; 12 main/preview/PNG paths match.');
})().catch(e=>{console.error(e);process.exitCode=1});
