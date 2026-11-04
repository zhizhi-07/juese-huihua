const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/hair-corner-sync-path.txt'),'utf8')),meta=JSON.parse(fs.readFileSync(out+'/source.json'));
const before=JSON.parse(fs.readFileSync(out+'/original.json')),prior=path.join(root,fs.readFileSync(path.join(root,'自检记录/hair-approved-merge-path.txt'),'utf8')),reference=JSON.parse(fs.readFileSync(prior+'/api-readback.json')),p=structuredClone(before);
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const load=async data=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
function world(model,ai,q){const c=createCanvas(36,36);PE.utils.drawImageData(c.getContext('2d'),model.layers[10].getFrameData(`8_${ai}_${q}`));return Uint8Array.from(c.getContext('2d').getImageData(0,0,36,36).data);}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function predict(anchor,ai,q){
 if(q===0)return anchor;
 const dy=[0,0,2,2,2,2,0,0][q],tail=[0,0,0,0,1,1,1,0][q],mid=[0,0,.9,1,.4,0,-.8,-.3],tip=[0,0,0,.9,1,.4,0,-.7],n=dy-tail,cuts=[21,22,23].slice(0,Math.max(0,n)),data=new Uint8Array(5184);
 for(let y=0;y<36;y++){
  if(cuts.includes(y))continue;const yy=y+dy-cuts.filter(c=>y>c).length+(n<0&&y>21?1:0);
  if(yy<0||yy>=36){assert(!anchor.subarray(y*144,(y+1)*144).some((v,i)=>i%4===3&&v));continue;}
  data.set(anchor.subarray(y*144,(y+1)*144),yy*144);if(n<0&&y===21)data.set(anchor.subarray(y*144,(y+1)*144),(yy+1)*144);
 }
 const target=new Uint8Array(5184),center=ai===0?18.5:17.5,start=22+dy,end=33+tail,peak=start+(end-start)*.55;
 const curve=(y,m,t)=>y<=start?0:y<peak?m*smooth((y-start)/(peak-start)):m+(t-m)*smooth((y-peak)/(end-peak));
 for(let y=0;y<36;y++){
  const far=ai===0&&q>1?q-1:q,amps=[q,far].map(phase=>curve(y,mid[phase],tip[phase]));
  const moved=x=>x+(x<center?-1:1)*amps[x<center?0:1]*smooth((Math.abs(x-center)-3)/5);
  for(let x=0;x<36;x++){let lo=-3,hi=39;for(let k=0;k<16;k++){const m=(lo+hi)/2;if(moved(m)<x)lo=m;else hi=m;}const sx=Math.round((lo+hi)/2);if(sx>=0&&sx<36)target.set(data.subarray((y*36+sx)*4,(y*36+sx)*4+4),(y*36+x)*4);}
 }
 return target;
}
(async()=>{
 const base=await load(before),old=await load(reference),changes=[],removed=[],already=[];
 for(const ai of [0,1]){
  const original=world(old,ai,0),anchor=world(base,ai,0),points=[];
  for(let i=0;i<5184;i+=4)if(!Buffer.from(original.subarray(i,i+4)).equals(Buffer.from(anchor.subarray(i,i+4)))){assert(original[i+3]&&!anchor[i+3],'首帧仅识别用户删除的角，不推断其他修改');points.push({x:(i/4)%36,y:Math.floor(i/144)});}
  assert.deepEqual(points,ai===0?[{x:4,y:29},{x:33,y:29}]:[{x:3,y:29},{x:32,y:29}]);removed.push({direction:ai,points});
  for(let q=1;q<8;q++){
   const key=`8_${ai}_${q}`,oldExpected=predict(original,ai,q),newExpected=predict(anchor,ai,q),current=world(base,ai,q),next=Uint8Array.from(current);
   assert.deepEqual(oldExpected,world(old,ai,q),'必须复现获准B原运动轨迹，不能拿首帧静态覆盖');
   const pixels=[];
   for(let i=0;i<5184;i+=4)if(!Buffer.from(oldExpected.subarray(i,i+4)).equals(Buffer.from(newExpected.subarray(i,i+4)))){
    assert(oldExpected[i+3]&&!newExpected[i+3],'本次只能删除，不增加或重画');
    if(!current[i+3]){already.push({key,x:(i/4)%36,y:Math.floor(i/144)});continue;}
    assert.deepEqual(current.subarray(i,i+4),oldExpected.subarray(i,i+4),'待删处有额外用户修改，禁止覆盖');
    next.fill(0,i,i+4);pixels.push({x:(i/4)%36,y:Math.floor(i/144),before:Array.from(current.subarray(i,i+4)),after:[0,0,0,0]});
   }
   if(pixels.length){p.layers[10].frameData[key]={width:36,height:36,dataURL:'data:image/png;base64,'+png.encode(36,36,next).toString('base64')};changes.push({key,pixels});}
   for(let i=0;i<5184;i+=4)if(!newExpected[i+3]&&oldExpected[i+3])assert(!next[i+3],'所有映射角像素都必须删净');
  }
 }
 const recovery=structuredClone(p);for(const {key}of changes)recovery.layers[10].frameData[key]=structuredClone(before.layers[10].frameData[key]);assert.deepEqual(recovery,before,'只改补漏的后发帧，保留全部其他最新保存');fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
 const contact=createCanvas(1152,3*2*144),cx=contact.getContext('2d');cx.imageSmoothingEnabled=false;
 for(let state=0;state<2;state++){
  const model=await load(state?p:before),cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
  for(let ai=0;ai<3;ai++)for(let q=0;q<8;q++){
   model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=q;const im=cm.getCompositeImageData(8,ai,q);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);player.sheetIndex=8;player.actionIndex=ai;player.currentFrame=q;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data);const blob=await ex.exportFrameAsBlob(8,ai,q),b=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(b).data),Array.from(im.data));fs.writeFileSync(out+`/${state?'new':'old'}-${ai}-${q}.png`,b);const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);cx.fillStyle=state?'#302d39':'#e3dfe8';cx.fillRect(q*144,(ai*2+state)*144,144,144);cx.drawImage(tile,q*144,(ai*2+state)*144,144,144);
  }
 }
 fs.writeFileSync(out+'/comparison.png',contact.toBuffer('image/png'));fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/pixel-diff.json',JSON.stringify(changes,null,2));fs.writeFileSync(out+'/verification.json',JSON.stringify({sourceSHA256:meta.sha256,removedFirstFramePoints:removed,changedFrames:changes.map(c=>c.key),deletedPixels:changes.reduce((n,c)=>n+c.pixels.length,0),alreadyRemovedPixels:already,firstFramesUnchanged:true,frontHairAndBodyAndBackAndTimingUnchanged:true,allOtherDataUnchanged:true,renderPreviewPNGComparisons:48,restoreExtraCopyVerified:true,browserChecked:false},null,2));
 if(process.argv[2]==='publish'){
  const url='http://127.0.0.1:8765/api/project?id='+meta.id,r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),before,'工程已有新保存，不能覆盖');const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(p)});const text=await saved.text();fs.writeFileSync(out+'/save-response.txt',saved.status+'\n'+text);assert(saved.ok,text);const read=await fetch(url);assert(read.ok);const raw=await read.text();assert.deepEqual(JSON.parse(raw),p);fs.writeFileSync(out+'/api-readback.json',raw);console.log('PASS publish: ETag checked; real API readback exactly matches local corner-only patch.');
 }
 console.log(`PASS: ${changes.length} rear-hair cels patched, ${changes.reduce((n,c)=>n+c.pixels.length,0)} corner pixels removed, ${already.length} already-deleted pixels preserved; first cels/front hair/back/body/timing/other actions unchanged; 48 render comparisons.`);console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
