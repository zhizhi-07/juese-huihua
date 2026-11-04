const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),backup=path.join(root,'备份/20261030-eyes-reference-1793348240422'),out=path.join(root,'自检记录/参考眼睛清晰像素重建-20261030');
const url='http://127.0.0.1:8765/api/project?id=character-gold-mix-1793320553623';
global.window=global;global.Image=Image;global.ImageData=ImageData;
global.document={createElement:()=>Object.assign(createCanvas(1,1),{style:{}}),addEventListener(){}};
global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'),{filename:f});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const decode=async raw=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;
const canvas=()=>document.createElement('canvas');
function png(d){const c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);return c;}

async function prepare(){
  fs.mkdirSync(out,{recursive:true});
  const original=fs.readFileSync(path.join(backup,'original.json')),meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json')));
  assert.equal(sha(original),meta.sha256);
  const raw=JSON.parse(original),candidate=structuredClone(raw),si=raw.spriteSheets.findIndex(s=>s.name==='original32_idle'),ai=raw.spriteSheets[si].actions.findIndex(a=>a.direction==='down');
  const li=raw.layers.findIndex(l=>l.sheetIndex===si&&l.name==='眼睛 / 浅蓝·仅眼睛可编辑画布');
  assert(li>=0);assert.equal(candidate.layers[li].locked,false);
  const reference=path.join(out,'用户参考.png');
  if(!fs.existsSync(reference))fs.copyFileSync('C:/Users/ADMINI~1/AppData/Local/Temp/codex-clipboard-7b922d9d-24ea-4f8a-afe2-4d2253eac181.png',reference);
  const im=await loadImage(reference),src=createCanvas(im.width,im.height),sc=src.getContext('2d');sc.drawImage(im,0,0);
  assert.deepEqual([im.width,im.height],[167,95]);
  const ref=sc.getImageData(0,0,im.width,im.height),source=createCanvas(72,48),ctx=source.getContext('2d'),cells=[];
  // The reference is an enlarged 7 px grid; sample cell interiors, not its blurred boundaries.
  const ranges={3:[[3,7],[17,21]],4:[[2,8],[16,22]],5:[[1,8],[16,22]],6:[[1,8],[16,22]],7:[[1,8],[16,22]],8:[[1,8],[16,22]],9:[[2,8],[16,22]],10:[[2,8],[16,22]]};
  for(const [y,spans]of Object.entries(ranges))for(const [first,last]of spans)for(let x=first;x<=last;x++){
    const sx=7*x,sy=5+7*Number(y),i=(sy*im.width+sx)*4,rgb=[...ref.data.slice(i,i+3)];
    const px=12+2*x,py=2*Number(y);ctx.fillStyle=`rgb(${rgb.join(',')})`;ctx.fillRect(px,py,2,2);
    cells.push({grid:[x,Number(y)],sample:[sx,sy],rgb,destination:[px,py]});
  }
  const data=ctx.getImageData(0,0,72,48);assert.equal(cells.length,112);
  for(let i=3;i<data.data.length;i+=4)assert(data.data[i]===0||data.data[i]===255,'No antialiased alpha');
  for(const c of cells)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){
    const i=((c.destination[1]+dy)*72+c.destination[0]+dx)*4;
    assert.deepEqual([...data.data.slice(i,i+4)],[...c.rgb,255],'Exact reference cell color');
  }
  const sourcePng=source.toBuffer('image/png');fs.writeFileSync(path.join(out,'眼睛-72x48透明源画布.png'),sourcePng);
  fs.writeFileSync(path.join(out,'参考像素格.json'),JSON.stringify({referenceGrid:{step:7,centers:[0,5]},cells},null,2));
  const layer=candidate.layers[li],keys=Object.keys(layer.frameData);assert.deepEqual(keys,[0,1,2,3].map(fi=>`${si}_${ai}_${fi}`));
  for(const key of keys){const before=layer.frameData[key];assert.deepEqual([before.width,before.height],[240,160]);layer.frameData[key]={...before,width:72,height:48,dataURL:source.toDataURL('image/png')};}
  const unchanged=structuredClone(candidate);unchanged.layers[li]=raw.layers[li];assert.deepEqual(unchanged,raw,'Only target eye pixels/resolution may change');
  const p=await decode(candidate),old=await decode(raw),cm=new PE.CanvasManager(canvas(),p),oldCM=new PE.CanvasManager(canvas(),old);
  const sheet=createCanvas(4*270,6*240),s=sheet.getContext('2d');s.imageSmoothingEnabled=false;
  for(let row=0;row<6;row++){
    const model=row%2===0?old:p,manager=row%2===0?oldCM:cm,mode=Math.floor(row/2);
    for(const l of model.layers){if(l.name.startsWith('头发 /')||l.name.startsWith('发饰 /'))l.visible=mode===0?raw.layers[model.layers.indexOf(l)].visible:false;if(l.name.startsWith('服装 /'))l.visible=mode!==2?raw.layers[model.layers.indexOf(l)].visible:false;}
    for(let fi=0;fi<4;fi++){
      const d=manager.getCompositeImageData(si,ai,fi,true,3);assert(d.data.some((v,i)=>i%4===3&&v));
      s.fillStyle='#ede5de';s.fillRect(fi*270,row*240,270,240);s.fillStyle='#333';s.font='14px sans-serif';s.fillText(`${row%2?'AFTER':'BEFORE'} ${['hair + outfit','no hair','base body'][mode]} #${fi+1}`,fi*270+8,row*240+18);s.drawImage(png(d),fi*270+27,row*240+24,216,216);
    }
  }
  fs.writeFileSync(path.join(out,'修改前后-四帧-头发穿衣裸身对比.png'),sheet.toBuffer('image/png'));
  // Restore preview visibility; never save test-only layer toggles.
  for(const [i,l]of p.layers.entries())l.visible=candidate.layers[i].visible;
  for(const [i,l]of old.layers.entries())l.visible=raw.layers[i].visible;
  for(let direction=0;direction<3;direction++)if(direction!==ai)for(let fi=0;fi<4;fi++){
    const d=cm.getCompositeImageData(si,direction,fi,true,3);assert(d.data.some((v,i)=>i%4===3&&v));assert.deepEqual(d.data,oldCM.getCompositeImageData(si,direction,fi,true,3).data);
    assert(!p.layers[li].getFrameData(`${si}_${direction}_${fi}`),'No eyes in other directions');
  }
  const ex=new PE.ExportManager();ex.init(p,cm);
  const player=new PE.AnimationPlayer();p.selectFrame(si,ai,0);player.init(canvas(),p,cm);
  const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8');
  const boundsCode=studio.slice(studio.indexOf('  function bounds(image)'),studio.indexOf('  const frameList='));
  const previewCode=studio.slice(studio.indexOf('  app.animationPlayer._renderPreviewFrame=function(){'),studio.indexOf('  const originalSetTool='));
  const app={project:p,canvasManager:cm,animationPlayer:player};
  vm.runInNewContext(boundsCode+previewCode,{app,PE,document});
  const all=createCanvas(864,648),ac=all.getContext('2d');ac.fillStyle='#333541';ac.fillRect(0,0,864,648);ac.imageSmoothingEnabled=false;
  for(let direction=0;direction<3;direction++)for(let fi=0;fi<4;fi++)ac.drawImage(png(cm.getCompositeImageData(si,direction,fi,true,3)),fi*216,direction*216,216,216);
  fs.writeFileSync(path.join(out,'修改后-待机全部方向四帧-深底.png'),all.toBuffer('image/png'));
  for(let fi=0;fi<4;fi++){
    p.selectFrame(si,ai,fi);cm.canvas.width=432;cm.canvas.height=432;cm.zoom=12;cm.showGrid=false;cm.centerView();cm.render();
    const d=cm.getCompositeImageData(si,ai,fi,true,3);assert.deepEqual(cm.offscreenCtx.getImageData(0,0,108,108).data,d.data,'Main render matches composite');
    const blob=await ex.exportFrameAsBlob(si,ai,fi),bytes=Buffer.from(await blob.arrayBuffer());fs.writeFileSync(path.join(out,`待机正面-${fi+1}-透明导出.png`),bytes);
    const exported=await loadImage(bytes),ec=createCanvas(exported.width,exported.height);ec.getContext('2d').drawImage(exported,0,0);assert.deepEqual(ec.getContext('2d').getImageData(0,0,108,108).data,d.data,'Export matches composite');
    player.currentFrame=fi;player._renderPreviewFrame();
    fs.writeFileSync(path.join(out,`动画预览路径-${fi+1}.png`),player.canvas.toBuffer('image/png'));
    const thumb=canvas();vm.runInNewContext(boundsCode+'paintThumbnail(thumb,image);',{thumb,image:d,document});fs.writeFileSync(path.join(out,`缩略图路径-${fi+1}.png`),thumb.toBuffer('image/png'));
    if(fi===0)fs.writeFileSync(path.join(out,'主画布-render.png'),cm.canvas.toBuffer('image/png'));
  }
  const face=createCanvas(672,160),fc=face.getContext('2d');fc.imageSmoothingEnabled=false;fc.fillStyle='#feede1';fc.fillRect(0,0,672,160);
  fc.drawImage(im,7,22,153,57,0,0,336,126);fc.drawImage(source,14,6,44,16,336,0,336,122);
  fc.fillStyle='#333';fc.font='16px sans-serif';fc.fillText('REFERENCE (enlarged screenshot)',8,151);fc.fillText('CLEAN PIXEL GRID (no face/brows)',344,151);
  fs.writeFileSync(path.join(out,'参考与清晰像素眼睛.png'),face.toBuffer('image/png'));
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({project:meta.url,layerIndex:li,keys,source:[72,48],placementUnchanged:true,cellSizeInCharacter:2/3,referenceCells:cells.length,opaquePixels:cells.length*4,noBlur:true,allOtherDataUnchanged:true,sideBack8FramesUnchanged:true,mainRenderAndExportMatch:true,animationPreviewPathRendered:true,browserTested:false,sourceSHA256:sha(sourcePng)},null,2));
  console.log('PREPARED',out,'only layer',li,'four front idle cels; reference cell colors exact; no browser interaction.');
}
async function commit(){
  const meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json'))),before=JSON.parse(fs.readFileSync(path.join(backup,'original.json'))),candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate.json')));
  const r=await fetch(url);assert(r.ok);assert.equal(r.headers.get('etag'),meta.etag,'Concurrent update: do not overwrite');assert.deepEqual(await r.json(),before);
  const put=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(candidate)}),reply=await put.text();
  fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:put.status,etag:put.headers.get('etag'),body:reply},null,2));assert.equal(put.status,200,reply);
  const readback=await fetch(url);assert(readback.ok);const text=await readback.text();assert.deepEqual(JSON.parse(text),candidate);fs.writeFileSync(path.join(out,'api-readback.json'),text);
  fs.writeFileSync(path.join(out,'恢复说明.txt'),'原工程备份：'+path.join(backup,'original.json')+'\n恢复时先读取当前API和ETag，只合并原稿layers[197]眼层；如眼层已有后续修改，先比较再恢复。PUT同一工程接口，带X-Pixel-Editor: 1和最新If-Match；不要用整份旧工程覆盖后续编辑。\n');
  console.log('SAVED HTTP 200; exact API readback verified.');
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
