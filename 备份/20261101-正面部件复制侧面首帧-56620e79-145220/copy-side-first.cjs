const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const out=__dirname,root=path.resolve(out,'../..'),png=require(path.join(root,'scripts/png.cjs'));
const url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before),indices=[0,181,185,187];
const source='8_1_0',target='8_0_0';
(async()=>{
 const mode=process.argv[2]||'build';
 if(mode==='publish'||mode==='restore'){
   const candidate=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8')),r=await fetch(url);assert(r.ok);
   assert.deepEqual(await r.json(),mode==='publish'?before:candidate,'工程已有后续修改，停止覆盖');
   const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':mode==='publish'?fs.readFileSync(out+'/etag.txt','utf8').trim():r.headers.get('etag')},body:JSON.stringify(mode==='publish'?candidate:before)});
   assert(saved.ok,'PUT '+saved.status+' '+await saved.text());
   const readback=await fetch(url);assert(readback.ok);assert.deepEqual(await readback.json(),mode==='publish'?candidate:before);
   fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({apiReadback:true,time:new Date().toISOString()},null,2));
   console.log('PASS '+mode+': If-Match write and API readback');return;
 }
 assert.equal(mode,'build');assert.equal(p.spriteSheets[8].actions[0].direction,'side');assert.equal(p.spriteSheets[8].actions[1].direction,'down');
 const names=['头发后发','眼睛 / 原版豆豆眼·定位','眼睛 / 眼睛','前发'];
 indices.forEach((i,n)=>{assert.equal(p.layers[i].name,names[n]);assert(p.layers[i].frameData[source]);p.layers[i].frameData[target]=structuredClone(p.layers[i].frameData[source]);assert.deepEqual(p.layers[i].frameData[target],p.layers[i].frameData[source]);});
 const restore=structuredClone(p);
 for(const i of indices){if(before.layers[i].frameData[target])restore.layers[i].frameData[target]=structuredClone(before.layers[i].frameData[target]);else delete restore.layers[i].frameData[target];}
 assert.deepEqual(restore,before,'只有指定四个部件的侧面第一帧可以改变');
 fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(restore));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json','utf8')),before);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
 global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 const contact=createCanvas(648,468),ctx=contact.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let col=0;col<3;col++){
   const model=models[col===2?1:0],ai=col===0?1:0,cm=new PE.CanvasManager(document.createElement('canvas'),model);
   model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=0;
   const im=cm.getCompositeImageData(8,ai,0);assert(im.data.some((v,i)=>i%4===3&&v));
   cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);
   const anim=new PE.AnimationPlayer();anim.previewScale=1;anim.init(document.createElement('canvas'),model,cm);assert.deepEqual(anim.ctx.getImageData(0,0,36,36).data,im.data);
   const ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;const encoded=Buffer.from(await (await ex.exportFrameAsBlob(8,ai,0)).arrayBuffer());assert.deepEqual(Array.from(png.decode(encoded).data),Array.from(im.data));
   const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
   for(let bg=0;bg<2;bg++){ctx.fillStyle=bg?'#302d39':'#e3dfe8';ctx.fillRect(col*216,bg*234,216,234);ctx.drawImage(tile,col*216,bg*234,216,216);ctx.drawImage(tile,col*216+90,bg*234+198,36,36);}
   fs.writeFileSync(out+'/'+['front-source','side-before','side-after'][col]+'.png',encoded);
 }
 fs.writeFileSync(out+'/comparison.png',contact.toBuffer('image/png'));
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:crypto.createHash('sha256').update(raw).digest('hex'),source,target,changed:indices.map(i=>({index:i,name:p.layers[i].name,previousTargetExisted:!!before.layers[i].frameData[target]})),exactCopyIncludingPlacement:true,allOtherDataUnchanged:true,restoreExtraCopyVerified:true,mainPreviewPNGMatch:true,browserChecked:false},null,2));
 console.log('PASS build: front first-frame rear/front hair and both visible eye layers copied exactly to side first frame; all other data unchanged; main/preview/PNG match.');
})().catch(e=>{console.error(e);process.exitCode=1});
