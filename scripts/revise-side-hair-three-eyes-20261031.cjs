const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),backup=path.join(root,'备份/20261031-侧发下移三像素与侧眼返修-1793405915153'),out=path.join(root,'自检记录/侧发下移三格与圆眼首帧-20261031');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'));
const decode=async raw=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;
function imageCanvas(d){const c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);return c;}
function encode(d,before){return {...before,width:d.width,height:d.height,dataURL:imageCanvas(d).toDataURL('image/png')};}
async function prepare(){
  fs.mkdirSync(out,{recursive:true});const bytes=fs.readFileSync(path.join(backup,'original.json')),meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json')));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
  const raw=JSON.parse(bytes),hairOnly=structuredClone(raw),candidate=structuredClone(raw),before=await decode(raw),key='8_0_0';
  const front=198,rear=195,eye=197;assert.equal(raw.spriteSheets[8].actions[0].direction,'side');
  for(const li of [front,rear]){
    assert.equal(raw.layers[li].locked,false);const source=before.layers[li].getFrameData(key),next=new ImageData(36,36);assert.deepEqual([source.width,source.height],[36,36]);
    // Keep the fitted crown; extend its middle by three rows while moving all lower hair down three.
    for(let y=0;y<36;y++){const sy=y<=10?y:y<=13?10:y-3;next.data.set(source.data.subarray(sy*144,(sy+1)*144),y*144);}
    // The inserted cap is a filled volume, not three extra copies of a strand-shadow stripe.
    for(let y=10;y<=13;y++){
      const xs=[];for(let x=0;x<36;x++)if(next.data[(y*36+x)*4+3])xs.push(x);
      for(const x of xs){const i=(y*36+x)*4;if(next.data[i]===178&&x>xs[0]+1&&x<xs.at(-1)-1)next.data.set([209,209,209,255],i);}
    }
    for(let y=33;y<36;y++)for(let x=0;x<36;x++)assert.equal(source.data[(y*36+x)*4+3],0,'No cropped hair');
    assert.deepEqual(next.data.subarray(0,10*144),source.data.subarray(0,10*144),'Crown top remains exact');
    assert.deepEqual(next.data.subarray(14*144),source.data.subarray(11*144,33*144),'Lower fringe/locks/tail shift exactly three');
    candidate.layers[li].frameData[key]=encode(next,raw.layers[li].frameData[key]);hairOnly.layers[li].frameData[key]=candidate.layers[li].frameData[key];
  }
  const approved=before.layers[eye].getFrameData('8_1_0'),side=new ImageData(72,48);assert.deepEqual([approved.width,approved.height],[72,48]);
  for(let y=0;y<16;y++)for(let x=0;x<16;x++)side.data.set(approved.data.subarray(((6+y)*72+14+x)*4,((6+y)*72+15+x)*4),((6+y)*72+x)*4);
  // Rebuild the distant eye one cell narrower, retaining the round lid and two-cell highlight.
  const farColumns=[0,1,2,4,5,6];
  for(let y=0;y<16;y++)for(let col=0;col<farColumns.length;col++)for(let dx=0;dx<2;dx++){
    const i=((6+y)*72+44+farColumns[col]*2+dx)*4,j=((6+y)*72+25+col*2+dx)*4;side.data.set(approved.data.subarray(i,i+4),j);
  }
  assert(side.data.every((v,i)=>i%4!==3||v===0||v===255));
  const fitted=new ImageData(54,48);for(let y=0;y<48;y++)fitted.data.set(side.data.subarray(y*72*4,(y*72+54)*4),y*54*4);
  const sourceCanvas=imageCanvas(fitted);fs.writeFileSync(path.join(out,'侧面圆眼-透明源.png'),sourceCanvas.toBuffer('image/png'));
  const placement={x:15,y:15,w:18,h:16};candidate.layers[eye].frameData[key]={width:54,height:48,dataURL:sourceCanvas.toDataURL('image/png'),placement};
  const unchanged=structuredClone(candidate);for(const li of [front,rear,eye])unchanged.layers[li].frameData[key]=raw.layers[li].frameData[key];assert.deepEqual(unchanged,raw,'Only first side-idle cel, two hair layers and eye layer');
  const p=await decode(candidate),hair=await decode(hairOnly),cm=new PE.CanvasManager(document.createElement('canvas'),p),oldCM=new PE.CanvasManager(document.createElement('canvas'),before),hairCM=new PE.CanvasManager(document.createElement('canvas'),hair);
  const comparisons=createCanvas(1296,864),c=comparisons.getContext('2d');c.imageSmoothingEnabled=false;
  for(let mode=0;mode<2;mode++)for(const [col,model,manager,label]of [[0,before,oldCM,'BEFORE'],[1,hair,hairCM,'HAIR DOWN 3 / OLD EYES'],[2,p,cm,'HAIR DOWN 3 / ROUND EYES']]){
    if(mode)for(const l of model.layers)if(l.name.startsWith('头发 /'))l.visible=false;
    const d=manager.getCompositeImageData(8,0,0,true,10);assert(d.data.some((v,i)=>i%4===3&&v));c.fillStyle=mode?'#333541':'#e9e0d8';c.fillRect(col*432,mode*432,432,432);c.drawImage(imageCanvas(d),col*432,mode*432,432,432);c.fillStyle=mode?'white':'#333';c.font='15px sans-serif';c.fillText(label,col*432+8,mode*432+20);
  }
  fs.writeFileSync(path.join(out,'首帧修改前后-发型与眼型分步对比.png'),comparisons.toBuffer('image/png'));
  for(const [i,l]of p.layers.entries())l.visible=candidate.layers[i].visible;for(const [i,l]of before.layers.entries())l.visible=raw.layers[i].visible;
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++)if(ai!==0||fi!==0)assert.deepEqual(cm.getCompositeImageData(8,ai,fi,true,10).data,oldCM.getCompositeImageData(8,ai,fi,true,10).data,'Unapproved cels stay untouched');
  p.selectFrame(8,0,0);cm.canvas.width=432;cm.canvas.height=432;cm.zoom=12;cm.showGrid=false;cm.centerView();cm.render();const scale=cm.offscreenCanvas.width/36;assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36*scale,36*scale).data,cm.getCompositeImageData(8,0,0,true,scale).data);
  fs.writeFileSync(path.join(out,'侧面首帧-下移三格补顶与圆眼.png'),cm.canvas.toBuffer('image/png'));
  const ex=new PE.ExportManager();ex.init(p,cm);const blob=await ex.exportFrameAsBlob(8,0,0),buf=Buffer.from(await blob.arrayBuffer()),im=await loadImage(buf),test=createCanvas(im.width,im.height);test.getContext('2d').drawImage(im,0,0);assert.deepEqual(test.getContext('2d').getImageData(0,0,im.width,im.height).data,cm.getCompositeImageData(8,0,0,true,im.width/36).data);fs.writeFileSync(path.join(out,'侧面首帧-透明导出.png'),buf);
  const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8'),bounds=studio.slice(studio.indexOf('  function bounds(image)'),studio.indexOf('  const frameList=')),thumb=document.createElement('canvas');vm.runInNewContext(bounds+'paintThumbnail(thumb,image);',{thumb,image:cm.getCompositeImageData(8,0,0,true,3),document});fs.writeFileSync(path.join(out,'首帧缩略图.png'),thumb.toBuffer('image/png'));
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({trialOnly:true,key,layers:[rear,eye,front],lowerHairShift:3,crownExactRows:[0,9],extendedRows:[11,13],capShadowStripeNotRepeated:true,eyeNearOriginalRoundedCells:true,nearEyeWorldX:15,farEyeWorldX:15+25/3,eyeGapWorldPixels:3,farColumns,allOtherDataUnchanged:true,noBlur:true,other11IdleCelsUnchanged:true,mainRenderAndPngChecked:true,thumbnailRendered:true,otherFramesAwaitUserApproval:true,userBrowserNotRefreshed:true},null,2));console.log('PREPARED first side-idle cel: lower hair +3 with unchanged fitted crown; round near/far eyes and a 3-pixel gap; all other cels exact.');
}
async function commit(){
  const meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json'))),candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'))),r=await fetch(meta.url);assert(r.ok);assert.equal(r.headers.get('etag'),meta.etag,'Concurrent user save; stop and merge');assert.deepEqual(await r.json(),JSON.parse(fs.readFileSync(path.join(backup,'original.json'))));
  const saved=await fetch(meta.url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(candidate)}),reply=await saved.text();fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:saved.status,etag:saved.headers.get('etag'),body:reply},null,2));assert.equal(saved.status,200,reply);const back=await fetch(meta.url);assert(back.ok);const text=await back.text();assert.deepEqual(JSON.parse(text),candidate);fs.writeFileSync(path.join(out,'api-readback.json'),text);console.log('SAVED HTTP 200; exact API readback verified.');
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
