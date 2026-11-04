const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),crypto=require('crypto'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'备份/20261101-待机跟随节奏正面试播-56620e79');
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before),timing=[160,480,160,600];
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
assert.equal(p.layers[10].name,'头发 / 用户 / 后发');assert.equal(p.spriteSheets[8].actions[1].direction,'down');
const anchor=png.decode(fs.readFileSync(out+'/rear-world-0.png'));
const changed=[];
for(let fi=1;fi<4;fi++){
 const key=`8_1_${fi}`,f=p.layers[10].frameData[key];assert(!f.placement);
 const im=decode(f),data=Uint8Array.from(im.data);
 // No wind: remove the previous sideways tip wave; retain the approved first-frame lock shape.
 data.set(anchor.data.subarray(31*36*4,34*36*4),31*36*4);
 if(fi===1||fi===2){
   assert.deepEqual(data.subarray(22*36*4,23*36*4),data.subarray(23*36*4,24*36*4),'只压缩重复的直发段');
   const source=Uint8Array.from(data);
   for(let y=23;y<35;y++)data.set(source.subarray((y+1)*36*4,(y+2)*36*4),y*36*4);
   data.fill(0,35*36*4);
 }
 const now=png.encode(36,36,data);f.dataURL='data:image/png;base64,'+now.toString('base64');changed.push({layer:10,key});
 assert.deepEqual(data.subarray(0,23*36*4),im.data.subarray(0,23*36*4),'发根和上半发束不变');
 const opaque=[];for(let y=0;y<36;y++)for(let x=0;x<36;x++)if(data[(y*36+x)*4+3])opaque.push(y);
 assert.equal(Math.max(...opaque),fi===3?33:32,'发梢在头部运动之后跟随，非独立横摆');
}
p.spriteSheets[8].actions[1].frames.forEach((f,i)=>{f.duration=timing[i]});
const restored=structuredClone(p);for(const {layer,key}of changed)restored.layers[layer].frameData[key]=before.layers[layer].frameData[key];restored.spriteSheets[8].actions[1].frames.forEach((f,i)=>{f.duration=before.spriteSheets[8].actions[1].frames[i].duration});
assert.deepEqual(restored,before,'仅修改正面待机后发3帧及该方向4帧时长');
assert.deepEqual(p.layers[10].frameData['8_1_0'],before.layers[10].frameData['8_1_0']);assert.deepEqual(p.layers[191],before.layers[191]);
fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json')),before);
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
(async()=>{
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 const contact=createCanvas(864,432),cx=contact.getContext('2d');cx.imageSmoothingEnabled=false;
 for(let state=0;state<2;state++){
   const model=models[state],cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
   const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
   for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
     model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=fi;
     const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));
     cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);
     player.sheetIndex=8;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data);
     const blob=await ex.exportFrameAsBlob(8,ai,fi),encoded=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(encoded).data),Array.from(im.data));
     if(state===1&&ai!==1)assert.deepEqual(im.data,new PE.CanvasManager(document.createElement('canvas'),models[0]).getCompositeImageData(8,ai,fi).data,'侧背面画面未变');
     if(ai===1){
       fs.writeFileSync(out+`/${state?'new':'old'}-front-${fi}.png`,encoded);
       const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
       for(let bg=0;bg<2;bg++){const x=fi*216,y=(bg*2+state)*108;cx.fillStyle=bg?'#302d39':'#ede7df';cx.fillRect(x,y,216,108);cx.drawImage(tile,x,y,108,108);cx.drawImage(tile,x+140,y+36);}
     }
   }
 }
 fs.writeFileSync(out+'/comparison.png',contact.toBuffer('image/png'));fs.writeFileSync(out+'/candidate-front-only.json',JSON.stringify(p));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:crypto.createHash('sha256').update(raw).digest('hex'),changed,offlineOnly:true,apiWritten:false,changedDurationMs:timing,totalMs:1400,rootY:[6,6,8,8],tailY:[33,32,32,33],firstFrameUnchanged:true,frontHairAndGrayShadingUnchanged:true,otherDirectionsAndActionsUnchanged:true,bodyEyesHandsPixelDataUnchanged:true,rootAndUpperLocksUnchanged:true,mainPreviewPNG12FramesMatch:true,restoreExtraCopyVerified:true,browserChecked:false},null,2));
 console.log('PASS offline build: front-only follow-through trial, 1400ms loop; tail follows vertical head movement with delay; no horizontal motion; first anchor/body/front hair/side/back/other actions preserved; 12 main/preview/PNG paths match.');
})().catch(e=>{console.error(e);process.exitCode=1});
