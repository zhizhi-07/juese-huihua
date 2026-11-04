const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert/strict'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(root+'/自检记录/duck-sit-detail-path.txt','utf8')),before=JSON.parse(fs.readFileSync(out+'/original.json')),meta=JSON.parse(fs.readFileSync(out+'/source.json'));
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(root+'/js/'+n+'.js','utf8'));
const load=async p=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]))).project;
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const read=(im,x,y)=>x>=0&&y>=0&&x<im.width&&y<im.height?Array.from(im.data.subarray((y*im.width+x)*4,(y*im.width+x)*4+4)):[0,0,0,0];
function bounds(im){let x=im.width,y=im.height,r=-1,b=-1;for(let yy=0;yy<im.height;yy++)for(let xx=0;xx<im.width;xx++)if(im.data[(yy*im.width+xx)*4+3]){x=Math.min(x,xx);y=Math.min(y,yy);r=Math.max(r,xx);b=Math.max(b,yy);}return r<0?null:{x,y,r,b,w:r-x+1,h:b-y+1};}
async function render(p,label){const model=await load(p),cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;const studio=fs.readFileSync(root+'/js/studio.js','utf8'),a=studio.indexOf('  app.animationPlayer._renderPreviewFrame=function'),b=studio.indexOf('  const originalSetTool=',a),app={project:model,canvasManager:cm,animationPlayer:new PE.AnimationPlayer()};app.animationPlayer.canvas=createCanvas(144,144);new Function('app','bounds',studio.slice(a,b))(app,bounds);
const c=createCanvas(4*192,3*5*160),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;const cloth=model.layers.find(l=>l.sheetIndex===10&&l.name==='服装 / 衣服-小黄鸭');
for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
model.currentSheetIndex=10;model.currentActionIndex=ai;model.currentFrameIndex=fi;const im=cm.getCompositeImageData(10,ai,fi,true,1);assert(bounds(im));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,32,32).data,im.data);const exported=decode({dataURL:'data:image/png;base64,'+Buffer.from(await(await ex.exportFrameAsBlob(10,ai,fi)).arrayBuffer()).toString('base64')});assert.deepEqual(Array.from(exported.data),Array.from(im.data));Object.assign(app.animationPlayer,{sheetIndex:10,actionIndex:ai,currentFrame:fi});app.animationPlayer._renderPreviewFrame(false);assert(bounds(app.animationPlayer.canvas.getContext('2d').getImageData(0,0,144,144)));
const tile=createCanvas(32,32);tile.getContext('2d').putImageData(im,0,0);for(let row=0;row<5;row++){ctx.fillStyle=row===1?'#302d39':'#e3dfe8';ctx.fillRect(fi*192,(ai*5+row)*160,192,160);}
for(let row=0;row<2;row++){ctx.drawImage(tile,fi*192,(ai*5+row)*160,128,128);ctx.drawImage(tile,fi*192+150,(ai*5+row)*160+60,32,32);}
const hair=model.layers.filter(l=>l.sheetIndex===10&&/前发|后发/.test(l.name)),vis=hair.map(l=>l.visible);hair.forEach(l=>l.visible=false);const nohair=cm.getCompositeImageData(10,ai,fi,true,1);tile.getContext('2d').putImageData(nohair,0,0);ctx.drawImage(tile,fi*192,(ai*5+2)*160,128,128);
const garment=createCanvas(32,32);PE.utils.drawImageData(garment.getContext('2d'),cloth.getFrameData(`10_${ai}_${fi}`),0,0,1);ctx.drawImage(garment,fi*192,(ai*5+3)*160,128,128);const cv=cloth.visible;cloth.visible=false;const bare=cm.getCompositeImageData(10,ai,fi,true,1);tile.getContext('2d').putImageData(bare,0,0);ctx.drawImage(tile,fi*192,(ai*5+4)*160,128,128);cloth.visible=cv;hair.forEach((l,i)=>l.visible=vis[i]);ctx.fillStyle='#222';ctx.font='12px sans-serif';ctx.fillText(`10/${ai}/${fi}`,fi*192+5,(ai*5+3)*160+146);const native=createCanvas(32,32);native.getContext('2d').putImageData(im,0,0);fs.writeFileSync(out+`/${label}-${ai}-${fi}.png`,native.toBuffer('image/png'));if(global.gc)global.gc();
}fs.writeFileSync(out+'/'+label+'.png',c.toBuffer('image/png'));console.log(label+' all 12 sit frames checked');return model;}
function verifyScope(p,changed){const restored=structuredClone(p),li=before.layers.findIndex(l=>l.sheetIndex===10&&l.name==='服装 / 衣服-小黄鸭');for(const key of changed)restored.layers[li].frameData[key]=structuredClone(before.layers[li].frameData[key]);assert.deepEqual(restored,before,'只允许修改坐姿衣服指定帧');assert.deepEqual(p.layers[li].frameData['10_2_0'],before.layers[li].frameData['10_2_0'],'用户背面首帧逐字节保留');return restored;}
(async()=>{
 const url='http://127.0.0.1:8765/api/project?id='+meta.id;
 if(process.argv[2]==='publish'){
  const p=JSON.parse(fs.readFileSync(out+'/candidate.json')),changes=JSON.parse(fs.readFileSync(out+'/changes.json'));verifyScope(p,changes.map(c=>c.key));const latest=await fetch(url);assert(latest.ok);assert.deepEqual(await latest.json(),before,'用户有新保存，停止覆盖，须比较合并');const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(p)}),raw=await r.text();fs.writeFileSync(out+'/save-response.txt',r.status+'\n'+raw);assert(r.ok,raw);const back=await fetch(url);assert(back.ok);const text=await back.text();assert.deepEqual(JSON.parse(text),p);verifyScope(JSON.parse(text),changes.map(c=>c.key));fs.writeFileSync(out+'/api-readback.json',text);await render(JSON.parse(text),'readback');console.log('PASS PUT '+r.status+'; API exactly matches candidate; user back first cel and all unrelated data untouched.');return;
 }
 await render(before,'before');const p=structuredClone(before),li=p.layers.findIndex(l=>l.sheetIndex===10&&l.name==='服装 / 衣服-小黄鸭'),idle=p.layers.find(l=>l.sheetIndex===8&&l.name==='服装 / 衣服-小黄鸭'),cloth=p.layers[li],backReference=decode(cloth.frameData['10_2_0']),edge=[70,70,94,255],white=[255,255,255,255],gray=[236,236,236,255],gold=[187,146,21,255],yellow=[251,207,78,255],changes=[];
 for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
  if(ai===2&&fi===0)continue;
  const key=`10_${ai}_${fi}`,old=decode(cloth.frameData[key]),dst={width:32,height:32,data:new Uint8Array(32*32*4)},put=(x,y,c)=>dst.data.set(c,(y*32+x)*4),top=fi<2?24:25;
  if(ai===2){
   // Remove only one plain breathing row; keep the user's collar, notch, hem and seated floor intact.
   for(let y=0;y<32;y++)for(let x=0;x<32;x++){const sy=fi<2?y:y<25?-1:y<=27?y-1:y;put(x,y,read(backReference,x,sy));}
   for(let y=top;y<=top+2;y++)for(let x=0;x<32;x++)assert.deepEqual(read(dst,x,y),read(backReference,x,y-(top-24)),'直背上部细节只跟随1像素，不重采样');
   for(let y=28;y<32;y++)for(let x=0;x<32;x++)assert.deepEqual(read(dst,x,y),read(backReference,x,y),'缺口下摆和臀部接地不漂');
  }else{
   const bodyLayer=p.layers.find(l=>l.sheetIndex===10&&l.name==='body'&&l.frameData[key]);assert(bodyLayer);const body=decode(bodyLayer.frameData[key]),source=decode(idle.frameData[`8_${ai}_${fi%2}`]);
   for(let y=top;y<32;y++)for(let x=0;x<32;x++){
    const b=read(body,x,y);if(!b[3])continue;let c;
    const isEdge=b[0]<100;
    if(y<=top+2&&x>=9&&x<=22){c=read(source,x+2,24+y-top);if(!c[3])c=isEdge?b:yellow;if(x===9||x===22)c=edge;}
    else if(ai===1){
     c=isEdge?b:white;
    }else{
     if(y>=26&&x>=15)c=isEdge?b:x===19&&y===26?gray:white;
     else if(isEdge)c=b;
     else if(y<=top+2){c=read(source,x+2,24+y-top);if(!c[3])c=yellow;}
     else {c=x===10?gold:yellow;if(y===28&&x===10)c=gray;if(y===29)c=x===10?gray:gold;if(y===30)c=gray;}
    }
    put(x,y,c);
   }
   for(let y=top;y<=top+2;y++)for(let x=10;x<=21;x++)assert.deepEqual(read(dst,x,y),read(source,x+2,24+y-top),'正侧面领口三行只平移，不压成点');
   // The existing knee/sole contours remain separate; fabric must not become one horizontal slab over them.
   for(let y=Math.max(27,top+3);y<=30;y++)for(let x=0;x<32;x++){const b=read(body,x,y);if(!b[3])continue;const sole=ai===1||x>=15;if(sole&&b[0]>=100)assert.deepEqual(read(dst,x,y),white,'坐姿露出的两块鞋底保持白色');if(sole&&b[0]<100)assert.deepEqual(read(dst,x,y),b,'保留原膝腿和鞋边轮廓');}
  }
  const diff=[];for(let y=0;y<32;y++)for(let x=0;x<32;x++){const a=read(old,x,y),b=read(dst,x,y);assert(b[3]===0||b[3]===255);if(a.join(',')!==b.join(','))diff.push({x,y,before:a,after:b});}
  if(diff.length){cloth.frameData[key]={...cloth.frameData[key],dataURL:'data:image/png;base64,'+png.encode(32,32,dst.data).toString('base64')};changes.push({key,reason:ai===2?'跟随用户直背首帧，领口缺口不再漂移':ai===0?'按现有侧面躯干和两块脚底分区，不压成横条':'保留原尺寸领口，膝腿遮挡处不挤压细节，白鞋底保留',pixels:diff});}
 }
 const restored=verifyScope(p,changes.map(c=>c.key));fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);await render(p,'after');fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/changes.json',JSON.stringify(changes,null,2));fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:meta.sha256,userBackFirstCelExact:true,changedOnlySittingOutfitLayer:li,changedFrames:changes.map(c=>c.key),noScaleOrResampling:true,backCollarMovesExactlyOnePixelWithHead:true,backNotchHemAndFloorFixed:true,visibleShoeSolesWhite:true,allOtherPixelsMetadataAndActionsExact:true,mainCanvasPngAndStudioPreview12FramesChecked:true,restorationExtraCopyExact:true,browserChecked:false},null,2));fs.writeFileSync(out+'/恢复说明.txt','原工程 original.json；原 SHA256、ETag 见 source.json；逐像素改动见 changes.json。用户背面首帧 10_2_0 未改。恢复本次操作只需按变化帧恢复坐姿衣服层，不恢复整套工程；restore-extra-copy.json 已在额外副本验证与原工程一致。在线恢复前仍须比较后续用户修改、带 ETag 条件保存。');console.log('PASS: retained user back first cel; fixed sitting outfit only.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
