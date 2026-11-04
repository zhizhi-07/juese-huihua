const fs=require('fs'),path=require('path'),assert=require('assert/strict'),vm=require('vm'),crypto=require('crypto'),png=require('./png.cjs');
const root=path.resolve(__dirname,'..'),out=path.join(root,'备份/20261101-用户头发自然回摆修正-56620e79');
const url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/latest-before.json','utf8'),before=JSON.parse(raw),p=structuredClone(before);
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const changed=[];

function components(im){
 const seen=new Set(),sizes=[];
 for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
   const pos=y*im.width+x;if(!im.data[pos*4+3]||seen.has(pos))continue;
   const queue=[pos];seen.add(pos);
   for(let j=0;j<queue.length;j++){
     const xx=queue[j]%im.width,yy=Math.floor(queue[j]/im.width);
     for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
       const nx=xx+dx,ny=yy+dy,n=ny*im.width+nx;
       if(nx<0||ny<0||nx>=im.width||ny>=im.height||!im.data[n*4+3]||seen.has(n))continue;
       seen.add(n);queue.push(n);
     }
   }
   sizes.push(queue.length);
 }
 return sizes.sort((a,b)=>a-b);
}

async function publish(candidate,expected,etag){
 const r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),expected,'工程已有新保存，禁止覆盖');
 const saved=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag||r.headers.get('etag')},body:JSON.stringify(candidate)});
 assert(saved.ok,'PUT '+saved.status+' '+await saved.text());
 const readback=await fetch(url);assert(readback.ok);assert.deepEqual(await readback.json(),candidate);
}

