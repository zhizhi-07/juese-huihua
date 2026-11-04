const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/hair-idle-four-path.txt'),'utf8')),meta=JSON.parse(fs.readFileSync(out+'/source.json')),before=JSON.parse(fs.readFileSync(out+'/original.json')),p=structuredClone(before),hairMap=[0,1,3,5];
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const load=async data=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
async function render(data,label){
 const model=await load(data),cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
 const c=createCanvas(576,432),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let ai=0;ai<3;ai++)for(let q=0;q<4;q++){
  model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=q;const im=cm.getCompositeImageData(8,ai,q);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);player.sheetIndex=8;player.actionIndex=ai;player.currentFrame=q;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data);const blob=await ex.exportFrameAsBlob(8,ai,q),b=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(b).data),Array.from(im.data));fs.writeFileSync(out+`/${label}-${ai}-${q}.png`,b);const t=createCanvas(36,36);t.getContext('2d').putImageData(im,0,0);ctx.fillStyle='#e3dfe8';ctx.fillRect(q*144,ai*144,144,144);ctx.drawImage(t,q*144,ai*144,144,144);
 }
 fs.writeFileSync(out+'/'+label+'-contact.png',c.toBuffer('image/png'));
}
(async()=>{
 if(process.argv[2]==='publish'){
  const candidate=JSON.parse(fs.readFileSync(out+'/candidate.json')),url='http://127.0.0.1:8765/api/project?id='+meta.id,r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),before,'目标有新保存，禁止覆盖');const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(candidate)});const text=await saved.text();fs.writeFileSync(out+'/save-response.txt',saved.status+'\n'+text);assert(saved.ok,text);const back=await fetch(url);assert(back.ok);const raw=await back.text();assert.deepEqual(JSON.parse(raw),candidate);fs.writeFileSync(out+'/api-readback.json',raw);await render(JSON.parse(raw),'saved');console.log('PASS publish: ETag checked; actual API has 4×100ms in all three idle directions; saved 12 main/preview/PNG paths match.');return;
 }
 const sheet=p.spriteSheets[8],old=before.spriteSheets[8],atlas=createCanvas(144,108),ctx=atlas.getContext('2d'),source=new Image();source.src=old.imageDataURL;
 for(let ai=0;ai<3;ai++){
  assert.equal(old.actions[ai].frames.length,8);
  sheet.actions[ai].frames=old.actions[ai].frames.slice(0,4).map((f,q)=>({...structuredClone(f),sourceX:q*36,sourceY:ai*36,duration:100}));
  for(let q=0;q<4;q++){const f=old.actions[ai].frames[q];ctx.drawImage(source,f.sourceX,f.sourceY,36,36,q*36,ai*36,36,36);}
  for(let li=0;li<p.layers.length;li++){
   const layer=p.layers[li],hair=[10,191].includes(li);
   for(const key of Object.keys(layer.frameData||{}))if(key.startsWith(`8_${ai}_`))delete layer.frameData[key];
   for(let q=0;q<4;q++){const key=`8_${ai}_${q}`,from=before.layers[li].frameData?.[`8_${ai}_${hair?hairMap[q]:q}`];if(from)layer.frameData[key]=structuredClone(from);if(!hair)assert.deepEqual(layer.frameData[key],before.layers[li].frameData?.[key],'原四帧身体/五官/手原样不动');}
   assert.deepEqual(layer.frameData[`8_${ai}_0`],before.layers[li].frameData?.[`8_${ai}_0`],'用户首帧原样保留');
  }
 }
 sheet.columns=4;sheet.useFrameDurations=true;sheet.imageDataURL=atlas.toDataURL();if(p.currentSheetIndex===8)p.currentFrameIndex=Math.min(3,p.currentFrameIndex);
 const recovery=structuredClone(p);recovery.spriteSheets[8]=structuredClone(old);recovery.currentFrameIndex=before.currentFrameIndex;
 for(let li=0;li<p.layers.length;li++){for(const key of Object.keys(recovery.layers[li].frameData||{}))if(key.startsWith('8_'))delete recovery.layers[li].frameData[key];for(const [key,f]of Object.entries(before.layers[li].frameData||{}))if(key.startsWith('8_'))recovery.layers[li].frameData[key]=structuredClone(f);}
 assert.deepEqual(recovery,before,'其他动作、图层元数据、名称与用户修改全部不动');fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
 await render(p,'new');fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:meta.sha256,framesBefore:8,framesAfter:4,frameDurationMs:100,cycleMs:400,hairKeyframesFromOldIndices:hairMap,originalFirstFramesUnchanged:true,latestOriginalBodyEyesHandsFourFramesUnchanged:true,otherActionsAndMetadataUnchanged:true,restoreExtraCopyVerified:true,renderPreviewPNGFrames:12,browserChecked:false},null,2));console.log('PASS build: restore 4×100ms; hair keyposes [0,1,3,5], first anchors unchanged, body/eyes/hands original four cels unchanged, other actions untouched.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
