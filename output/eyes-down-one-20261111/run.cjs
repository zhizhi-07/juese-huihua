const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict');
const {decode,encode}=require('../../scripts/png.cjs');
const dir=__dirname,u='http://127.0.0.1:8765/api/project?id=base-outlined-1794365455561';
(async()=>{
 const r=await fetch(u),raw=await r.text(),etag=r.headers.get('etag');assert(r.ok&&etag);
 fs.writeFileSync(path.join(dir,'before.json'),raw);
 fs.writeFileSync(path.join(dir,'backup-info.json'),JSON.stringify({url:u,etag,sha256:crypto.createHash('sha256').update(raw).digest('hex')},null,2));
 const before=JSON.parse(raw),p=structuredClone(before),changes=[],skipped=[];
 for(let [i,l] of p.layers.entries())if(/眼睛|eyes?/i.test(l.name)&&!l.isGroup)for(let [key,cel]of Object.entries(l.frameData)){
  const [si,ai,fi]=key.split('_').map(Number);
  if(/idle|待机/i.test(p.spriteSheets[si].name)&&fi===0){skipped.push(key);continue;}
  const a=decode(Buffer.from(cel.dataURL.split(',')[1],'base64')),stride=a.width*4;
  assert(!a.data.slice((a.height-1)*stride).some((v,i)=>i%4===3&&v),'bottom edge would clip '+key);
  if(!a.data.some((v,i)=>i%4===3&&v))continue;
  const b=new Uint8Array(a.data.length);b.set(a.data.subarray(0,a.data.length-stride),stride);
  cel.dataURL='data:image/png;base64,'+encode(a.width,a.height,b).toString('base64');
  const check=decode(Buffer.from(cel.dataURL.split(',')[1],'base64'));assert.deepEqual(check.data,b);
  changes.push({layer:i,key});
 }
 assert(changes.length>0);assert.equal(skipped.length,3);
 fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify(p));
 const save=await fetch(u,{method:'PUT',headers:{'Content-Type':'application/json','X-Pixel-Editor':'1','If-Match':etag},body:JSON.stringify(p)});const output=await save.text();
 fs.writeFileSync(path.join(dir,'save-response.txt'),save.status+'\n'+output);assert(save.ok,output);
 const rr=await fetch(u),read=await rr.json();assert.deepEqual(read,p);fs.writeFileSync(path.join(dir,'after.json'),JSON.stringify(read));
 const restored=structuredClone(read);for(const c of changes)restored.layers[c.layer].frameData[c.key]=before.layers[c.layer].frameData[c.key];assert.deepEqual(restored,before);
 // Compare all eye cels locally, before on top and after below, at native pixels scaled 6x.
 const tiles=[];for(const l of before.layers)if(/眼睛|eyes?/i.test(l.name)&&!l.isGroup)for(const k of Object.keys(l.frameData)){const idx=before.layers.indexOf(l);tiles.push([decode(Buffer.from(l.frameData[k].dataURL.split(',')[1],'base64')),decode(Buffer.from(read.layers[idx].frameData[k].dataURL.split(',')[1],'base64'))]);}
 const scale=6,cellW=34*scale,cellH=66*scale,cols=12,w=cols*cellW,h=Math.ceil(tiles.length/cols)*cellH,img=new Uint8Array(w*h*4);for(let i=0;i<img.length;i+=4)img.set([184,200,195,255],i);
 tiles.forEach((pair,n)=>pair.forEach((a,row)=>{for(let y=0;y<a.height;y++)for(let x=0;x<a.width;x++)if(a.data[(y*a.width+x)*4+3])for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){let ox=n%cols*cellW+x*scale+dx,oy=Math.floor(n/cols)*cellH+row*33*scale+y*scale+dy;img.set(a.data.slice((y*a.width+x)*4,(y*a.width+x)*4+4),(oy*w+ox)*4);}}));
 fs.writeFileSync(path.join(dir,'eyes-before-after.png'),encode(w,h,img));
 const report={changedCels:changes.length,skippedFirstIdle:skipped,changes,verified:'API readback exactly equals candidate; restoring only listed eye cels exactly equals original; no clipping'};fs.writeFileSync(path.join(dir,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})().catch(e=>{console.error(e);process.exitCode=1});
