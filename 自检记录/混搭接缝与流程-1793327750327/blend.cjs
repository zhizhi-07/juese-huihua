const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const file=n=>path.join(__dirname,n),before=JSON.parse(fs.readFileSync(file('before.json'))),p=structuredClone(before);
(async()=>{
 const layer=p.layers.find(l=>l.sheetIndex===8&&l.name==='头发 / 80011 / 前发'),changes=[];
 assert(layer);
 // These pixels are inside the overlapping cap, not the silhouette or face edge.
 const pixels=[[13,5,209],[14,5,209],[12,6,209]];
 for(let y=7;y<=12;y++)for(let x=11;x<=12;x++)pixels.push([x,y,209]);
 pixels.push([11,13,178],[12,13,209],[11,14,178],[12,14,178]);
 for(let fi=0;fi<4;fi++){
  let key=`8_0_${fi}`,f=layer.frameData[key],c=createCanvas(36,36),ctx=c.getContext('2d');
  ctx.drawImage(await loadImage(f.dataURL),0,0);let im=ctx.getImageData(0,0,36,36),old=im.data.slice(),n=0;
  for(let [x,y,v]of pixels){y+=fi>=2?2:0;let i=(y*36+x)*4;assert.equal(im.data[i+3],255,'No holes patched');if(im.data[i]!==v){n++;im.data.set([v,v,v,255],i)}}
  for(let i=3;i<im.data.length;i+=4)assert.equal(im.data[i],old[i],'Silhouette changed');
  ctx.putImageData(im,0,0);layer.frameData[key]={width:36,height:36,dataURL:c.toDataURL()};changes.push({key,changedPixels:n,alphaUnchanged:true});
 }
 for(let i=0;i<p.layers.length;i++)if(p.layers[i]!==layer)assert.deepEqual(p.layers[i],before.layers[i]);
 const stripped=structuredClone(layer),original=structuredClone(before.layers.find(l=>l.sheetIndex===8&&l.name===layer.name));
 for(let fi=0;fi<4;fi++){delete stripped.frameData[`8_0_${fi}`];delete original.frameData[`8_0_${fi}`]}
 assert.deepEqual(stripped,original);
 fs.writeFileSync(file('candidate.json'),JSON.stringify(p));fs.writeFileSync(file('接缝定点改动.json'),JSON.stringify({pixels,frames:changes},null,2));
 console.log('PASS: recolored only side-cap overlap pixels in four front-hair frames; no alpha, outline, face, other-layer or other-direction changes');
})().catch(e=>{console.error(e);process.exitCode=1});
