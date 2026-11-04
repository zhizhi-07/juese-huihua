const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/hair-b-fringe-path.txt'),'utf8'));
const source=JSON.parse(fs.readFileSync(out+'/source.json')),raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before),li=191;
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const load=async data=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project;
function world(model,layer,ai,q){const c=createCanvas(36,36),f=model.layers[layer].getFrameData(`8_${ai}_${q}`);if(f)PE.utils.drawImageData(c.getContext('2d'),f);return Uint8Array.from(c.getContext('2d').getImageData(0,0,36,36).data);}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
(async()=>{
 const base=await load(before),changed=[],diff=[];
 for(const ai of [0,1])for(const q of [2,3,6,7]){
  const key=`8_${ai}_${q}`,data=world(base,li,ai,q),eyes=world(base,189,ai,q),next=Uint8Array.from(data),dy=q===2||q===3?2:0,start=14+dy;
  const left=ai===0?16:13,right=ai===0?25:22;
  for(let x=left;x<=right;x++){
   const group=ai===0?(x<=19?0:x<=22?1:2):(x<=16?0:x<=19?1:2),sign=q>=6?1:-1;
   const active=ai===0?(q===2||q===6?group!==2:group!==0):(q===2||q===6?true:group===1),delta=active?sign:0;
   if(!delta)continue;
   for(let y=start+1;y<=20+dy;y++){
    let lo=start,hi=23+dy;
    for(let n=0;n<16;n++){const m=(lo+hi)/2,yy=m+delta*smooth((m-start)/5);if(yy<y)lo=m;else hi=m;}
    const sy=Math.round((lo+hi)/2),i=(y*36+x)*4,s=(sy*36+x)*4;
    // Never lower a fringe pixel onto an eye pixel that was visible in the chosen B version.
    if(eyes[i+3]&&!data[i+3]&&data[s+3])continue;
    next.set(data.subarray(s,s+4),i);
   }
  }
  for(let y=0;y<=start;y++)assert.deepEqual(next.subarray(y*144,(y+1)*144),data.subarray(y*144,(y+1)*144),'发顶及上半刘海不变');
  let count=0;
  for(let i=0;i<5184;i+=4){if(eyes[i+3]&&!data[i+3])assert(!next[i+3],'不能新遮挡眼睛');if(!Buffer.from(data.subarray(i,i+4)).equals(Buffer.from(next.subarray(i,i+4)))){count++;diff.push({key,x:(i/4)%36,y:Math.floor(i/144),before:Array.from(data.subarray(i,i+4)),after:Array.from(next.subarray(i,i+4))});}}
  assert(count>0,'每个目标帧必须有真实刘海变化');
  p.layers[li].frameData[key]={width:36,height:36,dataURL:'data:image/png;base64,'+png.encode(36,36,next).toString('base64')};changed.push({key,pixelChanges:count});
 }
 const recovery=structuredClone(p);for(const {key}of changed)recovery.layers[li].frameData[key]=structuredClone(before.layers[li].frameData[key]);assert.deepEqual(recovery,before,'只能改B前发8个帧，其他数据逐结构保持');
 fs.writeFileSync(out+'/restore-extra-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-extra-copy.json')),before);
 const contact=createCanvas(1152,3*2*144),cx=contact.getContext('2d');cx.imageSmoothingEnabled=false;
 for(let state=0;state<2;state++){
  const model=await load(state?p:before),cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
  const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
  for(let ai=0;ai<3;ai++)for(let q=0;q<8;q++){
   model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=q;
   const im=cm.getCompositeImageData(8,ai,q);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);
   player.sheetIndex=8;player.actionIndex=ai;player.currentFrame=q;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data);
   const blob=await ex.exportFrameAsBlob(8,ai,q),b=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(b).data),Array.from(im.data));fs.writeFileSync(out+`/${state?'new':'old'}-${ai}-${q}.png`,b);
   const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);const y=(ai*2+state)*144;cx.fillStyle=state?'#302d39':'#e3dfe8';cx.fillRect(q*144,y,144,144);cx.drawImage(tile,q*144,y,144,144);
  }
 }
 fs.writeFileSync(out+'/comparison.png',contact.toBuffer('image/png'));fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/pixel-diff.json',JSON.stringify(diff,null,2));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({changed,pixelChanges:diff.length,rearHairAndAllOtherDataUnchanged:true,originalFirstFramesUnchanged:true,crownUnchanged:true,noNewEyeOcclusion:true,restoreExtraCopyVerified:true,mainPreviewPNGFrames:48,browserChecked:false},null,2));
 if(process.argv[2]==='publish'){
  const url='http://127.0.0.1:8765/api/project?id='+source.id,r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),before,'B有并发新保存，禁止覆盖');
  const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':source.etag},body:JSON.stringify(p)});const text=await saved.text();assert(saved.ok,text);fs.writeFileSync(out+'/save-response.txt',saved.status+'\n'+text);
  const back=await fetch(url);assert(back.ok);const actual=await back.text();assert.deepEqual(JSON.parse(actual),p);fs.writeFileSync(out+'/api-readback.json',actual);console.log('PASS publish: If-Match checked; live B API matches candidate.');
 }
 console.log(`PASS build: ${diff.length} pixel changes in eight front-hair cels; rear hair, eyes, body, first anchors and timing unchanged; no newly covered eye pixels; 48 render/preview/PNG comparisons.`);console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
