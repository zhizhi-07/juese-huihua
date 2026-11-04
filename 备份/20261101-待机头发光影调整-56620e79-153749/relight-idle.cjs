const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict'),crypto=require('crypto');
const out=__dirname,root=path.resolve(out,'../..'),png=require(path.join(root,'scripts/png.cjs'));
const url='http://127.0.0.1:8765/api/project?id=character-56620e79-ce79-4fd9-b49c-081f7bc57d67';
const raw=fs.readFileSync(out+'/original.json','utf8'),before=JSON.parse(raw),p=structuredClone(before),edits=[];
const decode=f=>png.decode(Buffer.from(f.dataURL.split(',')[1],'base64'));
const polygons={
 front:{
   0:[[[25,9],[28,11],[29,15],[28,20],[26,22],[25,18],[25,14]],[[10,19],[12,19],[12,24],[11,25],[10,22]],[[25,21],[28,20],[27,25],[26,26]]],
   1:[[[25,9],[27,11],[29,15],[27,18],[25,17],[24,14]],[[10,18],[12,17],[12,21],[11,23],[10,21]],[[24,18],[27,18],[26,22],[24,23]]]
 },
 rear:{
   0:[[[10,17],[12,18],[12,24],[14,27],[12,29],[10,26]],[[25,15],[28,16],[28,24],[30,28],[28,30],[25,26]]],
   1:[[[9,17],[11,18],[11,24],[13,27],[11,29],[9,26]],[[24,16],[27,17],[27,24],[29,28],[27,30],[24,26]]],
   2:[[[25,9],[27,12],[28,16],[28,20],[27,23],[26,25],[28,28],[26,30],[24,32],[21,32],[23,29],[23,27],[24,25],[25,23],[24,19],[24,15]],[[17,7],[18,7],[19,9],[21,11],[20,12],[18,10]],[[12,28],[15,30],[15,32],[12,32],[11,30]]]
 }
};
function inside(x,y,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;}return yes;}
(async()=>{
 const mode=process.argv[2]||'build';
 if(mode==='publish'||mode==='restore'){
   const c=JSON.parse(fs.readFileSync(out+'/candidate.json','utf8')),r=await fetch(url);assert(r.ok);assert.deepEqual(await r.json(),mode==='publish'?before:c,'工程已有新保存，停止覆盖');
   const s=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':mode==='publish'?fs.readFileSync(out+'/etag.txt','utf8').trim():r.headers.get('etag')},body:JSON.stringify(mode==='publish'?c:before)});assert(s.ok,'PUT '+s.status+' '+await s.text());
   const check=await fetch(url);assert(check.ok);assert.deepEqual(await check.json(),mode==='publish'?c:before);fs.writeFileSync(out+'/'+mode+'-result.json',JSON.stringify({apiReadback:true,time:new Date().toISOString()},null,2));console.log('PASS '+mode+': If-Match PUT and API readback');return;
 }
 assert.equal(mode,'build');assert.equal(p.layers[10].name,'头发 / 用户 / 后发');assert.equal(p.layers[191].name,'前发');
 for(const li of [10,191])for(const [key,frame]of Object.entries(p.layers[li].frameData)){
   const [si,ai,fi]=key.split('_').map(Number);assert.equal(si,8);if(ai===2&&li===191){assert(!decode(frame).data.some((v,i)=>i%4===3&&v));continue;}
   const im=decode(frame),old=Uint8Array.from(im.data),r=frame.placement||{x:0,y:0},dy=fi>=2?2:0;let count=0;
   for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){
     const i=(y*im.width+x)*4;if(!im.data[i+3])continue;
     const hex=Buffer.from(im.data.subarray(i,i+3)).toString('hex');if(!['d1d1d1','b2b2b2','e3e3e3'].includes(hex))continue;
     let wx=x+r.x,wy=y+r.y,sy=wy-dy,sx=wx;
     if(li===10){
       if(wy>=26&&(fi===1||fi===2))sx--;
       if(wy>20+dy)sy=20+(wy-20-dy)*13/(13-dy);
     }
     const type=li===10?'rear':'front';let shadow=(polygons[type][ai]||[]).some(poly=>inside(sx+.5,sy+.5,poly));
     // Preserve the artist's existing small curled-lock shading; remove the long cap streaks instead.
     if(li===10&&ai!==2&&sy>=27)shadow=hex==='b2b2b2';
     const keepLight=li===191&&hex==='e3e3e3'&&sy<=9&&sx>=11&&sx<=18;
     const value=keepLight?227:shadow?178:209;
     if(im.data[i]!==value||im.data[i+1]!==value||im.data[i+2]!==value){
       edits.push({layer:li,key,x,y,before:Array.from(old.subarray(i,i+4)),after:[value,value,value,im.data[i+3]]});im.data[i]=im.data[i+1]=im.data[i+2]=value;count++;
     }
   }
   for(let i=0;i<im.data.length;i+=4){assert.equal(im.data[i+3],old[i+3],'轮廓、透明度不得改变');if(Math.max(old[i],old[i+1],old[i+2])<160)assert.deepEqual(im.data.subarray(i,i+4),old.subarray(i,i+4),'描边不得改变');}
   if(count)frame.dataURL='data:image/png;base64,'+png.encode(im.width,im.height,im.data).toString('base64');
 }
 const recovery=structuredClone(p);for(const i of [10,191])recovery.layers[i]=structuredClone(before.layers[i]);assert.deepEqual(recovery,before,'只有待机头发色块可以改变');
 for(const li of [10,191])for(const [key,frame]of Object.entries(p.layers[li].frameData)){const a=structuredClone(frame),b=structuredClone(before.layers[li].frameData[key]);delete a.dataURL;delete b.dataURL;assert.deepEqual(a,b,'位置、尺寸和放置参数不变');}
 fs.writeFileSync(out+'/restore-test-copy.json',JSON.stringify(recovery));assert.deepEqual(JSON.parse(fs.readFileSync(out+'/restore-test-copy.json','utf8')),before);
 const {createCanvas,ImageData,Image}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
 global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload()}};
 for(const n of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',n+'.js'),'utf8'));
 const models=[];for(const data of [before,p])models.push((await new PE.ExportManager().importProject(new Blob([JSON.stringify(data)]))).project);
 const contact=createCanvas(1152,864),cx=contact.getContext('2d');cx.imageSmoothingEnabled=false;
 const firsts=createCanvas(432,648),fc=firsts.getContext('2d');fc.imageSmoothingEnabled=false;
 for(let state=0;state<2;state++){
   const model=models[state],cm=new PE.CanvasManager(document.createElement('canvas'),model),ex=new PE.ExportManager();ex.project=model;ex.canvasManager=cm;
   const anim=new PE.AnimationPlayer();anim.previewScale=1;anim.init(document.createElement('canvas'),model,cm);
   for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){
     model.currentSheetIndex=8;model.currentActionIndex=ai;model.currentFrameIndex=fi;const im=cm.getCompositeImageData(8,ai,fi);assert(im.data.some((v,i)=>i%4===3&&v));
     cm.render();assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36,36).data,im.data);anim.sheetIndex=8;anim.actionIndex=ai;anim.currentFrame=fi;anim._renderPreviewFrame();assert.deepEqual(anim.ctx.getImageData(0,0,36,36).data,im.data);
     const encoded=Buffer.from(await(await ex.exportFrameAsBlob(8,ai,fi)).arrayBuffer());assert.deepEqual(Array.from(png.decode(encoded).data),Array.from(im.data));
     const tile=createCanvas(36,36);tile.getContext('2d').putImageData(im,0,0);
     for(let bg=0;bg<2;bg++){const x=(state*4+fi)*144,y=(bg*3+ai)*144;cx.fillStyle=bg?'#302d39':'#e3dfe8';cx.fillRect(x,y,144,144);cx.drawImage(tile,x,y,144,144);}
     if(fi===0){fc.fillStyle='#e3dfe8';fc.fillRect(state*216,ai*216,216,216);fc.drawImage(tile,state*216,ai*216,216,216);}
     fs.writeFileSync(out+`/${state?'after':'before'}-${ai}-${fi}.png`,encoded);
   }
 }
 // Standalone back/front inspection uses only temporary visibility changes in the test model.
 const layers=createCanvas(864,648),lc=layers.getContext('2d');lc.imageSmoothingEnabled=false;
 for(let state=0;state<2;state++)for(let ai=0;ai<3;ai++)for(let part=0;part<2;part++){
   const model=models[state],index=[10,191][part],tile=createCanvas(36,36),im=model.layers[index].getFrameData(`8_${ai}_0`);if(im)PE.utils.drawImageData(tile.getContext('2d'),im,0,0,1);
   const x=(state*2+part)*216,y=ai*216;lc.fillStyle='#302d39';lc.fillRect(x,y,216,216);lc.drawImage(tile,x,y,216,216);
 }
 fs.writeFileSync(out+'/comparison-all-frames.png',contact.toBuffer('image/png'));fs.writeFileSync(out+'/comparison-first-frames.png',firsts.toBuffer('image/png'));fs.writeFileSync(out+'/hair-layers.png',layers.toBuffer('image/png'));
 fs.writeFileSync(out+'/candidate.json',JSON.stringify(p));fs.writeFileSync(out+'/pixel-diff.json',JSON.stringify(edits,null,2));
 fs.writeFileSync(out+'/verification.json',JSON.stringify({originalSHA256:crypto.createHash('sha256').update(raw).digest('hex'),changedPixelPositions:edits.length,changedCels:[...new Set(edits.map(e=>e.layer+':'+e.key))],allAlphaAndOutlinePixelsUnchanged:true,allFramePlacementsUnchanged:true,eyeBodyHandAndOtherActionsUnchanged:true,noCanvasExpansion:true,noNewAnimation:true,noNewHighlightColors:true,mainPreviewPNG12IdleFramesMatch:true,restoreExtraCopyVerified:true,browserChecked:false},null,2));
 console.log('PASS build: '+edits.length+' interior color changes only; all silhouettes, dark outlines, placements, eyes/body and other actions unchanged; 12 idle frames main/preview/PNG match.');
})().catch(e=>{console.error(e);process.exitCode=1});
