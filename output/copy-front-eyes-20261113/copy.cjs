const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const {createCanvas,loadImage}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=__dirname,base='http://127.0.0.1:8765/api/project?id=',sourceId='draft-conflict-1793762650078-819fdffe',targetId='base-outlined-1794365455561',key='1_1_0';
(async()=>{await fetch('http://127.0.0.1:8765/api/projects');async function read(id,label){const r=await fetch(base+id);assert(r.ok);const text=await r.text();fs.writeFileSync(dir+'/'+label+'.json',text);return {j:JSON.parse(text),etag:r.headers.get('etag'),sha256:crypto.createHash('sha256').update(text).digest('hex')};}
const source=await read(sourceId,'source'),target=await read(targetId,'original'),j=structuredClone(target.j);
const sources=source.j.layers.filter(l=>l.sheetIndex===1&&l.visible&&/眼睛/.test(l.name)&&l.frameData[key]);assert.equal(sources.length,1);
const indices=j.layers.map((l,i)=>l.sheetIndex===1&&l.visible&&l.name==='五官 / 眼睛'&&l.frameData[key]?i:-1).filter(i=>i>=0);assert.equal(indices.length,1);const idx=indices[0];assert(!j.layers[idx].hairAnimation&&!j.layers[idx].hairAnimationId,'Do not modify a live-linked eye layer');
j.layers[idx].frameData[key]=structuredClone(sources[0].frameData[key]);
const check=structuredClone(j);check.layers[idx].frameData[key]=target.j.layers[idx].frameData[key];assert.deepEqual(check,target.j);
assert.deepEqual(j.layers[idx].frameData[key],sources[0].frameData[key]);
fs.writeFileSync(dir+'/candidate.json',JSON.stringify(j));fs.writeFileSync(dir+'/revisions.json',JSON.stringify({source:{id:sourceId,etag:source.etag,sha256:source.sha256},target:{id:targetId,etag:target.etag,sha256:target.sha256}},null,2));
const c=createCanvas(272,272),cx=c.getContext('2d'),sub=createCanvas(34,34),sc=sub.getContext('2d');sc.imageSmoothingEnabled=false;
for(const l of j.layers){let cel=l.frameData?.[key];if(l.sheetIndex!==1||!l.visible||l.isGroup||!cel)continue;sc.globalAlpha=l.opacity??1;const image=await loadImage(cel.dataURL),r=cel.placement||{x:0,y:0,w:cel.width,h:cel.height};sc.drawImage(image,r.x*2,r.y*2,r.w*2,r.h*2);}
cx.fillStyle=j.bgColor;cx.fillRect(0,0,272,272);cx.imageSmoothingEnabled=false;cx.drawImage(sub,0,0,272,272);fs.writeFileSync(dir+'/preview.png',c.toBuffer('image/png'));
const saved=await fetch(base+targetId,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':target.etag},body:JSON.stringify(j)});assert(saved.ok,'Save failed '+saved.status);assert.deepEqual(await(await fetch(base+targetId)).json(),j);
fs.writeFileSync(dir+'/verification.json',JSON.stringify({passed:true,sourceLayer:sources[0].name,targetLayerIndex:idx,onlyCel:key,sourcePixelsAndPlacementExact:true,allOtherFieldsUnchanged:true},null,2));console.log(fs.readFileSync(dir+'/verification.json','utf8'));
})().catch(e=>{console.error(e);process.exitCode=1});
