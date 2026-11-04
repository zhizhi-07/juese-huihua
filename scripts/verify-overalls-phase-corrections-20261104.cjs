const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {body,raster,encode,compose}=require('./try-idle-overalls-20261104.cjs');
const {fit}=require('./recalculate-overalls-feet-20261104.cjs'),{preview}=require('./sync-user-overalls-20261104.cjs');
const {createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=path.resolve(process.argv[2]),before=JSON.parse(fs.readFileSync(dir+'/before.json')),p=structuredClone(before),name='服装 / 算法背带裤';
function merged(p,si,ai,fi){
  const f=p.spriteSheets[si].actions[ai].frames[fi],cv=createCanvas(f.width,f.height),ctx=cv.getContext('2d'),key=`${si}_${ai}_${fi}`;
  for(const l of PE.getRenderLayers(p,si,ai))if(l.name===name&&PE.isLayerVisible(p,l,si)&&l.frameData[key]){const im=raster(l.frameData[key],f.width,f.height),tile=createCanvas(f.width,f.height);tile.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.data),f.width,f.height),0,0);ctx.globalAlpha=l.opacity??1;ctx.drawImage(tile,0,0);}
  return {width:f.width,height:f.height,data:ctx.getImageData(0,0,f.width,f.height).data};
}
function head(p,si,ai,fi){const key=`${si}_${ai}_${fi}`,f=p.spriteSheets[si].actions[ai].frames[fi],l=p.layers.find(l=>l.name==='head'&&l.frameData[key]);assert(l);return raster(l.frameData[key],f.width,f.height);}
const prior=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../output/overalls-sit-refine-20261104-1793780029706/calibration.json'))),sitRegression=[];
for(const ai of [0,1]){
  const src={body:body(p,3,ai,0),clothes:merged(p,3,ai,0)},cal=prior.find(c=>c.direction===p.spriteSheets[3].actions[ai].direction);
  for(let fi=0;fi<4;fi++){
    const out=fit(src,body(p,3,ai,fi),{soleReference:src.body,soles:cal.soles,collar:{sourceHead:head(p,3,ai,0),targetHead:head(p,3,ai,fi)}});
    assert.deepEqual(Buffer.from(out.data),Buffer.from(merged(p,3,ai,fi).data),'algorithm does not reproduce latest manual correction '+ai+'/'+fi);sitRegression.push(`3_${ai}_${fi}`);
  }
}
const src={body:body(p,1,0,0),clothes:merged(p,1,0,0)},changed=[];
for(let fi=0;fi<4;fi++){
  const key=`1_0_${fi}`,out=fit(src,body(p,1,0,fi),{shadeLegs:true}),old=merged(p,1,0,fi);
  if(Buffer.from(out.data).equals(Buffer.from(old.data)))continue;
  const layers=p.layers.filter(l=>l.name===name&&l.frameData[key]);assert.equal(layers.length,1);let pixelCount=0;
  for(let i=0;i<out.data.length;i+=4)if(!out.data.slice(i,i+4).every((v,k)=>v===old.data[i+k])){assert.deepEqual(Array.from(old.data.slice(i,i+4)),[114,149,190,255]);assert.deepEqual(Array.from(out.data.slice(i,i+4)),[82,107,149,255]);pixelCount++;}
  layers[0].frameData[key]=encode(out);changed.push({layer:p.layers.indexOf(layers[0]),key,pixels:pixelCount});
}
const normalized=structuredClone(p);for(const {layer,key}of changed)normalized.layers[layer].frameData[key]=before.layers[layer].frameData[key];assert.deepEqual(normalized,before);assert.equal(sitRegression.length,8);
fs.writeFileSync(dir+'/candidate.json',JSON.stringify(p));fs.writeFileSync(dir+'/calibration.json',JSON.stringify({sitRegression,meaning:'collar tracks head, lower denim tracks leg shading; current manually corrected sitting frames are read-only regression fixtures'},null,2));fs.writeFileSync(dir+'/checks.json',JSON.stringify({changed,sitRegression,allSitFramesBytePreserved:true,otherActionsPreserved:true},null,2));preview(p,dir);
const cv=createCanvas(840,480),ctx=cv.getContext('2d');ctx.fillStyle='#ddd5ed';ctx.fillRect(0,0,840,480);ctx.imageSmoothingEnabled=false;
for(let phase=0;phase<2;phase++){ctx.fillStyle='#292b40';ctx.font='18px YaHei';ctx.fillText(phase?'阴影校正后':'原待机侧面',10,25+phase*235);for(let fi=0;fi<4;fi++)ctx.drawImage(compose(phase?p:before,1,0,fi),10+fi*210,40+phase*235,171,171);}
fs.writeFileSync(dir+'/idle-shadow-comparison.png',cv.toBuffer('image/png'));console.log(JSON.stringify({dir,changed,sitRegression:'PASS all 8 latest manual sitting frames reproduced; no sitting writes',status:'candidate only'},null,2));
