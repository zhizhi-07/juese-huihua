const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,fs.readFileSync(path.join(root,'自检记录/hair-three-studies-path.txt'),'utf8'));
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),source=JSON.parse(fs.readFileSync(out+'/source.json'));
const si=8,rear=10,front=191,map=[0,1,2,2,3,3,0,0],timing=[40,100,40,60,40,60,30,30];
const specs=[
 {code:'A',name:'自然垂坠',tipY:[0,0,0,1,1,1,1,0],mid:[0,0,0,0,0,0,0,0],tip:[0,0,0,0,0,0,0,0],lesson:'重发束：垂直拖曳，头先动、长发稍后跟上；不加横摆。'},
 {code:'B',name:'分束柔摆',tipY:[0,0,0,0,1,1,1,0],mid:[0,0,0.9,1,0.4,0,-0.8,-0.3],tip:[0,0,0,0.9,1,0.4,0,-0.7],lesson:'波浪传递：中段先弯、末端后到；侧面近远束错开响应。'},
 {code:'C',name:'轻弹回落',tipY:[0,0,-1,0,1,0,1,0],mid:[0,0,0.3,0.9,0.4,-0.6,-0.2,0.2],tip:[0,0,-0.9,0.4,1.2,0,-0.9,0],lesson:'轻发束：受压时发梢上提，随后反向小回弹再回稳；不延长循环。'},
];
const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
global.window=global;global.ImageData=ImageData;global.Image=Image;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener:()=>{}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
for(const n of ['core','canvas','export','animation','frame-timing'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),url=id=>'http://127.0.0.1:8765/api/project?id='+id;
const load=async p=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(p)]))).project;
function world(m,li,ai,fi){const c=createCanvas(36,36),f=m.layers[li].getFrameData(`${si}_${ai}_${fi}`);if(f)PE.utils.drawImageData(c.getContext('2d'),f);return Uint8Array.from(c.getContext('2d').getImageData(0,0,36,36).data);}
const encode=d=>({width:36,height:36,dataURL:'data:image/png;base64,'+png.encode(36,36,d).toString('base64')});
function components(data){const seen=new Set(),sizes=[];for(let i=0;i<1296;i++){if(!data[i*4+3]||seen.has(i))continue;const q=[i];seen.add(i);for(let j=0;j<q.length;j++){const x=q[j]%36,y=Math.floor(q[j]/36);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,n=yy*36+xx;if(xx<0||xx>=36||yy<0||yy>=36||seen.has(n)||!data[n*4+3])continue;seen.add(n);q.push(n);}}sizes.push(q.length);}return sizes.sort((a,b)=>a-b);}
function vertical(anchor,dy,tail,ai){
 const n=dy-tail,cuts=(ai===2?[19,20,21]:[21,22,23]).slice(0,Math.max(0,n)),data=new Uint8Array(5184);
 for(const y of cuts)assert.deepEqual(anchor.subarray(y*144,(y+1)*144),anchor.subarray((y-1)*144,y*144),'只压缩重复行');
 for(let y=0;y<36;y++){
  if(cuts.includes(y))continue;
  const yy=y+dy-cuts.filter(c=>y>c).length+(n<0&&y>21?1:0);
  if(yy<0||yy>=36){assert(!anchor.subarray(y*144,(y+1)*144).some((v,i)=>i%4===3&&v),'不得裁图');continue;}
  data.set(anchor.subarray(y*144,(y+1)*144),yy*144);
  if(n<0&&y===21)data.set(anchor.subarray(y*144,(y+1)*144),(yy+1)*144);
 }
 return data;
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function curve(y,start,end,mid,tip){const peak=start+(end-start)*0.55;return y<=start?0:y<peak?mid*smooth((y-start)/(peak-start)):mid+(tip-mid)*smooth((y-peak)/(end-peak));}
function bend(data,spec,ai,q,dy,isFront=false){
 if(spec.code==='A')return data;
 const target=new Uint8Array(5184),center=ai===0?18.5:17.5,start=isFront?20+dy:22+dy,end=isFront?(ai===0?25:23)+dy:33+spec.tipY[q];
 for(let y=0;y<36;y++){
  const phaseFar=ai===0&&q>1?q-1:q;
  const amps=[q,phaseFar].map(phase=>curve(y,start,Math.max(start+1,end),spec.mid[phase]*(isFront?0.45:1),spec.tip[phase]*(isFront?0.65:1)));
  // Inverse sampling keeps the lock continuous; moving rows forward left empty stripes in the first trial.
  const moved=x=>{const side=x<center?0:1,w=smooth((Math.abs(x-center)-3)/5);return x+(side?1:-1)*amps[side]*w;};
  for(let x=0;x<36;x++){
   let lo=-3,hi=39;for(let i=0;i<16;i++){const mid=(lo+hi)/2;if(moved(mid)<x)lo=mid;else hi=mid;}
   const sx=Math.round((lo+hi)/2);if(sx<0||sx>=36)continue;
   target.set(data.subarray((y*36+sx)*4,(y*36+sx)*4+4),(y*36+x)*4);
  }
 }
 return target;
}
async function render(p,dir){
 const m=await load(p),cm=new PE.CanvasManager(document.createElement('canvas'),m),ex=new PE.ExportManager();ex.project=m;ex.canvasManager=cm;
 const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),m,cm);player.previewScale=1;
 const all=[],contact=createCanvas(864,3*2*108),ctx=contact.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let ai=0;ai<3;ai++){all[ai]=[];for(let q=0;q<8;q++){
  m.currentSheetIndex=si;m.currentActionIndex=ai;m.currentFrameIndex=q;
  const im=cm.getCompositeImageData(si,ai,q);assert(im.data.some((v,i)=>i%4===3&&v),'主体非空');
  cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);
  player.sheetIndex=si;player.actionIndex=ai;player.currentFrame=q;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data);
  const blob=await ex.exportFrameAsBlob(si,ai,q),b=Buffer.from(await blob.arrayBuffer());assert.deepEqual(Array.from(png.decode(b).data),Array.from(im.data));
  assert.equal(PE.frameTiming.effectiveDelay(m.spriteSheets[si],m.spriteSheets[si].actions[ai].frames[q]),timing[q]);
  fs.writeFileSync(dir+`/frame-${ai}-${q}.png`,b);all[ai].push(Uint8Array.from(im.data));
  const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
  for(let bg=0;bg<2;bg++){ctx.fillStyle=bg?'#302d39':'#e3dfe8';ctx.fillRect(q*108,(ai*2+bg)*108,108,108);ctx.drawImage(tile,q*108,(ai*2+bg)*108,108,108);}
  if(ai===2){assert(!world(m,front,ai,q).some((v,i)=>i%4===3&&v));m.layers[front].visible=false;assert.deepEqual(cm.getCompositeImageData(si,ai,q).data,im.data);m.layers[front].visible=true;}
 }}
 fs.writeFileSync(dir+'/contact.png',contact.toBuffer('image/png'));
 const checks=createCanvas(864,3*4*108),cx=checks.getContext('2d');cx.imageSmoothingEnabled=false;const visible=m.layers.map(l=>l.visible);
 for(let ai=0;ai<3;ai++)for(let mode=0;mode<4;mode++)for(let q=0;q<8;q++){
  m.layers.forEach((l,i)=>{l.visible=visible[i];if(mode===0&&i===front)l.visible=false;if(mode===1&&i===rear)l.visible=false;if(mode===2&&/眼睛/.test(l.name))l.visible=false;if(mode===3)l.visible=i===rear;});
  const im=new PE.CanvasManager(document.createElement('canvas'),m).getCompositeImageData(si,ai,q);assert(im.data.some((v,i)=>i%4===3&&v));const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);cx.fillStyle=mode%2?'#302d39':'#e3dfe8';cx.fillRect(q*108,(ai*4+mode)*108,108,108);cx.drawImage(tile,q*108,(ai*4+mode)*108,108,108);
 }
 fs.writeFileSync(dir+'/layer-checks.png',checks.toBuffer('image/png'));return all;
}
(async()=>{
 if(process.argv[2]==='publish'){
  const records=JSON.parse(fs.readFileSync(out+'/studies.json'));
  const first=await fetch(url(source.id));assert(first.ok);fs.writeFileSync(out+'/source-at-publish.json',await first.text());
  for(const s of records){const dir=out+'/'+s.code,p=JSON.parse(fs.readFileSync(dir+'/candidate.json')),r=await fetch(url(s.id));assert.equal(r.status,404);const put=await fetch(url(s.id),{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':'none'},body:JSON.stringify(p)});const msg=await put.text();assert(put.ok,msg);fs.writeFileSync(dir+'/save-response.txt',put.status+'\n'+msg);const back=await fetch(url(s.id));assert(back.ok);const text=await back.text();assert.deepEqual(JSON.parse(text),p);fs.writeFileSync(dir+'/api-readback.json',text);s.etag=back.headers.get('etag');s.apiReadback=true;console.log('PASS create '+s.code+' '+s.url);}
  const last=await fetch(url(source.id));assert(last.ok);const latest=await last.text();fs.writeFileSync(out+'/source-after-publish.json',latest);
  fs.writeFileSync(out+'/publish-verification.json',JSON.stringify({studies:records,sourceNotWritten:true,sourceUnchangedDuringPublication:sha(latest)===sha(fs.readFileSync(out+'/source-at-publish.json'))},null,2));return;
 }
 assert.equal(before.layers[rear].name,'头发 / 用户 / 后发');assert.equal(before.layers[front].name,'前发');
 const base=await load(before),records=[],images=[];
 for(const spec of specs){
  const dir=out+'/'+spec.code;fs.mkdirSync(dir,{recursive:true});const p=structuredClone(before),sheet=p.spriteSheets[si],old=before.spriteSheets[si],atlas=createCanvas(288,108),ctx=atlas.getContext('2d'),src=new Image();src.src=old.imageDataURL;
  p.name=`头发动效学习${spec.code}·${spec.name}`;p.currentSheetIndex=si;p.currentActionIndex=1;p.currentFrameIndex=0;p.currentLayerIndex=rear;
  for(let ai=0;ai<3;ai++){
   sheet.actions[ai].frames=map.map((from,q)=>({...structuredClone(old.actions[ai].frames[from]),sourceX:q*36,sourceY:ai*36,duration:timing[q]}));
   for(let q=0;q<8;q++){const f=old.actions[ai].frames[map[q]];ctx.drawImage(src,f.sourceX,f.sourceY,36,36,q*36,ai*36,36,36);}
   for(let li=0;li<p.layers.length;li++)for(let q=0;q<8;q++){const f=before.layers[li].frameData?.[`8_${ai}_${map[q]}`],key=`8_${ai}_${q}`;if(f)p.layers[li].frameData[key]=structuredClone(f);else delete p.layers[li].frameData[key];}
   const anchor=world(base,rear,ai,0),palette=new Set();for(let i=0;i<anchor.length;i+=4)if(anchor[i+3])palette.add(Buffer.from(anchor.subarray(i,i+4)).toString('hex'));
   for(let q=1;q<8;q++){
    const dy=map[q]>=2?2:0,data=bend(vertical(anchor,dy,spec.tipY[q],ai),spec,ai,q,dy);
    assert.equal(components(data).length,components(anchor).length,`${spec.code}/${ai}/${q} 不能断发`);
    assert.deepEqual(components(data).filter(n=>n<=2),components(anchor).filter(n=>n<=2));
    for(let y=0;y<19;y++)assert.deepEqual(data.subarray((y+dy)*144,(y+dy+1)*144),anchor.subarray(y*144,(y+1)*144),'发根跟头不横摆');
    for(let i=0;i<data.length;i+=4){assert(data[i+3]===0||data[i+3]===255);if(data[i+3])assert(palette.has(Buffer.from(data.subarray(i,i+4)).toString('hex')),'不改色阶');}
    p.layers[rear].frameData[`8_${ai}_${q}`]=encode(data);
    if(ai!==2){const short=world(base,front,ai,map[q]),warped=bend(short,spec,ai,q,dy,true);for(let y=0;y<20+dy;y++)assert.deepEqual(warped.subarray(y*144,(y+1)*144),short.subarray(y*144,(y+1)*144),'不改上半刘海');p.layers[front].frameData[`8_${ai}_${q}`]=encode(warped);}
   }
   for(let q=0;q<8;q++)if(ai===2)p.layers[front].frameData[`8_${ai}_${q}`]=structuredClone(before.layers[front].frameData['8_2_0']);
   for(const li of [rear,front])assert.deepEqual(p.layers[li].frameData[`8_${ai}_0`],before.layers[li].frameData[`8_${ai}_0`]);
  }
  sheet.columns=8;sheet.imageDataURL=atlas.toDataURL();sheet.useFrameDurations=true;
  const recovery=structuredClone(p);for(const k of ['name','currentSheetIndex','currentActionIndex','currentFrameIndex','currentLayerIndex'])recovery[k]=before[k];recovery.spriteSheets[si]=structuredClone(before.spriteSheets[si]);
  for(let li=0;li<p.layers.length;li++){
   for(const key of Object.keys(recovery.layers[li].frameData||{}))if(key.startsWith('8_'))delete recovery.layers[li].frameData[key];
   for(const [key,f]of Object.entries(before.layers[li].frameData||{}))if(key.startsWith('8_'))recovery.layers[li].frameData[key]=structuredClone(f);
   if(![rear,front].includes(li))for(let ai=0;ai<3;ai++)for(let q=0;q<8;q++)assert.deepEqual(p.layers[li].frameData[`8_${ai}_${q}`],before.layers[li].frameData?.[`8_${ai}_${map[q]}`]);
  }
  assert.deepEqual(recovery,before);fs.writeFileSync(dir+'/restore-extra-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(dir+'/restore-extra-copy.json')),before);
  images.push(await render(p,dir));fs.writeFileSync(dir+'/candidate.json',JSON.stringify(p));
  const id='draft-hair-study-'+spec.code.toLowerCase()+'-'+crypto.randomUUID();records.push({...spec,id,url:'http://localhost:8765/index.html?project='+id});
  console.log('PASS '+spec.code+': 24 main/preview/PNG + 96 layer tests; original anchor cels, non-hair and non-idle data protected.');
 }
 const differences=[];for(let a=0;a<3;a++)for(let b=a+1;b<3;b++)for(let ai=0;ai<3;ai++){let count=0;for(let q=0;q<8;q++)for(let i=0;i<5184;i+=4)if(!Buffer.from(images[a][ai][q].subarray(i,i+4)).equals(Buffer.from(images[b][ai][q].subarray(i,i+4))))count++;assert(count>30,'三套必须在每个方向有真实像素运动差异');differences.push({a:specs[a].code,b:specs[b].code,direction:ai,changedPixelPositions:count});}
 fs.writeFileSync(out+'/studies.json',JSON.stringify(records,null,2));fs.writeFileSync(out+'/verification.json',JSON.stringify({sourceSHA256:sha(raw),timing,totalMs:400,map,distinctMotionDifferences:differences,mainPreviewPNGFrames:72,layerTests:288,allFirstAnchorsUnchanged:true,nonHairDrawingUnchanged:true,otherActionsUnchanged:true,restoreExtraCopiesVerified:true,backFrontHairTransparent:true,browserChecked:false},null,2));
 console.log('PASS: 3 genuinely different motion studies × 3 directions; all 9 pair/direction pixel comparisons differ.');console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
