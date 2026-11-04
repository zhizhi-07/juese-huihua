const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const out=__dirname,root=path.resolve(out,'../..'),png=require(path.join(root,'scripts/png.cjs'));
const url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before),changed=[];
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
function componentCount(im){
 const seen=new Set();let count=0;
 for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
   const pos=y*im.width+x;if(!im.data[pos*4+3]||seen.has(pos))continue;count++;const q=[pos];seen.add(pos);
   for(let j=0;j<q.length;j++){const xx=q[j]%im.width,yy=Math.floor(q[j]/im.width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=xx+dx,ny=yy+dy,n=ny*im.width+nx;if(nx<0||ny<0||nx>=im.width||ny>=im.height||!im.data[n*4+3]||seen.has(n))continue;seen.add(n);q.push(n);}}
 }return count;
}
(async()=>{
 const mode=process.argv[2]||'build';
 if(mode==='publish'||mode==='restore'){
   const c=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8')),r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),mode==='publish'?before:c,'工程已有新保存，停止覆盖');
   const s=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':mode==='publish'?fs.readFileSync(out+'/etag.txt','utf8').trim():r.headers.get('etag')},body:JSON.stringify(mode==='publish'?c:before)});
   assert(s.ok,'PUT '+s.status+' '+await s.text());const read=await fetch(url);assert(read.ok);assert.deepEqual(await read.json(),mode==='publish'?c:before);
   fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({apiReadback:true,time:new Date().toISOString()},null,2));console.log('PASS '+mode+': version-checked PUT and API readback');return;
 }
 assert.equal(mode,'build');assert.equal(p.layers[6].name,'头发后发');assert.equal(p.layers[185].name,'眼睛 / 眼睛');assert.equal(p.layers[187].name,'前发');
 assert.equal(p.layers[181].visible,false,'只同步当前可见的新眼层');
 for(const li of [6,185,187]){
   const src=decode(before.layers[li].frameData['8_0_0']),r=before.layers[li].frameData['8_0_0'].placement||{x:0,y:0,w:36,h:36};assert.equal(src.width,r.w);assert.equal(src.height,r.h);
   if(li===6)for(const wy of [19,21]){const y=wy-r.y;for(let x=0;x<src.width;x++){const a=(y*src.width+x)*4,b=((y-1)*src.width+x)*4;assert.equal(src.data[a+3],src.data[b+3]);if(src.data[a+3])assert.deepEqual(src.data.subarray(a,a+4),src.data.subarray(b,b+4),'只压缩重复的直发段');}}
   for(let fi=1;fi<4;fi++){
     const dy=fi>=2?2:0,data=new Uint8Array(36*36*4),key=`8_0_${fi}`;
     for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){
       const i=(y*src.width+x)*4;if(!src.data[i+3])continue;const wy=y+r.y;
       if(li===6&&dy&&[19,21].includes(wy))continue;
       const xx=x+r.x+(li===6&&(fi===1||fi===2)&&wy>=26?1:0),yy=wy+dy-(li===6&&dy?(Number(wy>19)+Number(wy>21)):0);
       assert(xx>=0&&xx<36&&yy>=0&&yy<36,'不能裁掉用户像素');data.set(src.data.subarray(i,i+4),(yy*36+xx)*4);
     }
     p.layers[li].frameData[key]={width:36,height:36,dataURL:'data:image/png;base64,'+png.encode(36,36,data).toString('base64')};changed.push({index:li,name:p.layers[li].name,key});
     assert(componentCount({width:36,height:36,data})<=componentCount(src),'不能新增断发或杂点');
     if(li===185)for(let y=0;y<36;y++)for(let x=0;x<36;x++){const sx=x-r.x,sy=y-dy-r.y,expected=sx>=0&&sx<src.width&&sy>=0&&sy<src.height?src.data.subarray((sy*src.width+sx)*4,(sy*src.width+sx)*4+4):new Uint8Array(4);assert.deepEqual(data.subarray((y*36+x)*4,(y*36+x)*4+4),expected,'眼型只随头平移');}
   }
 }
 // Existing directional renderer recognizes this naming convention; do not globally move the layer.
 p.layers[6].name='头发 / 用户 / 后发';
 const restored=structuredClone(p);restored.layers[6].name=before.layers[6].name;
 for(const {index,key}of changed){if(before.layers[index].frameData[key])restored.layers[index].frameData[key]=structuredClone(before.layers[index].frameData[key]);else delete restored.layers[index].frameData[key];}
 assert.deepEqual(restored,before,'仅修改九个侧面帧及后发层方向识别名称');
 fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(restored));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json','utf8')),before);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 const contact=createCanvas(1152,864),ctx=contact.getContext('2d');ctx.imageSmoothingEnabled=false;
 for(let state=0;state<2;state++){
   const model=models[state],cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
   const anim=new PE.AnimationPlayer();anim.previewScale=1;anim.init(document.createElement('canvas'),model,cm);
   for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
     model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=fi;
     const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);
     anim.sheetIndex=8;anim.actionIndex=ai;anim.currentFrame=fi;anim._renderPreviewFrame();assert.deepEqual(anim.ctx.getImageData(0,0,36,36).data,im.data);
     const encoded=Buffer.from(await(await ex.exportFrameAsBlob(8,ai,fi)).arrayBuffer());assert.deepEqual(Array.from(png.decode(encoded).data),Array.from(im.data));
     const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);for(let bg=0;bg<2;bg++){const x=(state*4+fi)*144,y=(bg*3+ai)*144;ctx.fillStyle=bg?'#302d39':'#e3dfe8';ctx.fillRect(x,y,144,144);ctx.drawImage(tile,x,y,144,144);}
     if(state===1&&ai===0)fs.writeFileSync(out+`/side-${fi+1}.png`,encoded);
     if(ai===2&&fi===0)fs.writeFileSync(out+`/back-${state?'after':'before'}.png`,encoded);
     if(state===1&&(ai===1||(ai===2&&fi>0)||(ai===0&&fi===0))){const old=new PE.CanvasManager(document.createElement('canvas'),models[0]).getCompositeImageData(8,ai,fi);assert.deepEqual(im.data,old.data,'未授权合成画面不变');}
   }
 }
 const model=models[1],rear=model.layers[6];
 for(const ai of [0,1])assert(PE.getRenderLayers(model,8,ai).indexOf(rear)<PE.getRenderLayers(model,8,ai).findIndex(l=>l.sheetIndex===8&&l.name==='body'),'正侧后发仍在身体后面');
 const backOrder=PE.getRenderLayers(model,8,2);assert(backOrder.indexOf(rear)>backOrder.findIndex(l=>l.sheetIndex===8&&l.name==='body'),'背面后发须在身体前面');
 const comp=new PE.CanvasManager(document.createElement('canvas'),model).getCompositeImageData(8,2,0),hairCanvas=createCanvas(36,36);PE.utils.drawImageData(hairCanvas.getContext('2d'),rear.getFrameData('8_2_0'),0,0,1);const hair=hairCanvas.getContext('2d').getImageData(0,0,36,36),body=model.layers[124].getFrameData('8_2_0');let bodyCovered=0;
 for(let i=0;i<hair.data.length;i+=4)if(hair.data[i+3]===255&&body.data[i+3]){assert.deepEqual(comp.data.subarray(i,i+4),hair.data.subarray(i,i+4),'背发实际覆盖身体像素');bodyCovered++;}assert(bodyCovered>0,'必须测到真实遮挡而非空图');
 fs.writeFileSync(out+'/comparison.png',contact.toBuffer('image/png'));fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:crypto.createHash('sha256').update(raw).digest('hex'),changed,renamedLayer:{index:6,from:before.layers[6].name,to:p.layers[6].name},sideFirstFrameUnchanged:true,frontAndBackPixelsUnchanged:true,otherDataUnchanged:true,backBodyPixelsCovered:bodyCovered,mainPreviewPNGAll12FramesMatch:true,restoreExtraCopyVerified:true,browserChecked:false},null,2));
 console.log('PASS build: side first-frame preserved; 9 side cels synced; back rear hair overlays '+bodyCovered+' body pixels through existing directional renderer; other data unchanged; all 12 frames main/preview/PNG match.');
})().catch(e=>{console.error(e);process.exitCode=1});
