const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {raster,body,encode,compose}=require('./try-idle-overalls-20261104.cjs');
const {fit}=require('./recalculate-overalls-feet-20261104.cjs');
const {preview}=require('./sync-user-overalls-20261104.cjs');
const {createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=path.resolve(process.argv[2]),before=JSON.parse(fs.readFileSync(dir+'/before.json')),p=structuredClone(before),name='服装 / 算法背带裤';
const oldCalibration=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../output/overalls-feet-recalc-20261104-1793779464595/calibration.json')));
function merged(p,ai,fi){
  const f=p.spriteSheets[3].actions[ai].frames[fi],cv=createCanvas(f.width,f.height),ctx=cv.getContext('2d'),key=`3_${ai}_${fi}`;
  for(const l of PE.getRenderLayers(p,3,ai))if(l.name===name&&PE.isLayerVisible(p,l,3)&&l.frameData[key]){const im=raster(l.frameData[key],f.width,f.height),tile=createCanvas(f.width,f.height);tile.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.data),f.width,f.height),0,0);ctx.globalAlpha=l.opacity??1;ctx.drawImage(tile,0,0);}
  return {width:f.width,height:f.height,data:ctx.getImageData(0,0,f.width,f.height).data};
}
const calibration=[],targets=[];
for(const ai of [0,1]){
  const im=merged(before,ai,0),src={body:body(before,3,ai,0),clothes:im},soles=[];
  for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++){const i=(y*im.width+x)*4;if(im.data[i+3]&&im.data[i]===255&&im.data[i+1]===0&&im.data[i+2]===0){soles.push([x,y]);im.data.fill(0,i,i+4);}}
  if(ai===0&&!soles.length)soles.push(...oldCalibration.soles);
  assert.equal(soles.length,8,'expected confirmed 8 sole pixels per view');calibration.push({direction:before.spriteSheets[3].actions[ai].direction,body:encode(src.body),clothes:encode(src.clothes),soles});
  for(let fi=0;fi<before.spriteSheets[3].actions[ai].frames.length;fi++){
    const key=`3_${ai}_${fi}`,target=body(p,3,ai,fi),out=fit(src,target,{soleReference:src.body,soles});
    if(fi===0)assert.deepEqual(Buffer.from(out.data),Buffer.from(src.clothes.data),'manual non-red pixels changed');
    const layers=p.layers.filter(l=>l.name===name&&l.frameData?.[key]);assert(layers.length);const primary=layers[0];
    for(const l of layers)l.frameData[key]=encode(l===primary?out:{width:out.width,height:out.height,data:new Uint8Array(out.data.length)});
    targets.push({key,soles});
  }
}
const normalized=structuredClone(p),changed=[];
for(let li=0;li<p.layers.length;li++)for(const [key,cel]of Object.entries(p.layers[li].frameData||{}))if(JSON.stringify(cel)!==JSON.stringify(before.layers[li].frameData[key])){
  assert(p.layers[li].name===name&&/^3_[01]_[0-3]$/.test(key),'unauthorized change '+key);changed.push({layer:li,key});normalized.layers[li].frameData[key]=before.layers[li].frameData[key];
}
assert.deepEqual(normalized,before,'other actions or metadata changed');
for(const {key,soles}of targets){const [,ai,fi]=key.split('_').map(Number),im=merged(p,ai,fi),b=body(p,3,ai,fi),full=compose(p,3,ai,fi).getContext('2d').getImageData(0,0,b.width,b.height);for(const [x,y]of soles){const i=(y*b.width+x)*4;assert.equal(im.data[i+3],0,'clothing covers sole');assert.deepEqual(Array.from(full.data.slice(i,i+4)),Array.from(b.data.slice(i,i+4)),'visible sole differs from base');}for(let i=0;i<im.data.length;i+=4)assert(!(im.data[i+3]&&im.data[i]===255&&im.data[i+1]===0&&im.data[i+2]===0),'red leaked');}
assert.equal(targets.length,8);fs.writeFileSync(dir+'/candidate.json',JSON.stringify(p));fs.writeFileSync(dir+'/calibration.json',JSON.stringify(calibration,null,2));fs.writeFileSync(dir+'/checks.json',JSON.stringify({targets,changed,unchanged:'all other actions, sitting back, non-clothing layers, metadata',manualFirstFramesPreservedExceptRed:true,renderedSolePixelsChecked:64},null,2));preview(p,dir);
const cv=createCanvas(650,470),ctx=cv.getContext('2d');ctx.fillStyle='#ddd5ed';ctx.fillRect(0,0,650,470);ctx.imageSmoothingEnabled=false;for(const ai of [0,1]){ctx.fillStyle='#292b40';ctx.font='18px YaHei';ctx.fillText(ai?'坐姿正面 · 新一轮':'坐姿侧面 · 新一轮',10,30+ai*225);for(let fi=0;fi<4;fi++){const tile=compose(p,3,ai,fi);ctx.drawImage(tile,10+fi*160,45+ai*225,tile.width*6,tile.height*6);}}fs.writeFileSync(dir+'/sit-preview.png',cv.toBuffer('image/png'));
console.log(JSON.stringify({dir,updatedSitFrames:8,changedEntries:changed.length,solePixelsChecked:64,otherActionsUnchanged:true,status:'PASS; candidate only'},null,2));