(async()=>{
 const mode=process.argv[2]||'build';
 if(mode==='publish'||mode==='restore'){
   const candidate=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8'));
   const intermediate=mode==='publish'&&fs.existsSync(out+'/intermediate-published.json');
   await publish(mode==='publish'?candidate:before,mode==='publish'?(intermediate?JSON.parse(fs.readFileSync(out+'/intermediate-published.json','utf8')):before):candidate,mode==='publish'?fs.readFileSync(out+(intermediate?'/intermediate-etag.txt':'/latest-etag.txt'),'utf8').trim():null);
   fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({apiReadback:true,time:new Date().toISOString(),sha256:sha(JSON.stringify(mode==='publish'?candidate:before))},null,2));
   console.log('PASS '+mode+': If-Match write and API readback');return;
 }
 assert.equal(mode,'build');assert.equal(p.layers[0].name,'头发后发');
 for(const li of [0,181,185,187]){
 const anchor=before.layers[li].frameData['8_1_0'],source=decode(anchor),place=anchor.placement||{x:0,y:0,w:36,h:36};
 assert.equal(source.width,place.w);assert.equal(source.height,place.h);
 if(li===0){assert.deepEqual(place,{x:0,y:6,w:35,h:36});for(const wy of [21,23]){const y=wy-place.y;assert.deepEqual(source.data.subarray(y*source.width*4,(y+1)*source.width*4),source.data.subarray((y-1)*source.width*4,y*source.width*4));}}
 for(let fi=1;fi<4;fi++){
   const key=`8_1_${fi}`,dy=fi>=2?2:0,data=new Uint8Array(36*36*4);
   for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){
     const i=(y*source.width+x)*4;if(!source.data[i+3])continue;
     const worldY=y+place.y;if(li===0&&dy&&[21,23].includes(worldY))continue;
     // Both hanging locks bend together; never push the left/right silhouettes apart.
     const dx=li===0&&(fi===1||fi===2)&&worldY>=26?1:0,xx=x+place.x+dx,yy=worldY+dy-(li===0&&dy?(Number(worldY>21)+Number(worldY>23)):0);
     assert(xx>=0&&xx<36&&yy>=0&&yy<36,'禁止裁掉像素');
     data.set(source.data.subarray(i,i+4),(yy*36+xx)*4);
   }
   p.layers[li].frameData[key]={width:36,height:36,dataURL:'data:image/png;base64,'+png.encode(36,36,data).toString('base64')};changed.push({layer:li,name:p.layers[li].name,key});
   const now=decode(p.layers[li].frameData[key]);
   if(li===0){
     const old=decode(JSON.parse(fs.readFileSync(out+'/original.json','utf8')).layers[0].frameData[key]);
     assert.deepEqual(components(now),components(old),'不能产生断发或新杂点');
     for(let y=0;y<26;y++)for(let x=0;x<36;x++){
       const i=(y*36+x)*4;assert.deepEqual(now.data.subarray(i,i+4),old.data.subarray(i,i+4),'上半发根和接缝保持不变');
     }
   }
   if(li===181||li===185)for(let y=0;y<36;y++)for(let x=0;x<36;x++){
     const sy=y-dy-place.y,sx=x-place.x,expected=sy>=0&&sy<source.height&&sx>=0&&sx<source.width?source.data.subarray((sy*source.width+sx)*4,(sy*source.width+sx)*4+4):new Uint8Array(4);
     assert.deepEqual(now.data.subarray((y*36+x)*4,(y*36+x)*4+4),expected,'最新眼睛仅随头部平移');
   }
 }
 }
 const recovery=structuredClone(p);
 for(const {layer,key} of changed){if(before.layers[layer].frameData[key])recovery.layers[layer].frameData[key]=before.layers[layer].frameData[key];else delete recovery.layers[layer].frameData[key];}
 assert.deepEqual(recovery,before,'仅允许同步正面眼睛与前后发的其余三帧');
 fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(recovery));
 assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json','utf8')),before);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.ImageData=ImageData;global.Image=Image;
 global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
 global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const contact=createCanvas(1152,864),cx=contact.getContext('2d');cx.imageSmoothingEnabled=false;
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 for(let state=0;state<2;state++){
   const model=models[state],cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
   const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),model,cm);player.previewScale=1;
   for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
     model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=fi;
     const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));
     cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);
     player.sheetIndex=8;player.actionIndex=ai;player.currentFrame=fi;player._renderPreviewFrame();assert.deepEqual(player.ctx.getImageData(0,0,36,36).data,im.data);
     const blob=await ex.exportFrameAsBlob(8,ai,fi),encoded=Buffer.from(await blob.arrayBuffer());
     assert.deepEqual(Array.from(png.decode(encoded).data),Array.from(im.data));
     const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
     for(let bg=0;bg<2;bg++){
       const x=(state*4+fi)*144,y=(bg*3+ai)*144;cx.fillStyle=bg?'#302d39':'#e3dfe8';cx.fillRect(x,y,144,144);cx.drawImage(tile,x,y,144,144);
     }
     if(ai===1)fs.writeFileSync(out+`/${state?'new':'old'}-${fi+1}.png`,encoded);
   }
 }
 fs.writeFileSync(out+'/comparison.png',contact.toBuffer('image/png'));
 // Test only the existing branch parts, without importing other projects or changing saved visibility.
 const model=models[1],layers=createCanvas(576,576),lc=layers.getContext('2d');lc.imageSmoothingEnabled=false;
 for(let mode=0;mode<4;mode++){
   model.layers[0].visible=mode!==1;model.layers[181].visible=mode!==2;model.layers[185].visible=mode!==2;model.layers[187].visible=mode!==0;
   for(let fi=0;fi<4;fi++){
     const cm=new PE.CanvasManager(document.createElement('canvas'),model),im=cm.getCompositeImageData(8,1,fi),tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
     lc.fillStyle=mode%2?'#302d39':'#e3dfe8';lc.fillRect(fi*144,mode*144,144,144);lc.drawImage(tile,fi*144,mode*144,144,144);
   }
 }
 fs.writeFileSync(out+'/layer-checks.png',layers.toBuffer('image/png'));
 const pixels=[];
 for(const {layer,key} of changed){const old=before.layers[layer].frameData[key]?decode(before.layers[layer].frameData[key]):{data:new Uint8Array(36*36*4)},now=decode(p.layers[layer].frameData[key]);for(let y=0;y<36;y++)for(let x=0;x<36;x++){const i=(y*36+x)*4;if(!Buffer.from(old.data.subarray(i,i+4)).equals(Buffer.from(now.data.subarray(i,i+4))))pixels.push({layer,key,x,y,before:Array.from(old.data.subarray(i,i+4)),after:Array.from(now.data.subarray(i,i+4))});}}
 fs.writeFileSync(out+'/pixel-diff.json',JSON.stringify(pixels,null,2));
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:sha(raw),changed,changedPixelPositions:pixels.length,firstFrameUnchanged:true,latestEyeShapePreserved:true,latestSideHairPreserved:true,allOtherDataUnchanged:true,noNewDisconnectedComponents:true,mainPreviewPNG12FramesMatch:true,restoreExtraCopyVerified:true,browserChecked:false},null,2));
 console.log('PASS build: 12 front idle cels synchronized from latest hair and both visible eye anchors; first frame, latest eye shape, side hair and all other data preserved; no new disconnected pieces; 12 frames main/preview/PNG match.');
 console.log(out);
})().catch(e=>{console.error(e);process.exitCode=1});
