const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'备份/20261101-用户头发动效-56620e79');
const url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before),changed=[];
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const frame=data=>({width:36,height:36,dataURL:'data:image/png;base64,'+png.encode(36,36,data).toString('base64')});
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');

async function put(candidate,expected,etag){
  const r=await fetch(url);assert(r.ok);const current=await r.json();
  assert.deepEqual(current,expected,'工程已有新修改，停止整稿写入');
  const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag||r.headers.get('etag')},body:JSON.stringify(candidate)});
  assert(saved.ok,'保存失败 '+saved.status+' '+await saved.text());
  const check=await fetch(url);assert(check.ok);assert.deepEqual(await check.json(),candidate);
}

(async()=>{
 const mode=process.argv[2]||'build';
 if(mode==='publish'||mode==='restore'){
   const candidate=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8'));
   await put(mode==='publish'?candidate:before,mode==='publish'?before:candidate,mode==='publish'?fs.readFileSync(out+'/etag.txt','utf8').trim():null);
   fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({apiReadback:true,time:new Date().toISOString(),sha256:hash(JSON.stringify(mode==='publish'?candidate:before))},null,2));
   console.log('PASS '+mode+': version-checked API write and readback');return;
 }
 assert.equal(mode,'build');assert.equal(p.spriteSheets[8].frameWidth,36);
 assert.equal(p.spriteSheets[8].actions[1].direction,'down');
 assert.equal(p.layers[0].name,'头发后发');assert.equal(p.layers[185].name,'眼睛 / 眼睛');assert.equal(p.layers[187].name,'前发');
 for(const li of [0,185,187]){
   const layer=p.layers[li],anchor=before.layers[li].frameData['8_1_0'],im=decode(anchor),placement=anchor.placement||{x:0,y:0,w:36,h:36};
   assert.equal(im.width,placement.w);assert.equal(im.height,placement.h);
   if(li===0)for(const worldY of [21,23]){
     const y=worldY-placement.y;
     assert.deepEqual(im.data.subarray(y*im.width*4,(y+1)*im.width*4),im.data.subarray((y-1)*im.width*4,y*im.width*4),'只压缩重复的直发段');
   }
   for(let fi=1;fi<4;fi++){
     const key=`8_1_${fi}`;assert(!layer.frameData[key],'不覆盖既有用户帧');
     const data=new Uint8Array(36*36*4),dy=fi>=2?2:0;
     for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
       const i=(y*im.width+x)*4;if(!im.data[i+3])continue;
       const sx=x+placement.x,sy=y+placement.y;
       // Two duplicate straight-lock rows absorb breathing, keeping the existing bottom tips on canvas.
       if(li===0&&dy&&[21,23].includes(sy))continue;
       const compression=li===0&&dy?Number(sy>21)+Number(sy>23):0;
       const sway=li===0&&(fi===1||fi===2)&&sy>=30?(sx<17.5?-1:1):0;
       const xx=sx+sway,yy=sy+dy-compression;
       assert(xx>=0&&xx<36&&yy>=0&&yy<36,'不能裁掉头发或眼睛像素');
       data.set(im.data.subarray(i,i+4),(yy*36+xx)*4);
     }
     layer.frameData[key]=frame(data);changed.push({layer:li,name:layer.name,key});
     if(li===185){
       const eye=decode(layer.frameData[key]);
       for(let y=0;y<36;y++)for(let x=0;x<36;x++){
         const sourceY=y-dy,expected=sourceY>=0?im.data.subarray((sourceY*36+x)*4,(sourceY*36+x)*4+4):new Uint8Array(4);
         assert.deepEqual(eye.data.subarray((y*36+x)*4,(y*36+x)*4+4),expected);
       }
     }
   }
 }
 const restored=structuredClone(p);
 for(const {layer,key} of changed)delete restored.layers[layer].frameData[key];
 assert.deepEqual(restored,before,'除九个新增正面待机帧以外必须完全不变');
 fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(restored));
 assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json','utf8')),before,'在额外副本恢复原稿');
 for(const li of [0,187])assert.notDeepEqual(p.layers[li].frameData['8_1_0'],p.layers[li].frameData['8_1_2']);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.ImageData=ImageData;global.Image=Image;
 global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
 global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 const contact=createCanvas(1152,864),ctx=contact.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let state=0;state<2;state++){
   const model=models[state],cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
   const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
   for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
     model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=fi;
     const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v),'合成不能是空图');
     cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data,'主画布合成');
     player.sheetIndex=8;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();
     assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data,'动画预览合成');
     const blob=await ex.exportFrameAsBlob(8,ai,fi),encoded=Buffer.from(await blob.arrayBuffer());
     assert.deepEqual(Array.from(decode({dataURL:'data:image/png;base64,'+encoded.toString('base64')}).data),Array.from(im.data),'PNG导出');
     const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
     for(let bg=0;bg<2;bg++){
       const x=(state*4+fi)*144,y=(bg*3+ai)*144;ctx.fillStyle=bg?'#302d39':'#e3dfe8';ctx.fillRect(x,y,144,144);ctx.drawImage(tile,x,y,144,144);
     }
     if(state===1&&ai===1)fs.writeFileSync(out+`/front-${fi+1}.png`,encoded);
     if(ai!==1)assert.deepEqual(cm.getCompositeImageData(8,ai,fi).data,new PE.CanvasManager(document.createElement('canvas'),models[0]).getCompositeImageData(8,ai,fi).data);
   }
 }
 fs.writeFileSync(out+'/comparison.png',contact.toBuffer('image/png'));
 const model=models[1],layers=createCanvas(576,720),lc=layers.getContext('2d');lc.imageSmoothingEnabled=false;
 const visible=model.layers.map(l=>l.visible);
 for(let mode=0;mode<5;mode++){
   model.layers.forEach((l,i)=>{l.visible=visible[i];if([0,185,187].includes(i))l.visible=mode===0?i===185:mode===1?i!==187:mode===2?i!==0:mode===3?i!==185:true;});
   for(let fi=0;fi<4;fi++){
     const im=new PE.CanvasManager(document.createElement('canvas'),model).getCompositeImageData(8,1,fi),tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
     lc.fillStyle=mode%2?'#302d39':'#e3dfe8';lc.fillRect(fi*144,mode*144,144,144);lc.drawImage(tile,fi*144,mode*144,144,144);
   }
 }
 fs.writeFileSync(out+'/layer-checks.png',layers.toBuffer('image/png'));
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:hash(raw),changed,firstFrameUnchanged:true,allOtherDataUnchanged:true,restoreExtraCopyVerified:true,all12IdleFramesMainPreviewPNGMatch:true,headOffsets:[0,0,2,2],rearTailOffsets:[0,0,0,0],rearTipSpread:[0,1,1,0],browserChecked:false},null,2));
 console.log('PASS build: 9 new front idle cels; original first frame and all other data unchanged; 12 idle frames main/preview/PNG paths match.');
 console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
