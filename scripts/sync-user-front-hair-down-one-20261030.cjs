const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),backup=path.join(root,'备份/20261030-用户调位后头发下移-1793349082924'),out=path.join(root,'自检记录/用户调位同步-头发再降一像素-20261030');
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),{filename:f});
const decode=async raw=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function imageCanvas(d){const c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);return c;}
function shift(d,dy){const r=new ImageData(d.width,d.height);for(let y=0;y<d.height;y++)for(let x=0;x<d.width;x++){
  const i=(y*d.width+x)*4;if(y+dy>=d.height){assert.equal(d.data[i+3],0,'Do not crop hair');continue;}
  r.data.set(d.data.subarray(i,i+4),((y+dy)*d.width+x)*4);
}return r;}
function encoded(d,prior){return {...prior,width:d.width,height:d.height,dataURL:imageCanvas(d).toDataURL('image/png')};}
async function prepare(){
  fs.mkdirSync(out,{recursive:true});
  const bytes=fs.readFileSync(path.join(backup,'original.json')),meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json')));assert.equal(sha(bytes),meta.sha256);
  const raw=JSON.parse(bytes),candidate=structuredClone(raw),p=await decode(raw);
  const previous=await decode(JSON.parse(fs.readFileSync(path.join(root,'自检记录/参考眼睛清晰像素重建-20261030/api-readback.json'))));
  const si=8,ai=1,front=198,rear=7,eye=197,key=fi=>`${si}_${ai}_${fi}`;
  assert.equal(raw.spriteSheets[si].name,'original32_idle');assert.equal(raw.spriteSheets[si].actions[ai].direction,'down');
  for(const li of [front,rear,eye])assert.equal(raw.layers[li].locked,false);
  const anchor=p.layers[front].getFrameData(key(0)),oldShift=shift(previous.layers[front].getFrameData(key(0)),2),userDelta=[];
  for(let y=0;y<36;y++)for(let x=0;x<36;x++){
    const i=(y*36+x)*4;if(!Buffer.from(anchor.data.subarray(i,i+4)).equals(Buffer.from(oldShift.data.subarray(i,i+4))))userDelta.push({x,y,rgba:[...anchor.data.subarray(i,i+4)]});
  }
  assert(userDelta.length>20);assert(userDelta.every(d=>d.y<=17),'Unexpected user edits: re-inspect anchor');
  const anchorEye=raw.layers[eye].frameData[key(0)].placement;assert.deepEqual(anchorEye,{x:5.7,y:15,w:24,h:16});
  const changes=[];
  for(let fi=0;fi<4;fi++){
    const k=key(fi),headDy=fi<2?0:2;
    // Keep each original cel's lower-hair motion; transfer only the user's actual corrections.
    let synced=fi===0?PE.utils.cloneImageData(anchor):shift(p.layers[front].getFrameData(k),2);
    if(fi>0)for(const d of userDelta){const i=((d.y+headDy)*36+d.x)*4,j=(d.y*36+d.x)*4;assert.deepEqual([...synced.data.subarray(i,i+4)],[...oldShift.data.subarray(j,j+4)],'User correction overlaps different animation geometry');synced.data.set(d.rgba,i);}
    const lowered=new ImageData(36,36),seam=11+headDy;
    for(let y=0;y<36;y++)for(let x=0;x<36;x++){
      const srcY=y<seam?y:y-1,i=(y*36+x)*4,j=(srcY*36+x)*4;lowered.data.set(synced.data.subarray(j,j+4),i);
    }
    for(let y=0;y<seam;y++)assert.deepEqual(lowered.data.subarray(y*144,(y+1)*144),synced.data.subarray(y*144,(y+1)*144),'User crown remains exact');
    for(let x=0;x<36;x++)assert.equal(synced.data[(35*36+x)*4+3],0);
    const back=p.layers[rear].getFrameData(k),backDy=fi===0?1:3,newBack=shift(back,backDy);
    candidate.layers[front].frameData[k]=encoded(lowered,raw.layers[front].frameData[k]);
    candidate.layers[rear].frameData[k]=encoded(newBack,raw.layers[rear].frameData[k]);
    const fd=candidate.layers[eye].frameData[k];fd.placement={...anchorEye,y:anchorEye.y+headDy};
    assert.equal(fd.dataURL,raw.layers[eye].frameData[k].dataURL,'Eye drawing stays exact');
    changes.push({key:k,headDy,eyePlacement:fd.placement,rearShiftFromCurrent:backDy,frontLowerShift:1,crownThroughRow:seam-1});
  }
  for(const li of [front,rear,eye]){
    const original=raw.layers[li],modified=candidate.layers[li];
    for(const k of Object.keys(original.frameData))if(!k.startsWith('8_1_'))assert.deepEqual(modified.frameData[k],original.frameData[k],'Other direction unchanged');
    const layerCopy=structuredClone(modified);layerCopy.frameData=original.frameData;assert.deepEqual(layerCopy,original,'Layer settings unchanged');
  }
  const copy=structuredClone(candidate);for(const li of [front,rear,eye])copy.layers[li]=raw.layers[li];assert.deepEqual(copy,raw,'All unrelated data, user clothes/walk edits and selection remain exact');
  const after=await decode(candidate),cm=new PE.CanvasManager(document.createElement('canvas'),after),oldCM=new PE.CanvasManager(document.createElement('canvas'),p),ex=new PE.ExportManager();ex.init(after,cm);
  const comparison=createCanvas(1152,4*310),c=comparison.getContext('2d');c.imageSmoothingEnabled=false;
  for(let mode=0;mode<2;mode++)for(let state=0;state<2;state++){
    const model=state?after:p,manager=state?cm:oldCM,row=mode*2+state;
    for(const [i,l]of model.layers.entries())if(l.name.startsWith('头发 /')&&i!==front)l.visible=mode===0?raw.layers[i].visible:false;
    for(let fi=0;fi<4;fi++){
      const d=manager.getCompositeImageData(si,ai,fi,true,10);assert(d.data.some((v,i)=>i%4===3&&v));
      c.fillStyle=mode?'#333541':'#e8dfd7';c.fillRect(fi*288,row*310,288,310);c.fillStyle=mode?'white':'#333';c.font='14px sans-serif';c.fillText(`${state?'AFTER':'USER SAVED'} ${mode?'front only':'full hair'} #${fi+1}`,fi*288+7,row*310+18);c.drawImage(imageCanvas(d),fi*288,row*310+22,288,288);
    }
  }
  fs.writeFileSync(path.join(out,'用户稿与同步稿-全部四帧.png'),comparison.toBuffer('image/png'));
  for(const [i,l]of after.layers.entries())l.visible=candidate.layers[i].visible;
  for(const [i,l]of p.layers.entries())l.visible=raw.layers[i].visible;
  for(let direction=0;direction<3;direction++)if(direction!==ai)for(let fi=0;fi<4;fi++)assert.deepEqual(cm.getCompositeImageData(si,direction,fi,true,3).data,oldCM.getCompositeImageData(si,direction,fi,true,3).data);
  const player=new PE.AnimationPlayer();after.selectFrame(si,ai,0);player.init(document.createElement('canvas'),after,cm);
  const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8'),boundsCode=studio.slice(studio.indexOf('  function bounds(image)'),studio.indexOf('  const frameList=')),previewCode=studio.slice(studio.indexOf('  app.animationPlayer._renderPreviewFrame=function(){'),studio.indexOf('  const originalSetTool='));
  vm.runInNewContext(boundsCode+previewCode,{app:{project:after,canvasManager:cm,animationPlayer:player},PE,document});
  for(let fi=0;fi<4;fi++){
    after.selectFrame(si,ai,fi);cm.canvas.width=432;cm.canvas.height=432;cm.zoom=12;cm.showGrid=false;cm.centerView();cm.render();
    assert.deepEqual(cm.offscreenCtx.getImageData(0,0,432,432).data,cm.getCompositeImageData(si,ai,fi,true,12).data,'Actual main render compositing');
    const blob=await ex.exportFrameAsBlob(si,ai,fi),buf=Buffer.from(await blob.arrayBuffer()),im=await loadImage(buf),test=createCanvas(im.width,im.height);test.getContext('2d').drawImage(im,0,0);
    assert.deepEqual(test.getContext('2d').getImageData(0,0,im.width,im.height).data,cm.getCompositeImageData(si,ai,fi,true,3).data,'PNG roundtrip');
    fs.writeFileSync(path.join(out,`待机正面-${fi+1}.png`),buf);player.currentFrame=fi;player._renderPreviewFrame();fs.writeFileSync(path.join(out,`动画预览-${fi+1}.png`),player.canvas.toBuffer('image/png'));
    if(fi===0)fs.writeFileSync(path.join(out,'主画布-同步后.png'),cm.canvas.toBuffer('image/png'));
  }
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({userAnchor:'saved front idle cel 1',userCorrectionPixels:userDelta.length,changes,onlyLayers:[rear,eye,front],onlyDirection:'front idle',eyePixelsUnchanged:true,allOtherDataUnchanged:true,userCrownRetained:true,sideBackCompositesUnchanged:true,mainRenderChecked:true,pngRoundtripChecked:true,studioAnimationPathRendered:true,browserTested:false},null,2));
  fs.writeFileSync(path.join(out,'恢复说明.txt'),'原稿：'+path.join(backup,'original.json')+'\n需要恢复时先GET当前工程及ETag，仅合并备份的layers[7,197,198]中8_1_0至8_1_3帧；比较后续用户改动，禁止整份旧稿覆盖。PUT原工程URL，使用X-Pixel-Editor:1与If-Match版本校验。\n');
  console.log('PREPARED: latest saved user eyes + hair synchronized to four front idle cels; lower hair down one more pixel; user crown retained.');
}
async function commit(){
  const meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json'))),candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'))),url=meta.url,r=await fetch(url);assert(r.ok);assert.equal(r.headers.get('etag'),meta.etag,'New user save: stop and merge');assert.deepEqual(await r.json(),JSON.parse(fs.readFileSync(path.join(backup,'original.json'))));
  const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(candidate)}),reply=await put.text();fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:put.status,etag:put.headers.get('etag'),body:reply},null,2));assert.equal(put.status,200,reply);
  const back=await fetch(url);assert(back.ok);const text=await back.text();assert.deepEqual(JSON.parse(text),candidate);fs.writeFileSync(path.join(out,'api-readback.json'),text);console.log('SAVED HTTP 200; exact API readback verified.');
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
