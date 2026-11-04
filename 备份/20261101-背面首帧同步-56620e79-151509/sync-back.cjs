const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const out=__dirname,root=path.resolve(out,'../..'),png=require(path.join(root,'scripts/png.cjs'));
const url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before),keys=['8_2_1','8_2_2','8_2_3'];
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
(async()=>{
 const mode=process.argv[2]||'build';
 if(mode==='publish'||mode==='restore'){
   const c=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8')),r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),mode==='publish'?before:c,'工程已有后续保存，停止覆盖');
   const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':mode==='publish'?fs.readFileSync(out+'/etag.txt','utf8').trim():r.headers.get('etag')},body:JSON.stringify(mode==='publish'?c:before)});
   assert(saved.ok,'PUT '+saved.status+' '+await saved.text());const check=await fetch(url);assert(check.ok);assert.deepEqual(await check.json(),mode==='publish'?c:before);
   fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({apiReadback:true,time:new Date().toISOString()},null,2));console.log('PASS '+mode+': If-Match PUT and API readback');return;
 }
 assert.equal(mode,'build');assert.equal(p.layers[6].name,'头发 / 用户 / 后发');assert.equal(p.spriteSheets[8].actions[2].direction,'up');
 const f=p.layers[6].frameData['8_2_0'],src=decode(f),r=f.placement||{x:0,y:0,w:36,h:36};assert.deepEqual(r,{x:0,y:6,w:35,h:36});
 assert(!decode(p.layers[187].frameData['8_2_0']).data.some((v,i)=>i%4===3&&v),'用户背面前发应为空');
 for(const wy of [19,25]){const y=wy-r.y;for(let x=0;x<src.width;x++){const a=(y*src.width+x)*4,b=((y-1)*src.width+x)*4;assert.equal(src.data[a+3],src.data[b+3]);if(src.data[a+3])assert.deepEqual(src.data.subarray(a,a+4),src.data.subarray(b,b+4),'压缩位置须是重复直发行');}}
 for(let fi=1;fi<4;fi++){
   const data=new Uint8Array(36*36*4),dy=fi>=2?2:0;
   for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
     const i=(y*src.width+x)*4;if(!src.data[i+3])continue;const wy=y+r.y;if(dy&&[19,25].includes(wy))continue;
     const xx=x+r.x+((fi===1||fi===2)&&wy>=26?1:0),yy=wy+dy-(dy?(Number(wy>19)+Number(wy>25)):0);
     assert(xx>=0&&xx<36&&yy>=0&&yy<36,'不能裁掉背发');data.set(src.data.subarray(i,i+4),(yy*36+xx)*4);
   }
   p.layers[6].frameData[`8_2_${fi}`]={width:36,height:36,dataURL:'data:image/png;base64,'+png.encode(36,36,data).toString('base64')};
 }
 const restored=structuredClone(p);for(const k of keys){if(before.layers[6].frameData[k])restored.layers[6].frameData[k]=structuredClone(before.layers[6].frameData[k]);else delete restored.layers[6].frameData[k];}
 assert.deepEqual(restored,before,'仅允许增加三个背面后发帧');fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json','utf8')),before);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 const cv=createCanvas(1152,864),cx=cv.getContext('2d');cx.imageSmoothingEnabled=false;const covered=[];
 for(let state=0;state<2;state++){
   const model=models[state],cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
   const anim=new PE.AnimationPlayer();anim.previewScale=1;anim.init(document.createElement('canvas'),model,cm);
   for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
     model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=fi;
     const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);
     anim.sheetIndex=8;anim.actionIndex=ai;anim.currentFrame=fi;anim._renderPreviewFrame();assert.deepEqual(anim.ctx.getImageData(0,0,36,36).data,im.data);
     const encoded=Buffer.from(await(await ex.exportFrameAsBlob(8,ai,fi)).arrayBuffer());assert.deepEqual(Array.from(png.decode(encoded).data),Array.from(im.data));
     const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);for(let bg=0;bg<2;bg++){const x=(state*4+fi)*144,y=(bg*3+ai)*144;cx.fillStyle=bg?'#302d39':'#e3dfe8';cx.fillRect(x,y,144,144);cx.drawImage(tile,x,y,144,144);}
     if(state===1&&ai===2){
       fs.writeFileSync(out+`/back-${fi+1}.png`,encoded);
       const hairCanvas=createCanvas(36,36);PE.utils.drawImageData(hairCanvas.getContext('2d'),model.layers[6].getFrameData(`8_2_${fi}`),0,0,1);const hair=hairCanvas.getContext('2d').getImageData(0,0,36,36),body=model.layers[124].getFrameData(`8_2_${fi}`);let count=0;
       for(let i=0;i<hair.data.length;i+=4)if(hair.data[i+3]===255&&body.data[i+3]){assert.deepEqual(im.data.subarray(i,i+4),hair.data.subarray(i,i+4));count++;}assert(count>0);covered.push(count);
     }
     if(state===1&&(ai!==2||fi===0))assert.deepEqual(im.data,new PE.CanvasManager(document.createElement('canvas'),models[0]).getCompositeImageData(8,ai,fi).data,'正侧面及背面首帧合成不变');
   }
 }
 fs.writeFileSync(out+'/comparison.png',cv.toBuffer('image/png'));fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:crypto.createHash('sha256').update(raw).digest('hex'),changed:keys.map(key=>({index:6,name:p.layers[6].name,key})),firstFrameAndOtherDataUnchanged:true,frontHairBackTransparent:true,backHairBodyPixelsCovered:covered,mainPreviewPNGAll12FramesMatch:true,restoreExtraCopyVerified:true,browserChecked:false},null,2));
 console.log('PASS build: 3 back rear-hair cels synchronized; source first frame and all other data unchanged; back overlays body in all 4 frames '+JSON.stringify(covered)+'; all 12 idle frames main/preview/PNG match.');
})().catch(e=>{console.error(e);process.exitCode=1});
