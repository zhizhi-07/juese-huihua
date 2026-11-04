const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createCanvas,Image,ImageData,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const root=path.resolve(__dirname,'..'),backup=path.join(root,'备份/20261031-同步待机与侧面首帧-1793408736812'),out=path.join(root,'自检记录/同步待机与侧面首帧-20261031');
global.window=global;global.Image=Image;global.ImageData=ImageData;global.document={addEventListener(){},createElement:()=>Object.assign(createCanvas(1,1),{style:{}})};global.FileReader=class{async readAsText(f){this.result=await f.text();this.onload();}};
for(const f of ['core','canvas','export','animation'])vm.runInThisContext(fs.readFileSync(path.join(root,'js',f+'.js'),'utf8'));
const decode=async raw=>(await new PE.ExportManager().importProject(new Blob([JSON.stringify(raw)]))).project;
function canvas(d){const c=createCanvas(d.width,d.height);c.getContext('2d').putImageData(d,0,0);return c;}
function encode(d,before){return {...before,width:d.width,height:d.height,dataURL:canvas(d).toDataURL('image/png')};}
function firstRow(d){for(let y=0;y<d.height;y++)if(d.data.subarray(y*d.width*4,(y+1)*d.width*4).some((v,i)=>i%4===3&&v))return y;throw new Error('Empty head');}
function render(p,si,ai,fi,mode='actual',scale=10){
  const visible=p.layers.map(l=>l.visible);p.selectFrame(si,ai,fi);
  if(mode==='no-hair'||mode==='naked')for(const l of p.layers)if(l.name.startsWith('头发 /'))l.visible=false;
  if(mode==='naked')for(const l of p.layers)if(l.name.startsWith('服装 /'))l.visible=false;
  const cm=new PE.CanvasManager(document.createElement('canvas'),p),d=cm.getCompositeImageData(si,ai,fi,true,scale);p.layers.forEach((l,i)=>l.visible=visible[i]);assert(d.data.some((v,i)=>i%4===3&&v),'Preview must have a character');return d;
}
async function prepare(){
  fs.mkdirSync(out,{recursive:true});const bytes=fs.readFileSync(path.join(backup,'original.json')),meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json')));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256);
  const raw=JSON.parse(bytes),candidate=structuredClone(raw),old=await decode(raw);assert.equal(raw.spriteSheets[8].name,'original32_idle');assert.equal(raw.spriteSheets[10].name,'original32_sit');assert.equal(raw.spriteSheets[10].actions[0].direction,'side');
  const changed=[],eye=197,front=198,rear=195;
  // Copy the approved pose, while the lower locks absorb one row of the two-row breath.
  for(let fi=1;fi<4;fi++){
    const key=`8_0_${fi}`,dy=firstRow(old.layers[139].getFrameData(key))-firstRow(old.layers[139].getFrameData('8_0_0'));assert.equal(dy,fi<2?0:2);
    for(const [li,cut]of [[front,19],[rear,28]]){
      const source=old.layers[li].getFrameData('8_0_0'),next=new ImageData(36,36);
      for(let y=0;y<36;y++){const sy=dy===0?y:y<cut+dy?y-dy:y-dy+1;if(sy>=0&&sy<36)next.data.set(source.data.subarray(sy*144,(sy+1)*144),y*144);}
      assert.equal(firstRow(next),firstRow(source)+dy);assert(next.data.every((v,i)=>i%4!==3||v===0||v===255));
      candidate.layers[li].frameData[key]=dy===0?structuredClone(raw.layers[li].frameData['8_0_0']):encode(next,raw.layers[li].frameData[key]);changed.push([li,key]);
    }
    const source=structuredClone(raw.layers[eye].frameData['8_0_0']);source.placement.y+=dy;candidate.layers[eye].frameData[key]=source;changed.push([eye,key]);
    assert.deepEqual(candidate.layers[eye].frameData[key].dataURL,raw.layers[eye].frameData['8_0_0'].dataURL);
  }
  // Sitting already has the proper bent legs, sole and clothing. Only adapt its fringe and left eye.
  const sitKey='10_0_0',sitFront=200,source=old.layers[sitFront].getFrameData(sitKey),next=new ImageData(32,32);
  for(let y=0;y<32;y++){const sy=y<=10?y:y<=13?10:y-3;next.data.set(source.data.subarray(sy*128,(sy+1)*128),y*128);}
  for(let y=11;y<=13;y++){
    const xs=[];for(let x=0;x<32;x++)if(next.data[(y*32+x)*4+3])xs.push(x);
    for(const x of xs){const i=(y*32+x)*4;if(next.data[i]===178&&x>xs[0]+1&&x<xs.at(-1)-1)next.data.set([209,209,209,255],i);}
  }
  for(let y=29;y<32;y++)assert(source.data.subarray(y*128,(y+1)*128).every(v=>v===0),'No source hair cropped');
  assert.deepEqual(next.data.subarray(0,11*128),source.data.subarray(0,11*128));assert.deepEqual(next.data.subarray(14*128),source.data.subarray(11*128,29*128));candidate.layers[sitFront].frameData[sitKey]=encode(next,raw.layers[sitFront].frameData[sitKey]);changed.push([sitFront,sitKey]);
  const approved=old.layers[eye].getFrameData('8_0_0'),left=new ImageData(18,24);assert.deepEqual([approved.width,approved.height],[54,48]);
  for(let y=0;y<24;y++)left.data.set(approved.data.subarray(y*approved.width*4,(y*approved.width+18)*4),y*18*4);
  const placement={x:52/3,y:15,w:6,h:8},head=old.layers[168].getFrameData(sitKey);let eyePixels=0;
  for(let y=0;y<24;y++)for(let x=0;x<18;x++)if(left.data[(y*18+x)*4+3]){
    eyePixels++;
    for(const [u,v]of [[.01,.01],[.99,.01],[.01,.99],[.99,.99]]){
      const px=Math.floor(placement.x+(x+u)/3),py=Math.floor(placement.y+(y+v)/3),i=(py*32+px)*4;
      assert.deepEqual([...head.data.subarray(i,i+4)],[254,237,225,255],`Eye must stay inside light face, not its black outline: ${x},${y} -> ${px},${py}`);
    }
  }
  assert(eyePixels>100);fs.writeFileSync(path.join(out,'坐姿左眼-透明源.png'),canvas(left).toBuffer('image/png'));
  const eyeLayer={sheetIndex:10,isGroup:false,parent:165,depth:0,name:'眼睛 / 浅蓝·坐姿侧面',visible:true,locked:false,opacity:1,frameData:{[sitKey]:{width:18,height:24,dataURL:canvas(left).toDataURL('image/png'),placement}}},eyeIndex=200;
  candidate.layers.splice(eyeIndex,0,eyeLayer);
  for(const l of candidate.layers)if(l.parent!=null&&l.parent>=eyeIndex)l.parent++;
  if(candidate.currentLayerIndex>=eyeIndex)candidate.currentLayerIndex++;
  const restored=structuredClone(candidate);restored.layers.splice(eyeIndex,1);
  for(const l of restored.layers)if(l.parent!=null&&l.parent>eyeIndex)l.parent--;
  if(restored.currentLayerIndex>eyeIndex)restored.currentLayerIndex--;
  for(const [li,key]of changed)restored.layers[li].frameData[key]=raw.layers[li].frameData[key];assert.deepEqual(restored,raw,'No unrelated fields/layers/cels changed');
  for(let li=0;li<raw.layers.length;li++)assert.deepEqual(candidate.layers[li>=eyeIndex?li+1:li].frameData?.['8_0_0'],raw.layers[li].frameData?.['8_0_0'],'Approved idle first frame must stay exact');
  const p=await decode(candidate),sheet=createCanvas(4*360,4*360),ctx=sheet.getContext('2d');ctx.imageSmoothingEnabled=false;
  assert.deepEqual(render(p,8,0,0).data,render(old,8,0,0).data,'Approved first composite exact, not merely raw cells');
  assert(p.layers.indexOf(p.layers[eyeIndex])<p.layers.findIndex(l=>l.sheetIndex===10&&l.name==='头发 / 80011 / 前发'),'Eye below front hair');
  for(let mode=0;mode<2;mode++)for(let fi=0;fi<4;fi++){
    for(const [row,project]of [[mode*2,old],[mode*2+1,p]]){
      const im=render(project,8,0,fi,mode?'no-hair':'actual');ctx.fillStyle=mode?'#e4dce9':'#373b46';ctx.fillRect(fi*360,row*360,360,360);ctx.drawImage(canvas(im),fi*360,row*360,360,360);ctx.fillStyle=mode?'#333':'#fff';ctx.font='15px sans-serif';ctx.fillText((project===old?'BEFORE ':'AFTER ')+(mode?'NO HAIR ':'')+'#'+(fi+1),fi*360+5,row*360+18);
    }
  }
  fs.writeFileSync(path.join(out,'待机侧面四帧-同步前后.png'),sheet.toBuffer('image/png'));
  const sitting=createCanvas(3*384,2*384),sc=sitting.getContext('2d');sc.imageSmoothingEnabled=false;
  for(let mode=0;mode<2;mode++)for(const [col,project,kind]of [[0,old,'actual'],[1,p,'actual'],[2,p,'no-hair']]){
    const im=render(project,10,0,0,kind);sc.fillStyle=mode?'#373b46':'#e4dce9';sc.fillRect(col*384,mode*384,384,384);sc.drawImage(canvas(im),col*384,mode*384,384,384);sc.fillStyle=mode?'#fff':'#333';sc.font='15px sans-serif';sc.fillText(col===0?'BEFORE':col===1?'AFTER / SINGLE LEFT EYE':'AFTER / FACE CHECK',col*384+5,mode*384+18);
  }
  fs.writeFileSync(path.join(out,'坐姿侧面首帧-前后与脸内范围.png'),sitting.toBuffer('image/png'));
  const all=createCanvas(4*288,3*288),ac=all.getContext('2d');ac.imageSmoothingEnabled=false;
  for(let ai=0;ai<3;ai++)for(let fi=0;fi<4;fi++){const im=render(p,8,ai,fi,'actual',6);if(ai!==0)assert.deepEqual(im.data,render(old,8,ai,fi,'actual',6).data);ac.fillStyle='#dcd7e5';ac.fillRect(fi*288,ai*288,288,288);ac.drawImage(canvas(im),fi*288,ai*288,288,288);}fs.writeFileSync(path.join(out,'同步后-待机三方向十二帧.png'),all.toBuffer('image/png'));
  const cm=new PE.CanvasManager(document.createElement('canvas'),p),ex=new PE.ExportManager();ex.init(p,cm);
  for(const [si,ai,fi,name]of [[8,0,0,'待机侧面首帧'],[8,0,1,'待机侧面第二帧'],[8,0,2,'待机侧面第三帧'],[8,0,3,'待机侧面第四帧'],[10,0,0,'坐姿侧面首帧']]){
    p.selectFrame(si,ai,fi);const f=p.getCurrentFrame();cm.canvas.width=f.width*12;cm.canvas.height=f.height*12;cm.zoom=12;cm.showGrid=false;cm.centerView();cm.render();const scale=cm.offscreenCanvas.width/f.width;assert.deepEqual(cm.offscreenCtx.getImageData(0,0,f.width*scale,f.height*scale).data,cm.getCompositeImageData(si,ai,fi,true,scale).data);
    const blob=await ex.exportFrameAsBlob(si,ai,fi),buf=Buffer.from(await blob.arrayBuffer()),im=await loadImage(buf),png=createCanvas(im.width,im.height);png.getContext('2d').drawImage(im,0,0);assert.deepEqual(png.getContext('2d').getImageData(0,0,im.width,im.height).data,cm.getCompositeImageData(si,ai,fi,true,im.width/f.width).data);fs.writeFileSync(path.join(out,name+'-透明导出.png'),buf);
  }
  const studio=fs.readFileSync(path.join(root,'js/studio.js'),'utf8'),thumbCode=studio.slice(studio.indexOf('  function bounds(image)'),studio.indexOf('  const frameList='));for(const [si,name]of [[8,'待机'],[10,'坐姿']]){const thumb=document.createElement('canvas');vm.runInNewContext(thumbCode+'paintThumbnail(thumb,image);',{thumb,image:render(p,si,0,0,'actual',6),document});fs.writeFileSync(path.join(out,name+'-实际缩略图路径.png'),thumb.toBuffer('image/png'));}
  fs.writeFileSync(path.join(out,'candidate.json'),JSON.stringify(candidate));fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify({changed:changed.map(([li,key])=>[li>=eyeIndex?li+1:li,key]),newLayerIndex:eyeIndex,idleApprovedFirstExact:true,idleFirstCompositeExact:true,idleHeadOffsets:[0,0,2,2],lowerHairOffsets:[0,0,1,1],sitOnlyFirst:true,sitSingleLeftEyeNotMirrored:true,sitEyePixels:eyePixels,sitEyeEveryNativePixelInsideSkin:true,sitEyeBelowFrontHair:true,sitMouthAbsent:true,bodyHandsClothingOtherActionsUnchanged:true,allMetadataVisibilityPreserved:true,parentIndicesRemappedForInsertedEye:true,mainRenderAndPngPathsChecked:true,thumbnailPathChecked:true,browserNotRefreshed:true},null,2));console.log('PREPARED: side idle first preserved, next 3 cels synced with head breath and compressed lower locks; sitting side first single left eye inside face, fringe adapted, existing seated body/sole/clothes untouched.');
}
async function commit(){
  const meta=JSON.parse(fs.readFileSync(path.join(backup,'metadata.json'))),candidate=JSON.parse(fs.readFileSync(path.join(out,'candidate.json'))),current=await fetch(meta.url);assert(current.ok);assert.equal(current.headers.get('etag'),meta.etag,'Version changed: stop and merge');assert.deepEqual(await current.json(),JSON.parse(fs.readFileSync(path.join(backup,'original.json'))));
  const response=await fetch(meta.url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(candidate)}),body=await response.text();fs.writeFileSync(path.join(out,'save-response.json'),JSON.stringify({status:response.status,etag:response.headers.get('etag'),body},null,2));assert.equal(response.status,200,body);
  const read=await fetch(meta.url);assert(read.ok);const back=await read.text();assert.deepEqual(JSON.parse(back),candidate);fs.writeFileSync(path.join(out,'api-readback.json'),back);console.log('SAVED HTTP 200; exact API readback verified.');
}
(process.argv.includes('--commit')?commit():prepare()).catch(e=>{console.error(e);process.exitCode=1;});
