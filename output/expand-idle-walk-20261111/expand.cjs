const fs=require('fs'),assert=require('assert/strict'),png=require('../../scripts/png.cjs');
const dir=__dirname,original=JSON.parse(fs.readFileSync(dir+'/original.json')),d=structuredClone(original),meta=JSON.parse(fs.readFileSync(dir+'/original-meta.json'));let count=0;
const decode=url=>png.decode(Buffer.from(url.split(',')[1],'base64'));
for(const si of [0,1]){
 const s=d.spriteSheets[si],ow=s.frameWidth,h=s.frameHeight,w=ow+2;assert.equal(ow,15);assert.equal(s.imageDataURL,'');
 s.frameWidth=w;
 for(const a of s.actions)for(const f of a.frames){assert.equal(f.width,ow);f.width=w;f.sourceX=f.sourceX/ow*w;for(const r of f.lockedRegions||[])r.x+=1;}
 for(const l of d.layers)for(const [key,f]of Object.entries(l.frameData||{})){
  if(Number(key.split('_')[0])!==si)continue;
  if(f.placement){const before=structuredClone(f);f.placement.x+=1;assert.deepEqual({...f,placement:before.placement},before);count++;continue;}assert.equal(f.width,ow);assert.equal(f.height,h);const src=decode(f.dataURL);assert.equal(src.width,ow);assert.equal(src.height,h);
  const dst=new Uint8Array(w*h*4);for(let y=0;y<h;y++)dst.set(src.data.subarray(y*ow*4,(y+1)*ow*4),(y*w+1)*4);
  f.width=w;f.dataURL='data:image/png;base64,'+png.encode(w,h,dst).toString('base64');
  const out=decode(f.dataURL);for(let y=0;y<h;y++){assert.deepEqual(out.data.slice((y*w+1)*4,(y*w+1+ow)*4),src.data.slice(y*ow*4,(y+1)*ow*4));assert(out.data.slice(y*w*4,y*w*4+4).every(v=>v===0));assert(out.data.slice((y*w+w-1)*4,(y*w+w)*4).every(v=>v===0));}count++;
 }
}
// Ensure only the intended sheets and their frame pixels changed.
const normalized=structuredClone(d);for(const si of [0,1])normalized.spriteSheets[si]=original.spriteSheets[si];for(let i=0;i<d.layers.length;i++)for(const key of Object.keys(d.layers[i].frameData||{}))if([0,1].includes(Number(key.split('_')[0])))normalized.layers[i].frameData[key]=original.layers[i].frameData[key];assert.deepEqual(normalized,original);
fs.writeFileSync(dir+'/candidate.json',JSON.stringify(d));
(async()=>{const url='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';const r=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':meta.etag},body:JSON.stringify(d)});const body=await r.text();console.log('PUT',r.status,body);assert(r.ok);const get=await fetch(url);const saved=await get.json();fs.writeFileSync(dir+'/readback.json',JSON.stringify(saved));assert.deepEqual(saved,d);fs.writeFileSync(dir+'/verification.json',JSON.stringify({changedLayerFrames:count,widthBefore:15,widthAfter:17,height:17,paddingEachSide:1,pixelsPreserved:true,otherDataUnchanged:true,readbackEqual:true,etag:get.headers.get('etag')},null,2));console.log('Verified',count,'layer frames; 15x17 -> 17x17');})().catch(e=>{console.error(e);process.exitCode=1});

