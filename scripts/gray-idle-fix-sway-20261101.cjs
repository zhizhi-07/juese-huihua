const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto'),vm=require('vm'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'备份/20261101-待机恢复灰色修正第二帧-56620e79');
const url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before);
const gray=JSON.parse(fs.readFileSync(path.join(root,'备份/20261101-待机头发参考光影-56620e79/original.json'),'utf8'));
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const changed=[],motion=[];
function world(f){
 const im=decode(f),data=new Uint8Array(36*36*4),r=f.placement||{x:0,y:0,w:im.width,h:im.height};
 assert.equal(r.w,im.width);assert.equal(r.h,im.height);
 for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
   const xx=x+r.x,yy=y+r.y;if(xx<0||xx>=36||yy<0||yy>=36)continue;
   data.set(im.data.subarray((y*im.width+x)*4,(y*im.width+x)*4+4),(yy*36+xx)*4);
 }
 return data;
}
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
 for(const li of [10,191])for(const [key,f]of Object.entries(p.layers[li].frameData)){
   if(!key.startsWith('8_'))continue;
   const im=decode(f),old=Uint8Array.from(im.data),source=decode(gray.layers[li].frameData[key]);
   assert.equal(source.width,im.width);assert.equal(source.height,im.height);
   for(let i=0;i<im.data.length;i+=4){
     assert.equal(im.data[i+3],source.data[i+3]);if(!im.data[i+3])continue;
     const c=Buffer.from(im.data.subarray(i,i+3)).toString('hex'),original=Buffer.from(source.data.subarray(i,i+3)).toString('hex');
     assert(['332d2b','796060','644647','eedbc1'].includes(c),'只处理本次已发布光影稿');
     let grayColor=c==='332d2b'?original:c==='796060'?'d1d1d1':c==='eedbc1'?'ececec':original==='777777'?'777777':'aaaaaa';
     assert(['d1d1d1','ececec','aaaaaa','777777','2f3b3d','46465e'].includes(grayColor),'恢复原有灰色色板');
     im.data.set(Buffer.from(grayColor,'hex'),i);
   }
   assert.deepEqual(Array.from(im.data).filter((_,i)=>i%4===3),Array.from(old).filter((_,i)=>i%4===3));
   if(!Buffer.from(old).equals(Buffer.from(im.data))){f.dataURL='data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');changed.push({layer:li,key});}
 }
 // Remove the abrupt whole-lower-lock x shift; keep both existing breathing poses and all pixels above the seam.
 for(let ai=0;ai<3;ai++)for(const [fi,anchor]of [[1,0],[2,3]]){
   const key=`8_${ai}_${fi}`,data=world(p.layers[10].frameData[key]),source=world(p.layers[10].frameData[`8_${ai}_${anchor}`]);
   const upper=Uint8Array.from(data.subarray(0,26*36*4));data.set(source.subarray(26*36*4),26*36*4);
   assert.deepEqual(data.subarray(0,26*36*4),upper);
   assert.deepEqual(data.subarray(26*36*4),source.subarray(26*36*4),'发尾不再横向跳动');
   const old=p.layers[10].frameData[key];assert(!old.placement);
   p.layers[10].frameData[key]={...old,dataURL:'data:image/png;base64,'+png.encode(36,36,data).toString('base64')};motion.push({layer:10,key,anchor:`8_${ai}_${anchor}`,rows:'26..35',reason:'remove abrupt lower-lock horizontal translation'});
 }
 const restored=structuredClone(p);for(const {layer,key}of changed)restored.layers[layer].frameData[key]=before.layers[layer].frameData[key];assert.deepEqual(restored,before,'只修改20个待机头发帧');
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
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:sha(raw),changed,motion,originalGrayPaletteRestored:true,acceptedShadowDesignKept:true,allOtherDataUnchanged:true,breathingUpperHairUntouched:true,lowerLocksNoWholeRowSway:true,mainPreviewPNG12FramesMatch:true,restoreExtraCopyVerified:true,browserChecked:false,frameDurations:p.spriteSheets[8].actions.map(a=>a.frames.map(f=>f.duration))},null,2));
 console.log('PASS build: gray palette restored, shadow design kept, rear lower-lock x jumps removed in frames 2/3; non-hair and other actions unchanged; 12 main/preview/PNG paths match.');
})().catch(e=>{console.error(e);process.exitCode=1});
