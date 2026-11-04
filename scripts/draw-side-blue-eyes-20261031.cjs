const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),backup=path.join(root,'备份/20261031-用户嘴巴同步与侧面眼睛-1793405367831'),out=path.join(root,'自检记录/侧面蓝瞳-20261031');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'));
const decode=async raw=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;
function imageCanvas(d){const c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);return c;}
async function prepare(){
  fs.mkdirSync(out,{recursive:true});const bytes=fs.readFileSync(path.join(backup,'original.json')),meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json')));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
  const raw=JSON.parse(bytes),candidate=structuredClone(raw),si=raw.spriteSheets.findIndex(s=>s.name==='original32_idle'),ai=raw.spriteSheets[si].actions.findIndex(a=>a.direction==='side'),li=raw.layers.findIndex(l=>l.sheetIndex===si&&l.name==='眼睛 / 浅蓝·仅眼睛可编辑画布');assert(li>=0);assert.equal(raw.layers[li].locked,false);
  assert(!Object.keys(raw.layers[li].frameData).some(k=>k.startsWith(`${si}_${ai}_`)),'Existing saved side eyes: inspect before replacing');
  const palette={p:'#ffd3de',b:'#a57c7e',k:'#5e4d51',W:'#fefefe',D:'#4361b5',B:'#5d84e5',L:'#8aaff0',A:'#c3dafe',r:'#fcabc1'};
  const near=['...pppp..','..pbbbp..','.pbkkkkp.','pbkWWDkp.','bkWDDDBkp','pWBBBBBkp','pWLLLLLBp','pWAAAAALp','.rLLLLLrp','..rrrrrp.'];
  const far=['.ppp..','pbkbp.','bkkkbp','kWDkbp','pDBBkp','pBLLBp','pLALBp','pAAALp','.rLLrp','..rrp.'];
  assert(near.every(row=>row.length===9));assert(far.every(row=>row.length===6));
  const source=createCanvas(36,16),ctx=source.getContext('2d');
  for(const [grid,x0]of [[near,2],[far,16]])for(let y=0;y<grid.length;y++)for(let x=0;x<grid[y].length;x++)if(grid[y][x]!=='.'){ctx.fillStyle=palette[grid[y][x]];ctx.fillRect(x0+x,2+y,1,1);}
  const pixels=ctx.getImageData(0,0,36,16);assert(pixels.data.every((v,i)=>i%4!==3||v===0||v===255));fs.writeFileSync(path.join(out,'侧面蓝瞳-36x16透明源.png'),source.toBuffer('image/png'));
  fs.writeFileSync(path.join(out,'侧面眼型像素格.json'),JSON.stringify({palette,near,far,source:[36,16],nearOrigin:[2,2],farOrigin:[16,2],placementSize:[18,8],nearWidth:4.5,farWidth:3},null,2));
  const before=await decode(raw),positions=[];
  for(let fi=0;fi<4;fi++){
    const key=`${si}_${ai}_${fi}`,head=before.layers.find(l=>l.sheetIndex===si&&l.name==='head'&&l.getFrameData(key)),hd=head.getFrameData(key);assert(hd);let top=hd.height;
    for(let y=0;y<hd.height;y++)for(let x=0;x<hd.width;x++)if(hd.data[(y*hd.width+x)*4+3])top=Math.min(top,y);
    const placement={x:16,y:top+12,w:18,h:8};PE.utils.validateImagePlacement(placement,before.spriteSheets[si].actions[ai].frames[fi]);
    candidate.layers[li].frameData[key]={width:36,height:16,dataURL:source.toDataURL('image/png'),placement};positions.push({key,headTop:top,placement});
  }
  const check=structuredClone(candidate);for(const {key}of positions)delete check.layers[li].frameData[key];assert.deepEqual(check,raw,'Only add four side-eye cels; mouth, front eyes, hair and every other datum remain exact');
  const p=await decode(candidate),cm=new PE.CanvasManager(document.createElement('canvas'),p),oldCM=new PE.CanvasManager(document.createElement('canvas'),before);
  for(const {key,placement}of positions){
    const head=p.layers.find(l=>l.sheetIndex===si&&l.name==='head'&&l.getFrameData(key)).getFrameData(key),mask=createCanvas(360,360),eyeMask=createCanvas(360,360);
    PE.utils.drawImageData(mask.getContext('2d'),head,0,0,10);const eye=PE.utils.cloneImageData(pixels);eye.placement=placement;PE.utils.drawImageData(eyeMask.getContext('2d'),eye,0,0,10);
    const h=mask.getContext('2d').getImageData(0,0,360,360).data,e=eyeMask.getContext('2d').getImageData(0,0,360,360).data;
    assert(e.some((v,i)=>i%4===3&&v));for(let i=3;i<e.length;i+=4)if(e[i])assert(h[i],'Eyes must stay on the actual side head, not float outside');
  }
  const contacts=createCanvas(864,1296),c=contacts.getContext('2d');c.imageSmoothingEnabled=false;
  for(let mode=0;mode<3;mode++)for(let state=0;state<2;state++){
    const model=state?p:before,manager=state?cm:oldCM,row=mode*2+state;
    for(const [i,l]of model.layers.entries()){if(l.name.startsWith('头发 /'))l.visible=mode===0?raw.layers[i].visible:false;if(l.name.startsWith('服装 /'))l.visible=mode!==2?raw.layers[i].visible:false;}
    for(let fi=0;fi<4;fi++){
      const image=manager.getCompositeImageData(si,ai,fi,true,10);assert(image.data.some((v,i)=>i%4===3&&v));
      c.fillStyle=mode===1?'#333541':'#e9e0d8';c.fillRect(fi*216,row*216,216,216);c.drawImage(imageCanvas(image),fi*216,row*216+12,204,204);c.fillStyle=mode===1?'white':'#333';c.font='12px sans-serif';c.fillText(`${state?'SIDE EYES':'BEFORE'} #${fi+1}`,fi*216+4,row*216+13);
    }
  }
  fs.writeFileSync(path.join(out,'侧面修改前后-全部四帧-穿衣裸身.png'),contacts.toBuffer('image/png'));
  for(const [i,l]of p.layers.entries())l.visible=candidate.layers[i].visible;for(const [i,l]of before.layers.entries())l.visible=raw.layers[i].visible;
  for(let direction=0;direction<3;direction++)if(direction!==ai)for(let fi=0;fi<4;fi++)assert.deepEqual(cm.getCompositeImageData(si,direction,fi,true,10).data,oldCM.getCompositeImageData(si,direction,fi,true,10).data);
  assert(!Object.keys(candidate.layers[li].frameData).some(k=>k.startsWith(`${si}_2_`)),'Rear view has no eyes');
  const ex=new PE.ExportManager();ex.init(p,cm);p.selectFrame(si,ai,0);const player=new PE.AnimationPlayer();player.init(document.createElement('canvas'),p,cm);
  const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8'),bounds=studio.slice(studio.indexOf('  function bounds(image)'),studio.indexOf('  const frameList=')),preview=studio.slice(studio.indexOf('  app.animationPlayer._renderPreviewFrame=function(){'),studio.indexOf('  const originalSetTool='));vm.runInNewContext(bounds+preview,{app:{project:p,canvasManager:cm,animationPlayer:player},PE,document});
  for(let fi=0;fi<4;fi++){
    p.selectFrame(si,ai,fi);cm.canvas.width=432;cm.canvas.height=432;cm.zoom=12;cm.showGrid=false;cm.centerView();cm.render();const scale=cm.offscreenCanvas.width/36;assert.deepEqual(cm.offscreenCtx.getImageData(0,0,36*scale,36*scale).data,cm.getCompositeImageData(si,ai,fi,true,scale).data);
    if(fi===0)fs.writeFileSync(path.join(out,'主画布-侧面蓝瞳.png'),cm.canvas.toBuffer('image/png'));
    const blob=await ex.exportFrameAsBlob(si,ai,fi),buf=Buffer.from(await blob.arrayBuffer()),image=await loadImage(buf),test=createCanvas(image.width,image.height);test.getContext('2d').drawImage(image,0,0);assert.deepEqual(test.getContext('2d').getImageData(0,0,image.width,image.height).data,cm.getCompositeImageData(si,ai,fi,true,image.width/36).data);
    fs.writeFileSync(path.join(out,`侧面待机-${fi+1}-透明.png`),buf);player.currentFrame=fi;player._renderPreviewFrame();fs.writeFileSync(path.join(out,`动画预览-${fi+1}.png`),player.canvas.toBuffer('image/png'));
    const thumb=document.createElement('canvas');vm.runInNewContext(bounds+'paintThumbnail(thumb,image);',{thumb,image:cm.getCompositeImageData(si,ai,fi,true,2),document});fs.writeFileSync(path.join(out,`缩略图-${fi+1}.png`),thumb.toBuffer('image/png'));
  }
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({layerIndex:li,positions,nearFarWidths:[4.5,3],redesignedForThreeQuarterView:true,opaqueHardPixels:true,mouthCompletelyUnchanged:true,frontBackCompositesUnchanged:true,allOtherDataUnchanged:true,mainRenderAndExportChecked:true,studioAnimationAndThumbnailsRendered:true,userDraftNotRefreshed:true},null,2));console.log('PREPARED: four independently designed side idle eye cels, near/far widths 4.5/3; all existing data including mouth and hair unchanged.');
}
async function commit(){
  const meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json'))),candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'))),r=await fetch(meta.url);assert(r.ok);assert.equal(r.headers.get('etag'),meta.etag,'Concurrent user save: stop and merge');assert.deepEqual(await r.json(),JSON.parse(fs.readFileSync(path.join(backup,'original.json'))));
  const saved=await fetch(meta.url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(candidate)}),reply=await saved.text();fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:saved.status,etag:saved.headers.get('etag'),body:reply},null,2));assert.equal(saved.status,200,reply);
  const back=await fetch(meta.url);assert(back.ok);const text=await back.text();assert.deepEqual(JSON.parse(text),candidate);fs.writeFileSync(path.join(out,'api-readback.json'),text);console.log('SAVED HTTP 200; exact API readback verified.');
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
