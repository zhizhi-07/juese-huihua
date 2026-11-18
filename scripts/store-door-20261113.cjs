const fs=require('fs'),path=require('path'),assert=require('assert'),crypto=require('crypto'),png=require('./png.cjs');
const {createCanvas,ImageData}=require('C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const dir=path.resolve('output/store-door-20261113');fs.mkdirSync(dir,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const decode=d=>png.decode(Buffer.from(d.split(',')[1],'base64'));
const dataURL=(w,h,d)=>'data:image/png;base64,'+png.encode(w,h,d).toString('base64');
(async()=>{const url='http://127.0.0.1:8765/api/project?id=scene-c81daf8c-650d-4be9-9c91-ab68b8ff8f5d';const r=await fetch(url);assert(r.ok);const raw=Buffer.from(await r.arrayBuffer()),etag=r.headers.get('etag');fs.writeFileSync(path.join(dir,'before.json'),raw);fs.writeFileSync(path.join(dir,'source.json'),JSON.stringify({url,etag,sha256:hash(raw)},null,2));const original=JSON.parse(raw),p=structuredClone(original);assert.equal(p.spriteSheets[0].actions.length,1);const door=p.layers.find(l=>l.name==='门');assert(door);const src=decode(door.frameData['0_0_0'].dataURL);const steps=[0,2,4,6,8,9],durations=[240,100,100,100,100,650];const ai=p.spriteSheets[0].actions.length;
p.spriteSheets[0].actions.push({name:'开门',direction:'none',frames:steps.map((_,i)=>({...structuredClone(p.spriteSheets[0].actions[0].frames[0]),duration:durations[i]}))});
const strip=Buffer.alloc(24*steps.length*22*4),full=[];
steps.forEach((step,fi)=>{const d=Buffer.from(src.data);if(step){for(let y=64;y<=79;y++)for(let x=41;x<=58;x++){let off=(y*160+x)*4;let sx=x<50?x+step:x-step;const panel=x<50?sx<=49:sx>=50;if(panel)Buffer.from(src.data).copy(d,off,(y*160+sx)*4,(y*160+sx)*4+4);else d.set(y===79?[70,74,88,255]:[48,53,72,255],off);}}
for(const l of p.layers){l.frameData[`0_${ai}_${fi}`]=structuredClone(l.frameData['0_0_0']);if(l===door)l.frameData[`0_${ai}_${fi}`].dataURL=dataURL(160,128,d);}
for(let y=0;y<128;y++)for(let x=0;x<160;x++){if(x>=41&&x<=58&&y>=64&&y<=79)continue;const k=(y*160+x)*4;assert(d.subarray(k,k+4).equals(Buffer.from(src.data).subarray(k,k+4)));}
for(let y=0;y<22;y++)d.copy(strip,(y*24*steps.length+fi*24)*4,((y+59)*160+38)*4,((y+59)*160+62)*4);
const c=createCanvas(160,128),ctx=c.getContext('2d');for(const l of p.layers.filter(l=>l.visible)){const im=decode(l.frameData[`0_${ai}_${fi}`].dataURL);const lc=createCanvas(im.width,im.height);lc.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.data),im.width,im.height),0,0);const pl=l.frameData[`0_${ai}_${fi}`].placement;ctx.drawImage(lc,pl?.x||0,pl?.y||0,pl?.w||160,pl?.h||128);}full.push(c);
});
for(let i=0;i<p.layers.length;i++){assert.deepEqual(p.layers[i].frameData['0_0_0'],original.layers[i].frameData['0_0_0']);assert.equal(Object.keys(p.layers[i].frameData).length,7);}assert.equal(p.layers.length,original.layers.length);
fs.writeFileSync(path.join(dir,'门-开门-6帧.png'),png.encode(144,22,strip));const preview=createCanvas(144*6,22*6),cx=preview.getContext('2d');cx.imageSmoothingEnabled=false;const sc=createCanvas(144,22);sc.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(strip),144,22),0,0);cx.drawImage(sc,0,0,864,132);fs.writeFileSync(path.join(dir,'门-预览.png'),preview.toBuffer('image/png'));
const scene=createCanvas(160*3*3,128*2*3),ct=scene.getContext('2d');ct.imageSmoothingEnabled=false;full.forEach((c,i)=>ct.drawImage(c,(i%3)*480,Math.floor(i/3)*384,480,384));fs.writeFileSync(path.join(dir,'场景-预览.png'),scene.toBuffer('image/png'));
fs.writeFileSync(path.join(dir,'candidate.json'),JSON.stringify(p));console.log(JSON.stringify({dir,etag,sha256:hash(raw),prepared:true}));
})().catch(e=>{console.error(e);process.exit(1)});


